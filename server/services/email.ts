import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendSigEmailOptions {
  dealerSlug: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email from sig-{dealer_slug}@bot.opencommand.co
 *
 * @param options Email options including dealer slug, recipient, subject, and content
 * @returns Email send result with message ID
 *
 * @example
 * await send_sig_email({
 *   dealerSlug: "johnson-tractor",
 *   to: "manager@johnsontractor.com",
 *   subject: "Daily Operations Report",
 *   html: "<h1>Your Daily Report</h1>..."
 * });
 */
export async function send_sig_email(options: SendSigEmailOptions) {
  try {
    const fromEmail = `sig-${options.dealerSlug}@bot.opencommand.co`;

    console.log(`[Email] Sending from ${fromEmail} to ${options.to}`);

    const result = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    } as any);

    if (result.error) {
      console.error(`[Email] Send failed:`, result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`[Email] Sent successfully. Message ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
      from: fromEmail,
      to: options.to,
      subject: options.subject,
    };
  } catch (error) {
    console.error(`[Email] Error sending email:`, error);
    throw error;
  }
}

/**
 * Send email with template variables
 *
 * @param options Email options with template support
 * @returns Email send result
 *
 * @example
 * await send_sig_email_template({
 *   dealerSlug: "johnson-tractor",
 *   to: "manager@johnsontractor.com",
 *   subject: "Action Required: {{action_count}} pending approvals",
 *   template: "action_summary",
 *   variables: {
 *     action_count: 3,
 *     dealer_name: "Johnson Tractor",
 *     actions: [...]
 *   }
 * });
 */
export async function send_sig_email_template(options: {
  dealerSlug: string;
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, any>;
}) {
  try {
    // For now, this is a placeholder that uses the basic send_sig_email
    // In production, you'd integrate with a template engine like Handlebars
    // or use Resend's template feature

    let html = getTemplateHtml(options.template, options.variables);

    return await send_sig_email({
      dealerSlug: options.dealerSlug,
      to: options.to,
      subject: options.subject,
      html,
    });
  } catch (error) {
    console.error(`[Email] Template send failed:`, error);
    throw error;
  }
}

/**
 * Get HTML template for email
 * This is a placeholder - expand with actual templates as needed
 */
function getTemplateHtml(template: string, variables: Record<string, any>): string {
  switch (template) {
    case "action_summary":
      return `
        <h2>Action Summary for ${variables.dealer_name}</h2>
        <p>You have <strong>${variables.action_count}</strong> pending approvals:</p>
        <ul>
          ${variables.actions?.map((a: any) => `<li>${a.title}</li>`).join("") || ""}
        </ul>
      `;

    case "daily_briefing":
      return `
        <h2>Daily Briefing</h2>
        <p>${variables.briefing_text || ""}</p>
      `;

    default:
      return `<p>${JSON.stringify(variables)}</p>`;
  }
}

/**
 * Batch send emails to multiple recipients
 *
 * @param dealerSlug Dealer slug for sender email
 * @param recipients List of recipient emails
 * @param subject Email subject
 * @param html Email HTML content
 * @returns Array of send results
 */
export async function send_sig_email_batch(
  dealerSlug: string,
  recipients: string[],
  subject: string,
  html: string
) {
  const results = await Promise.allSettled(
    recipients.map((to) =>
      send_sig_email({
        dealerSlug,
        to,
        subject,
        html,
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  console.log(
    `[Email] Batch send complete: ${successful.length} succeeded, ${failed.length} failed`
  );

  return {
    successful: successful.map((r) => (r as PromiseFulfilledResult<any>).value),
    failed: failed.map((r) => (r as PromiseRejectedResult).reason),
  };
}
