import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../auth/tokens";
import { OrganizationMember } from "../modules/organizations/organizationMember.model";
import { logger } from "../config/logger";

let io: SocketIOServer | null = null;

export function initRealtime(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.accessToken as string | undefined;
      if (!token) return next(new Error("Missing access token"));

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid access token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join-organization", async (organizationId: string) => {
      // Never trust the requested organizationId blindly - verify active membership first.
      const membership = await OrganizationMember.findOne({
        organizationId,
        userId: socket.data.userId,
        status: "ACTIVE",
      }).lean();

      if (!membership) {
        socket.emit("error", { message: "Not a member of this organization" });
        return;
      }

      socket.join(`org:${organizationId}`);
      socket.emit("joined-organization", { organizationId });
    });

    socket.on("disconnect", () => {
      logger.debug("Socket disconnected", { userId: socket.data.userId });
    });
  });

  return io;
}

/** Broadcasts a realtime event to every connected dashboard client for an organization. */
export function emitToOrganization(organizationId: string, event: string, payload: unknown) {
  if (!io) {
    logger.warn("emitToOrganization called before realtime server was initialized");
    return;
  }
  io.to(`org:${organizationId}`).emit(event, payload);
}
