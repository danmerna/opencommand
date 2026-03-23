import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export interface BriefingEmailOptions {
  to: string;
  name: string;
  companyName: string;
  frequency: string;
  title: string;
  content: string;
}

/**
 * Send a strategy briefing email via Resend.
 * Returns true on success, false on failure (non-throwing).
 */
export async function sendBriefingEmail(opts: BriefingEmailOptions): Promise<boolean> {
  try {
    const { to, name, companyName, frequency, title, content } = opts;

    // Convert plain-text content to simple HTML paragraphs
    const htmlBody = content
      .split("\n\n")
      .map((para) => `<p style="margin:0 0 16px;line-height:1.6;">${para.replace(/\n/g, "<br/>")}</p>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #222;">
              <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#666;">OpenCommand &mdash; Personal Intelligence Engine</p>
              <p style="margin:0;font-size:11px;color:#555;">${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Strategy Briefing &middot; ${companyName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 36px;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:300;color:#ffffff;letter-spacing:-0.02em;">${title}</h1>
              <div style="font-size:14px;color:#aaa;">${htmlBody}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #222;">
              <p style="margin:0;font-size:11px;color:#555;line-height:1.6;">
                You're receiving this because you set up ${frequency} briefings for <strong style="color:#777;">${companyName}</strong> in OpenCommand.<br/>
                <a href="https://opencommand.co/mission-control" style="color:#888;text-decoration:underline;">Manage briefing settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: title,
      html,
    });

    if (error) {
      console.error("[BriefingEmail] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BriefingEmail] Unexpected error:", err);
    return false;
  }
}

/**
 * Lightweight connectivity test — sends a test email to verify credentials.
 */
export async function testResendConnection(to: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "OpenCommand — Resend connection test",
      html: "<p>Resend is connected and working correctly.</p>",
    });
    return !error;
  } catch {
    return false;
  }
}
