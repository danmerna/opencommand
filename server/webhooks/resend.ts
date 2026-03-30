import { getDb } from "../db";
import { emails } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Resend Email Tracking Webhook Handler
 * Processes email events: sent, delivered, opened, clicked, bounced, complained
 */

export interface ResendWebhookEvent {
  type: "email.sent" | "email.delivered" | "email.opened" | "email.clicked" | "email.bounced" | "email.complained";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string;
    subject: string;
    timestamp?: string;
    user_agent?: string;
    ip_address?: string;
    link?: string;
  };
}

export interface EmailTrackingData {
  sent: boolean;
  sentAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  opened: boolean;
  openedAt?: Date;
  openCount: number;
  clicked: boolean;
  clickedAt?: Date;
  clickCount: number;
  bounced: boolean;
  bouncedAt?: Date;
  complained: boolean;
  complaintAt?: Date;
  lastEvent?: string;
  lastEventAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Process Resend webhook event
 */
export async function processResendWebhook(event: ResendWebhookEvent): Promise<void> {
  console.log(`[Resend Webhook] Processing ${event.type} for ${event.data.email_id}`);

  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Find email by messageId
  const emailRecords = await db
    .select()
    .from(emails)
    .where((t) => eq(t.messageId, event.data.email_id));

  if (!emailRecords || emailRecords.length === 0) {
    console.warn(`[Resend Webhook] Email ${event.data.email_id} not found in database`);
    return;
  }

  const email = emailRecords[0];
  const metadata = email.metadataJson ? JSON.parse(email.metadataJson as string) : {};
  const trackingData: EmailTrackingData = metadata.tracking
    ? metadata.tracking
    : {
        sent: false,
        delivered: false,
        opened: false,
        openCount: 0,
        clicked: false,
        clickCount: 0,
        bounced: false,
        complained: false,
      };

  // Update tracking data based on event type
  const eventTime = new Date(event.created_at);

  switch (event.type) {
    case "email.sent":
      trackingData.sent = true;
      trackingData.sentAt = eventTime;
      trackingData.lastEvent = "sent";
      trackingData.lastEventAt = eventTime;
      break;

    case "email.delivered":
      trackingData.delivered = true;
      trackingData.deliveredAt = eventTime;
      trackingData.lastEvent = "delivered";
      trackingData.lastEventAt = eventTime;
      break;

    case "email.opened":
      trackingData.opened = true;
      trackingData.openedAt = eventTime;
      trackingData.openCount = (trackingData.openCount || 0) + 1;
      trackingData.lastEvent = "opened";
      trackingData.lastEventAt = eventTime;
      if (event.data.user_agent) trackingData.userAgent = event.data.user_agent;
      if (event.data.ip_address) trackingData.ipAddress = event.data.ip_address;
      break;

    case "email.clicked":
      trackingData.clicked = true;
      trackingData.clickedAt = eventTime;
      trackingData.clickCount = (trackingData.clickCount || 0) + 1;
      trackingData.lastEvent = "clicked";
      trackingData.lastEventAt = eventTime;
      // Link tracking stored in metadata separately if needed
      if (event.data.link) {
        // TODO: Store link click details
      }
      break;

    case "email.bounced":
      trackingData.bounced = true;
      trackingData.bouncedAt = eventTime;
      trackingData.lastEvent = "bounced";
      trackingData.lastEventAt = eventTime;
      break;

    case "email.complained":
      trackingData.complained = true;
      trackingData.complaintAt = eventTime;
      trackingData.lastEvent = "complained";
      trackingData.lastEventAt = eventTime;
      break;
  }

  // Update email record with tracking in metadata
  const updatedMetadata = {
    ...metadata,
    tracking: trackingData,
  };

  await db
    .update(emails)
    .set({
      metadataJson: JSON.stringify(updatedMetadata),
      updatedAt: new Date(),
    })
    .where(eq(emails.id, email.id));

  console.log(`[Resend Webhook] Updated email ${event.data.email_id} with ${event.type}`);

  // TODO: Trigger real-time dashboard update via WebSocket or Server-Sent Events
  // TODO: Update action item status if all tracking complete
}

/**
 * Calculate email metrics from tracking data
 */
export function calculateEmailMetrics(trackingData: EmailTrackingData): {
  status: "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained";
  openRate: number;
  clickRate: number;
  isEngaged: boolean;
} {
  if (trackingData.complained) {
    return { status: "complained", openRate: 0, clickRate: 0, isEngaged: false };
  }

  if (trackingData.bounced) {
    return { status: "bounced", openRate: 0, clickRate: 0, isEngaged: false };
  }

  if (trackingData.clicked) {
    return {
      status: "clicked",
      openRate: trackingData.opened ? 100 : 0,
      clickRate: 100,
      isEngaged: true,
    };
  }

  if (trackingData.opened) {
    return { status: "opened", openRate: 100, clickRate: 0, isEngaged: true };
  }

  if (trackingData.delivered) {
    return { status: "delivered", openRate: 0, clickRate: 0, isEngaged: false };
  }

  if (trackingData.sent) {
    return { status: "sent", openRate: 0, clickRate: 0, isEngaged: false };
  }

  return { status: "pending", openRate: 0, clickRate: 0, isEngaged: false };
}

/**
 * Format tracking data for display
 */
export function formatTrackingForDisplay(trackingData: EmailTrackingData): {
  timeline: Array<{ event: string; time: Date }>;
  summary: string;
  engagement: "high" | "medium" | "low" | "none";
} {
  const timeline: Array<{ event: string; time: Date }> = [];

  if (trackingData.sentAt) timeline.push({ event: "📤 Sent", time: trackingData.sentAt });
  if (trackingData.deliveredAt) timeline.push({ event: "✅ Delivered", time: trackingData.deliveredAt });
  if (trackingData.openedAt)
    timeline.push({
      event: `👁️ Opened (${trackingData.openCount}x)`,
      time: trackingData.openedAt,
    });
  if (trackingData.clickedAt)
    timeline.push({
      event: `🔗 Clicked (${trackingData.clickCount}x)`,
      time: trackingData.clickedAt,
    });
  if (trackingData.bouncedAt) timeline.push({ event: "❌ Bounced", time: trackingData.bouncedAt });
  if (trackingData.complaintAt) timeline.push({ event: "⚠️ Complained", time: trackingData.complaintAt });

  // Sort by time
  timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Determine engagement level
  let engagement: "high" | "medium" | "low" | "none" = "none";
  if (trackingData.clicked) engagement = "high";
  else if (trackingData.opened) engagement = "medium";
  else if (trackingData.delivered) engagement = "low";

  // Build summary
  let summary = "Email ";
  if (trackingData.complained) summary += "received complaint";
  else if (trackingData.bounced) summary += "bounced";
  else if (trackingData.clicked) summary += `clicked ${trackingData.clickCount}x`;
  else if (trackingData.opened) summary += `opened ${trackingData.openCount}x`;
  else if (trackingData.delivered) summary += "delivered";
  else if (trackingData.sent) summary += "sent";
  else summary += "pending";

  return { timeline, summary, engagement };
}
