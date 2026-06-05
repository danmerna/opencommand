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
import { registerNangoRoutes } from "../nangoIntegration";
import { startBriefingScheduler } from "../briefingScheduler";
import { startOnboardingReminderScheduler } from "../onboardingReminderScheduler";
import { unsubscribeUserByToken, seedChangelogIfEmpty } from "../db";
import { sdk } from "./sdk";
import { DEMO_OPEN_ID, DEMO_NAME } from "../demoUser";
import { getSessionCookieOptions } from "./cookies";
import { ONE_YEAR_MS } from "@shared/const";

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
  // Nango OAuth proxy routes (Salesforce etc.)
  registerNangoRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ─── Demo Login (admin-only shortcut to log in as demo user) ───────────────
  app.get("/api/demo-login", async (req, res) => {
    const secret = req.query.secret as string | undefined;
    // Require a simple shared secret to prevent public abuse
    if (!secret || secret !== ENV.cookieSecret.slice(0, 16)) {
      return res.status(403).send("Forbidden");
    }
    try {
      const sessionToken = await sdk.createSessionToken(DEMO_OPEN_ID, {
        name: DEMO_NAME,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("manus_session", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const returnTo = (req.query.returnTo as string) || "/";
      return res.redirect(returnTo);
    } catch (err: any) {
      console.error("[DemoLogin] Error:", err.message);
      return res.status(500).send("Demo login failed");
    }
  });

  // ─── Audio Upload for Voice Transcription ─────────────────────────────────
  app.post("/api/upload-audio", async (req, res) => {
    try {
      // Parse multipart form data manually using raw body
      const contentType = req.headers["content-type"] || "";
      if (!contentType.includes("multipart/form-data")) {
        return res.status(400).json({ error: "Expected multipart/form-data" });
      }

      // Use busboy to parse the multipart stream
      const { default: Busboy } = await import("busboy");
      const busboy = Busboy({ headers: req.headers, limits: { fileSize: 16 * 1024 * 1024 } });
      const chunks: Buffer[] = [];
      let mimeType = "audio/webm";
      let done = false;

      busboy.on("file", (_field, file, info) => {
        mimeType = info.mimeType || "audio/webm";
        file.on("data", (chunk: Buffer) => chunks.push(chunk));
        file.on("end", () => { done = true; });
      });

      await new Promise<void>((resolve, reject) => {
        busboy.on("finish", resolve);
        busboy.on("error", reject);
        req.pipe(busboy);
      });

      if (!done || chunks.length === 0) {
        return res.status(400).json({ error: "No audio file received" });
      }

      const buffer = Buffer.concat(chunks);
      const { storagePut } = await import("../storage");
      const key = `voice-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
      const { url } = await storagePut(key, buffer, mimeType);
      return res.json({ url });
    } catch (err: any) {
      console.error("[AudioUpload] Error:", err.message);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  // ─── Email Unsubscribe (one-click, no auth required) ────────────────────────
  app.get("/api/unsubscribe", async (req, res) => {
    const token = req.query.token as string | undefined;
    if (!token) {
      return res.status(400).send("<html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#e5e5e5'><h2>Invalid unsubscribe link</h2><p>The link you followed is missing a token. Please use the link from your email.</p></body></html>");
    }
    const success = await unsubscribeUserByToken(token);
    if (success) {
      return res.send("<html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#e5e5e5'><h2 style='color:#fff'>You\'ve been unsubscribed</h2><p style='color:#aaa'>You will no longer receive OpenCommand strategy briefing emails.<br/>You can re-enable email briefings at any time from Mission Control.</p><p style='margin-top:32px'><a href='https://opencommand.co/mission-control' style='color:#888;text-decoration:underline;font-size:13px'>Go to Mission Control</a></p></body></html>");
    } else {
      return res.status(404).send("<html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#e5e5e5'><h2>Link not found</h2><p>This unsubscribe link may have already been used or is invalid.</p></body></html>");
    }
  });

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
    // Start scheduled briefing delivery
    startBriefingScheduler();
    startOnboardingReminderScheduler();
    // Seed changelog entries if the table is empty
    seedChangelogIfEmpty().catch(err => console.error("[Changelog] Seed error:", err));
  });
}

startServer().catch(console.error);
