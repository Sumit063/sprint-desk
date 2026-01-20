import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { jwtSecret } from "./config";
import { MembershipModel } from "./models/Membership";

let io: Server | null = null;

export const workspaceRoom = (workspaceId: string) => `workspace:${workspaceId}`;

export const initSocket = (server: HttpServer, corsOrigins: string[]) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as { sub?: string };
      if (!payload.sub) {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_workspace", async (workspaceId: string, ack?: (payload: any) => void) => {
      if (!workspaceId) {
        ack?.({ ok: false, message: "Workspace required" });
        return;
      }

      const membership = await MembershipModel.findOne({
        workspaceId,
        userId: socket.data.userId
      });

      if (!membership) {
        ack?.({ ok: false, message: "Forbidden" });
        return;
      }

      socket.join(workspaceRoom(workspaceId));
      ack?.({ ok: true });
    });
  });

  return io;
};

export const emitWorkspaceEvent = (
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
) => {
  if (!io) {
    return;
  }
  io.to(workspaceRoom(workspaceId)).emit(event, payload);
};
