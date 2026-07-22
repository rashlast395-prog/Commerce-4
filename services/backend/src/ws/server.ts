import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../config/logger.js";

export type WsEventType =
  | "order:status_changed"
  | "rider:location_updated"
  | "notification:new"
  | "message:new";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
}

const clients = new Set<ConnectedClient>();

export function createWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (socket, req) => {
    // Phase 1 will replace this with real Firebase ID token verification
    // passed as a query param or first message, then attach the real uid.
    const url = new URL(req.url ?? "", "http://localhost");
    const userId = url.searchParams.get("uid") ?? "anonymous";

    const client: ConnectedClient = { socket, userId };
    clients.add(client);
    logger.info("WebSocket client connected", { userId, totalClients: clients.size });

    socket.on("close", () => {
      clients.delete(client);
      logger.info("WebSocket client disconnected", { userId, totalClients: clients.size });
    });

    socket.on("error", (err) => {
      logger.warn("WebSocket client error", { userId, error: err.message });
    });
  });

  return wss;
}

/** Broadcast an event to every connected client (Phase 1+ will scope this to relevant userIds). */
export function broadcast(event: WsEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(data);
    }
  }
}

/** Send an event only to specific user IDs (e.g. customer + restaurant owner + rider on an order). */
export function sendToUsers(userIds: string[], event: WsEvent): void {
  const data = JSON.stringify(event);
  const targets = new Set(userIds);
  for (const client of clients) {
    if (targets.has(client.userId) && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(data);
    }
  }
}
