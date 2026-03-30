import { Router, Request, Response } from "express";
import { getWebSocketServer } from "../websocket";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Resend Webhook Route Handler
 * Processes email events from Resend and broadcasts updates via WebSocket
 */

const router = Router();

// Resend webhook signature verification
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string;
    created_at: string;
    error?: {
      code: string;
      message: string;
    };
  };
}

/**
 * Verify Resend webhook signature
 */
function verifyResendSignature(req: Request): boolean {
  const signature = req.headers["x-resend-signature"] as string;
  if (!signature) return false;

  // In production, verify the signature using Resend's public key
  // For now, we'll accept all webhooks in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // TODO: Implement proper signature verification
  return true;
}

/**
 * POST /api/webhooks/resend
 * Handle Resend email events
 */
router.post("/resend", async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    if (!verifyResendSignature(req)) {
      console.warn("[Resend Webhook] Invalid signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const event: ResendWebhookEvent = req.body;
    console.log(`[Resend Webhook] Received event: ${event.type}`);

    const db = await getDb();
    if (!db) {
      console.error("[Resend Webhook] Database not initialized");
      return res.status(500).json({ error: "Database error" });
    }

    const wsServer = getWebSocketServer();
    const emailId = event.data.email_id;
    const companyId = 30001; // Default company ID

    // Handle different event types
    switch (event.type) {
      case "email.sent":
        console.log(`[Resend Webhook] Email sent: ${emailId}`);
        // TODO: Update email status in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "sent",
          {
            sentAt: event.created_at,
            from: event.data.from,
            to: event.data.to,
          },
          companyId
        );
        break;

      case "email.delivered":
        console.log(`[Resend Webhook] Email delivered: ${emailId}`);
        // TODO: Update email status in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "delivered",
          {
            deliveredAt: event.created_at,
          },
          companyId
        );
        break;

      case "email.opened":
        console.log(`[Resend Webhook] Email opened: ${emailId}`);
        // TODO: Increment open count in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "opened",
          {
            openedAt: event.created_at,
          },
          companyId
        );

        // Update dashboard metrics
        wsServer?.broadcastDashboardUpdate(companyId, {
          event: "email.opened",
          emailId,
          timestamp: event.created_at,
        });
        break;

      case "email.clicked":
        console.log(`[Resend Webhook] Email clicked: ${emailId}`);
        // TODO: Increment click count in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "clicked",
          {
            clickedAt: event.created_at,
          },
          companyId
        );

        // Update dashboard metrics
        wsServer?.broadcastDashboardUpdate(companyId, {
          event: "email.clicked",
          emailId,
          timestamp: event.created_at,
        });
        break;

      case "email.bounced":
        console.log(`[Resend Webhook] Email bounced: ${emailId}`);
        // TODO: Mark email as bounced in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "bounced",
          {
            bouncedAt: event.created_at,
            error: event.data.error,
          },
          companyId
        );

        // Update dashboard metrics
        wsServer?.broadcastDashboardUpdate(companyId, {
          event: "email.bounced",
          emailId,
          reason: event.data.error?.message,
          timestamp: event.created_at,
        });
        break;

      case "email.complained":
        console.log(`[Resend Webhook] Email complained: ${emailId}`);
        // TODO: Mark email as complained in database
        wsServer?.broadcastEmailUpdate(
          parseInt(emailId),
          "complained",
          {
            complaintAt: event.created_at,
          },
          companyId
        );

        // Update dashboard metrics
        wsServer?.broadcastDashboardUpdate(companyId, {
          event: "email.complained",
          emailId,
          timestamp: event.created_at,
        });
        break;

      default:
        console.warn(`[Resend Webhook] Unknown event type: ${event.type}`);
    }

    // Return success response
    res.json({ success: true, event: event.type });
  } catch (error) {
    console.error("[Resend Webhook] Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
