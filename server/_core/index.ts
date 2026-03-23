import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { Server as SocketIOServer } from "socket.io";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import Stripe from "stripe";
import { handleWebhookEvent } from "../stripe/checkout";
import { registerIntegrationOAuthRoutes } from "../integrationOAuth";

// Global Socket.IO instance for emitting events from routers
export let io: SocketIOServer;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Socket.IO ────────────────────────────────────────────────────────────
  io = new SocketIOServer(server, {
    path: "/api/ws",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[WS] Socket ${socket.id} joined room user:${userId}`);
    });
    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // ─── Stripe Webhook (raw body BEFORE json parser) ─────────────────────────
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    try {
      const stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-02-25.clover" as any });
      const event = stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret);
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }
      await handleWebhookEvent(event);
      res.json({ received: true });
    } catch (err: any) {
      console.error(`[Webhook] Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Integration Hub OAuth routes
  registerIntegrationOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
