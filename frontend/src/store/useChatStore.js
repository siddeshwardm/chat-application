import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (value._id) {
      if (typeof value._id === "string") return value._id;
      if (typeof value._id === "object" && typeof value._id.$oid === "string") return value._id.$oid;
    }
    if (typeof value.id === "string") return value.id;
    if (typeof value.toHexString === "function") return value.toHexString();
    if (typeof value._id === "string") return value._id;
    if (typeof value.toString === "function") return value.toString();
  }
  return String(value);
};

const sortByCreatedAtAsc = (items) =>
  [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const authUserId = useAuthStore.getState().authUser?._id;
      const filtered = authUserId
        ? res.data.filter((u) => normalizeId(u?._id) !== normalizeId(authUserId))
        : res.data;
      set({ users: filtered });
    } catch (error) {
      if (error?.response?.status === 401) {
        await useAuthStore.getState().logout();
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || "Failed to load users");
      }
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      if (error?.response?.status === 401) {
        await useAuthStore.getState().logout();
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || "Failed to load messages");
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: sortByCreatedAtAsc([...messages, res.data]) });
    } catch (error) {
      if (error?.response?.status === 401) {
        await useAuthStore.getState().logout();
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || "Failed to send message");
      }
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const currentSelected = get().selectedUser;
      const myId = normalizeId(useAuthStore.getState().authUser?._id);
      const selectedId = normalizeId(currentSelected?._id);

      const senderId = normalizeId(newMessage.senderId);
      const receiverId = normalizeId(newMessage.receiverId);

      const isInOpenConversation =
        (senderId === selectedId && receiverId === myId) || (senderId === myId && receiverId === selectedId);

      if (isInOpenConversation) {
        // Message is for the open chat: append and clear unread badge
        set({
          messages: sortByCreatedAtAsc([...get().messages, newMessage]),
          users: get().users.map((u) =>
            normalizeId(u._id) === senderId ? { ...u, unreadCount: 0 } : u
          ),
        });
        return;
      }

      // Message from another user: increment unread badge in sidebar
      set({
        users: get().users.map((u) =>
          normalizeId(u._id) === senderId
            ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
            : u
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) =>
    set((state) => {
      const authUserId = useAuthStore.getState().authUser?._id;
      // Never allow selecting yourself as a chat contact
      if (authUserId && normalizeId(selectedUser?._id) === normalizeId(authUserId)) {
        return state;
      }

      return {
        selectedUser,
        users: state.users.map((u) =>
          normalizeId(u._id) === normalizeId(selectedUser?._id) ? { ...u, unreadCount: 0 } : u
        ),
      };
    }),
}));
