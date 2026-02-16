import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);

const defaultCorsOrigins = ["http://localhost:5173", "http://localhost:5174"];
const corsOriginsFromEnv = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigins = corsOriginsFromEnv.length > 0 ? corsOriginsFromEnv : defaultCorsOrigins;

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

export function getReceiverSocketId(userId) {
  const sockets = userSocketMap[userId];
  if (!sockets) return undefined;
  // Return the first socket id for that user
  return sockets.values().next().value;
}

export function getReceiverSocketIds(userId) {
  const sockets = userSocketMap[userId];
  if (!sockets) return [];
  return Array.from(sockets);
}

// used to store online users
const userSocketMap = {}; // { [userId]: Set<socketId> }

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawVal] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawVal.join("="));
  }
  return cookies;
}

function getUserIdFromSocket(socket) {
  return socket.userId || socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
}

io.use((socket, next) => {
  try {
    // Prefer JWT from cookie (httpOnly) if present.
    const cookies = parseCookies(socket.handshake?.headers?.cookie);
    const token = cookies.jwt;

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded?.userId;
    }

    // Fall back to client-provided userId for dev/testing.
    if (!socket.userId) {
      socket.userId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
    }

    if (!socket.userId) {
      return next(new Error("Unauthorized"));
    }

    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = getUserIdFromSocket(socket);
  if (userId) {
    if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
    userSocketMap[userId].add(socket.id);
  }

  // Tell this client who the server thinks they are (based on JWT cookie)
  socket.emit("auth:me", userId);

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    if (userId && userSocketMap[userId]) {
      userSocketMap[userId].delete(socket.id);
      if (userSocketMap[userId].size === 0) {
        delete userSocketMap[userId];
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
