import "../config/env.js";

import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

function getFlagValue(flagName) {
  const argv = process.argv.slice(2);

  const exactIndex = argv.findIndex((a) => a === flagName);
  if (exactIndex !== -1) return argv[exactIndex + 1];

  const withEquals = argv.find((a) => a.startsWith(`${flagName}=`));
  if (withEquals) return withEquals.split("=").slice(1).join("=");

  return undefined;
}

function hasFlag(flagName) {
  return process.argv.slice(2).includes(flagName);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const keepEmail = getFlagValue("--keepEmail");
  const keepId = getFlagValue("--keepId");
  const demoOnly = hasFlag("--demo");

  await connectDB();

  let usersToDelete = [];

  if (keepEmail || keepId) {
    const keepUser = await User.findOne(
      keepId ? { _id: keepId } : { email: keepEmail }
    ).select("_id email fullName");

    if (!keepUser) {
      throw new Error(
        `Keep user not found (${keepId ? `id=${keepId}` : `email=${keepEmail}`})`
      );
    }

    usersToDelete = await User.find({ _id: { $ne: keepUser._id } }).select(
      "_id email fullName"
    );

    const deleteIds = usersToDelete.map((u) => u._id);

    if (deleteIds.length) {
      await Message.deleteMany({
        $or: [{ senderId: { $in: deleteIds } }, { receiverId: { $in: deleteIds } }],
      });

      await User.deleteMany({ _id: { $in: deleteIds } });
    }

    console.log(
      `Kept 1 user: ${keepUser.email}. Deleted ${usersToDelete.length} users.`
    );

    return;
  }

  // Default: delete known demo/dummy users only (safe).
  const demoEmailRegex = /^demo\d+_\d+@test\.com$/i;
  const seedEmailRegex = /@example\.com$/i;

  usersToDelete = await User.find({
    $or: [{ email: demoEmailRegex }, { email: seedEmailRegex }],
  }).select("_id email fullName");

  const deleteIds = usersToDelete.map((u) => u._id);

  if (deleteIds.length) {
    await Message.deleteMany({
      $or: [{ senderId: { $in: deleteIds } }, { receiverId: { $in: deleteIds } }],
    });

    await User.deleteMany({ _id: { $in: deleteIds } });
  }

  console.log(
    `${demoOnly ? "" : "(default) "}Deleted ${usersToDelete.length} demo/dummy users.`
  );
}

main()
  .catch((err) => {
    console.error("cleanupUsers failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });
