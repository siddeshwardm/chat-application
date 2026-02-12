import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const DEFAULT_SOCKET_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

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
    if (typeof value.toString === "function") return value.toString();
  }
  return String(value);
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);

      // If token is invalid/expired (common after JWT_SECRET changes), clear cookie.
      if (error?.response?.status === 401) {
        try {
          await axiosInstance.post("/auth/logout");
        } catch {
          // ignore
        }
      }

      set({ authUser: null });
      get().disconnectSocket();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to sign up");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to log in");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to log out");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    const existingSocket = get().socket;
    if (existingSocket) {
      if (!existingSocket.connected) existingSocket.connect();
      return;
    }

    const socket = io(BASE_URL, {
      withCredentials: true,
      auth: {
        // optional: backend will prefer JWT cookie if present
        userId: authUser._id,
      },
      // keep query for backwards compatibility with older servers
      query: { userId: authUser._id },
    });

    set({ socket });

    socket.on("auth:me", async (serverUserId) => {
      const localId = normalizeId(get().authUser?._id);
      const serverId = normalizeId(serverUserId);

      // If you're testing multiple users in the same browser, cookies may change.
      // Resync the client auth state to match the cookie-based session.
      if (serverId && localId && serverId !== localId) {
        await get().checkAuth();
      }
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("disconnect", () => {
      set({ onlineUsers: [] });
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connect_error:", err?.message || err);
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
