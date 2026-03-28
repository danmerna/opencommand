import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { emails } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

const linqRouter = Router();

/**
 * Verify Linq webhook signature
 */
function verifyLinqSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return hash === signature;
}

/**
 * Parse email content and extract key fields
 */
function parseEmailContent(emailData: any) {
  return {
    from: emailData.from || emailData.sender || "unknown@example.com",
    to: emailData.to || emailData.recipient || "bot@opencommand.co",
    subject: emailData.subject || "(No Subject)",
    body: emailData.body || emailData.text || "",
    htmlBody: emailData.html || null,
    timestamp: emailData.timestamp || new Date().toISOString(),
    messageId: emailData.messageId || emailData.id || crypto.randomUUID(),
    threadId: emailData.threadId || null,
    attachments: emailData.attachments || [],
  };
}

/**
 * POST /api/webhooks/linq/incoming-email
 * Receive incoming emails from Linq
 */
linqRouter.post("/incoming-email", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-linq-signature"] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const secret = process.env.LINQ_WEBHOOK_SECRET || "";
    if (!verifyLinqSignature(payload, signature, secret)) {
      console.error("[Linq Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const emailData = req.body;
    console.log("[Linq Webhook] Received email from:", emailData.from);

    // Parse email content
    const parsed = parseEmailContent(emailData);

    // Store email in database
    const result = await db
      .insert(emails)
      .values({
        messageId: parsed.messageId,
        threadId: parsed.threadId,
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        body: parsed.body,
        htmlBody: parsed.htmlBody,
        attachments: JSON.stringify(parsed.attachments),
        timestamp: new Date(parsed.timestamp),
        status: "received",
        metadata: JSON.stringify({
          source: "linq",
          linqId: emailData.id,
        }),
      })
      .returning({ id: emails.id });

    const emailId = result[0]?.id;
    console.log("[Linq Webhook] Stored email with ID:", emailId);

    // Trigger email processing (async, don't wait)
    processEmailAsync(emailId, parsed).catch((err) => {
      console.error("[Email Processing] Error:", err);
    });

    // Return success immediately
    return res.json({
      success: true,
      emailId,
      message: "Email received and queued for processing",
    });
  } catch (error) {
    console.error("[Linq Webhook] Error:", error);
    return res.status(500).json({
      error: "Failed to process email",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Process email asynchronously
 * - Extract intent/action from email
 * - Route to appropriate agent
 * - Generate response if needed
 */
async function processEmailAsync(emailId: number, parsed: any) {
  try {
    console.log("[Email Processing] Starting for email:", emailId);

    // Use LLM to extract intent and suggested action
    const intentResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an email processing assistant for OpenCommand. 
          Extract the sender's intent and suggest an action.
          Respond with JSON: { intent: string, action: string, priority: "high"|"medium"|"low" }`,
        },
        {
          role: "user",
          content: `Email from ${parsed.from}:\nSubject: ${parsed.subject}\n\nBody:\n${parsed.body}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_intent",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                description: "The sender's intent or request",
              },
              action: {
                type: "string",
                description: "Suggested action for OpenCommand to take",
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Priority level",
              },
            },
            required: ["intent", "action", "priority"],
            additionalProperties: false,
          },
        },
      },
    });

    const intentData = JSON.parse(
      intentResponse.choices[0]?.message?.content || "{}"
    );
    console.log("[Email Processing] Extracted intent:", intentData);

    // Update email with processing results
    await db
      .update(emails)
      .set({
        status: "processed",
        metadata: JSON.stringify({
          source: "linq",
          intent: intentData.intent,
          action: intentData.action,
          priority: intentData.priority,
          processedAt: new Date().toISOString(),
        }),
      })
      .where({ id: emailId });

    console.log("[Email Processing] Completed for email:", emailId);
  } catch (error) {
    console.error("[Email Processing] Error processing email:", error);

    // Mark as failed
    await db
      .update(emails)
      .set({
        status: "failed",
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      })
      .where({ id: emailId })
      .catch(() => {
        /* ignore */
      });
  }
}

export default linqRouter;
