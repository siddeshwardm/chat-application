import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user?._id;

    // Defensive: protectRoute should always populate req.user
    if (!loggedInUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    // Extra safety: ensure we never send back the logged-in user
    const filteredUsers = users.filter((u) => String(u._id) !== String(loggedInUserId));

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: loggedInUserId,
          seen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadCountBySenderId = unreadCounts.reduce((acc, cur) => {
      acc[String(cur._id)] = cur.count;
      return acc;
    }, {});

    const usersWithUnreadCounts = filteredUsers.map((u) => ({
      ...u.toObject(),
      unreadCount: unreadCountBySenderId[String(u._id)] || 0,
    }));

    res.status(200).json(usersWithUnreadCounts);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Mark messages from this user as seen when opening the conversation
    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, seen: false },
      { $set: { seen: true } }
    );

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
          message:
            "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
        });
      }

      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image, { resource_type: "image" });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      seen: false,
    });

    await newMessage.save();

    const receiverSocketIds = getReceiverSocketIds(receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ message: "Image is too large" });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};
