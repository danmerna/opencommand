import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

/**
 * WebSocket Server for Real-Time Email Tracking Updates
 * Broadcasts email tracking events to connected clients
 */

interface WebSocketClient {
  ws: WebSocket;
  userId: number;
  companyId: number;
  subscriptions: Set<string>; // email IDs or action item IDs
}

class EmailTrackingWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private clientCounter = 0;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/api/ws/tracking" });
    this.setupHandlers();
    console.log("[WebSocket] Email tracking server initialized");
  }

  private setupHandlers() {
    this.wss.on("connection", (ws: WebSocket, req: any) => {
      const clientId = `client_${++this.clientCounter}`;
      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Parse auth from URL query params or headers
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const userId = parseInt(url.searchParams.get("userId") || "0");
      const companyId = parseInt(url.searchParams.get("companyId") || "0");

      if (!userId || !companyId) {
        console.warn(`[WebSocket] Invalid auth for ${clientId}`);
        ws.close(1008, "Invalid credentials");
        return;
      }

      const client: WebSocketClient = {
        ws,
        userId,
        companyId,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);

      ws.on("message", (data) => this.handleMessage(clientId, data));
      ws.on("close", () => this.handleClose(clientId));
      ws.on("error", (error: any) => console.error(`[WebSocket] Error for ${clientId}:`, (error as Error).message));

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: "connected",
          clientId,
          timestamp: new Date().toISOString(),
        })
      );
    });
  }

  private handleMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "subscribe":
          // Subscribe to email tracking updates
          if (message.emailId) {
            client.subscriptions.add(`email_${message.emailId}`);
            console.log(`[WebSocket] ${clientId} subscribed to email ${message.emailId}`);
          }
          if (message.actionItemId) {
            client.subscriptions.add(`action_${message.actionItemId}`);
            console.log(`[WebSocket] ${clientId} subscribed to action ${message.actionItemId}`);
          }
          break;

        case "unsubscribe":
          if (message.emailId) {
            client.subscriptions.delete(`email_${message.emailId}`);
          }
          if (message.actionItemId) {
            client.subscriptions.delete(`action_${message.actionItemId}`);
          }
          break;

        case "ping":
          client.ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          break;

        default:
          console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error);
    }
  }

  private handleClose(clientId: string) {
    this.clients.delete(clientId);
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
  }

  /**
   * Broadcast email tracking update to subscribed clients
   */
  public broadcastEmailUpdate(
    emailId: number,
    event: string,
    data: Record<string, any>,
    companyId: number
  ) {
    const subscriptionKey = `email_${emailId}`;
    const timestamp = new Date().toISOString();

    let count = 0;
    this.clients.forEach((client, clientId) => {
      if (client.companyId === companyId && client.subscriptions.has(subscriptionKey)) {
        try {
          client.ws.send(
            JSON.stringify({
              type: "email_update",
              emailId,
              event,
              data,
              timestamp,
            })
          );
          count++;
        } catch (error) {
          console.error(`[WebSocket] Failed to send to ${clientId}:`, error);
        }
      }
    });

    if (count > 0) {
      console.log(`[WebSocket] Broadcasted ${event} for email ${emailId} to ${count} clients`);
    }
  }

  /**
   * Broadcast action item update to subscribed clients
   */
  public broadcastActionUpdate(
    actionItemId: number,
    event: string,
    data: Record<string, any>,
    companyId: number
  ) {
    const subscriptionKey = `action_${actionItemId}`;
    const timestamp = new Date().toISOString();

    let count = 0;
    this.clients.forEach((client, clientId) => {
      if (client.companyId === companyId && client.subscriptions.has(subscriptionKey)) {
        try {
          client.ws.send(
            JSON.stringify({
              type: "action_update",
              actionItemId,
              event,
              data,
              timestamp,
            })
          );
          count++;
        } catch (error) {
          console.error(`[WebSocket] Failed to send to ${clientId}:`, error);
        }
      }
    });

    if (count > 0) {
      console.log(`[WebSocket] Broadcasted ${event} for action ${actionItemId} to ${count} clients`);
    }
  }

  /**
   * Broadcast dashboard metrics update to all clients in a company
   */
  public broadcastDashboardUpdate(companyId: number, metrics: Record<string, any>) {
    const timestamp = new Date().toISOString();
    let count = 0;

    this.clients.forEach((client, clientId) => {
      if (client.companyId === companyId) {
        try {
          client.ws.send(
            JSON.stringify({
              type: "dashboard_update",
              metrics,
              timestamp,
            })
          );
          count++;
        } catch (error) {
          console.error(`[WebSocket] Failed to send to ${clientId}:`, error);
        }
      }
    });

    if (count > 0) {
      console.log(`[WebSocket] Broadcasted dashboard update to ${count} clients in company ${companyId}`);
    }
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public getClientCount(companyId: number): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.companyId === companyId) count++;
    });
    return count;
  }
}

let wsServer: EmailTrackingWebSocketServer | null = null;

export function initializeWebSocketServer(server: Server): EmailTrackingWebSocketServer {
  if (!wsServer) {
    wsServer = new EmailTrackingWebSocketServer(server);
  }
  return wsServer;
}

export function getWebSocketServer(): EmailTrackingWebSocketServer | null {
  return wsServer;
}
