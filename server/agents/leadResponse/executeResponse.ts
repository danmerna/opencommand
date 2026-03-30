import { getDb } from "../../db";
import { actionItems, tasks } from "../../../drizzle/schema";
import { send_sig_email } from "../../services/email";
import { eq } from "drizzle-orm";

/**
 * Lead response execution
 * Sends approved responses and tracks delivery
 */

export interface ExecuteResponseOptions {
  actionItemId: number;
  dealerSlug: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  htmlBody: string;
  quoteLink?: string;
  replyTo?: string;
}

/**
 * Execute (send) an approved lead response
 */
export async function executeLeadResponse(options: ExecuteResponseOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  try {
    console.log(`[Lead Response] Executing response for action ${options.actionItemId}`);

    // Build email body with quote link if available
    let emailBody = options.htmlBody;
    if (options.quoteLink) {
      emailBody = emailBody.replace(
        "</body>",
        `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
          <p style="margin: 0 0 12px 0;">
            <a href="${options.quoteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Interactive Quote
            </a>
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            Click the button above to view your personalized quote and financing options.
          </p>
        </div>
        </body>`
      );
    }

    // Send email via Resend
    const result = await send_sig_email({
      dealerSlug: options.dealerSlug,
      to: options.recipientEmail,
      subject: options.subject,
      html: emailBody,
      text: options.body,
      replyTo: options.replyTo,
    });

    if (!result.messageId) {
      throw new Error("Email send returned no message ID");
    }

    // Update action item status
    await db
      .update(actionItems)
      .set({
        status: "executed",
        executedAt: new Date(),
      })
      .where(eq(actionItems.id, options.actionItemId));

    console.log(`[Lead Response] Sent response to ${options.recipientEmail}, message ID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("[Lead Response] Execution failed:", error);

    // Mark as failed
    await db
      .update(actionItems)
      .set({
        status: "failed",
      })
      .where(eq(actionItems.id, options.actionItemId))
      .catch(() => {
        /* ignore */
      });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute multiple lead responses (batch send)
 */
export async function executeLeadResponsesBatch(
  responses: ExecuteResponseOptions[]
): Promise<Array<{ actionItemId: number; success: boolean; messageId?: string; error?: string }>> {
  const results = [];

  for (const response of responses) {
    const result = await executeLeadResponse(response);
    results.push({
      actionItemId: response.actionItemId,
      ...result,
    });
  }

  return results;
}

/**
 * Get execution history for a dealer
 */
export async function getExecutionHistory(userId: number, companyId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  return db
    .select()
    .from(actionItems)
    .where(eq(actionItems.userId, userId) && eq(actionItems.companyId, companyId) && eq(actionItems.status, "executed"))
    .limit(limit);
}
