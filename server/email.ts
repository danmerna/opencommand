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
  unsubscribeUrl?: string;
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
                ${opts.unsubscribeUrl ? `&nbsp;&middot;&nbsp;<a href="${opts.unsubscribeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe from emails</a>` : ""}
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

export interface OnboardingReminderEmailOptions {
  to: string;
  name: string;
  companyName: string;
  completedCount: number;
  totalCount: number;
  completedAgents: string[];
  remainingAgents: string[];
  resumeUrl: string;
  unsubscribeUrl?: string;
}

/**
 * Send an onboarding reminder email to users who haven't completed all executive interviews.
 * Returns true on success, false on failure (non-throwing).
 */
export async function sendOnboardingReminderEmail(opts: OnboardingReminderEmailOptions): Promise<boolean> {
  try {
    const { to, name, companyName, completedCount, totalCount, completedAgents, remainingAgents, resumeUrl } = opts;

    const progressPct = Math.round((completedCount / totalCount) * 100);

    const completedList = completedAgents.length > 0
      ? completedAgents.map(a => `<li style="margin:0 0 6px;color:#22c55e;">&#10003; ${a}</li>`).join("")
      : "";
    const remainingList = remainingAgents
      .map(a => `<li style="margin:0 0 6px;color:#888;">&#9744; ${a}</li>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Continue Building Your Executive Team</title>
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
              <p style="margin:0;font-size:11px;color:#555;">Onboarding Reminder &middot; ${companyName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 36px;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:300;color:#ffffff;letter-spacing:-0.02em;">
                Your executive team is ${progressPct}% built, ${name}.
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#aaa;line-height:1.6;">
                You started building your AI executive team for <strong style="color:#ddd;">${companyName}</strong>, but ${totalCount - completedCount} executive${totalCount - completedCount > 1 ? "s" : ""} still need${totalCount - completedCount === 1 ? "s" : ""} to be contextualized. Each interview takes about 2 minutes and teaches your agent how your business actually works.
              </p>

              <!-- Progress bar -->
              <div style="background:#1a1a1a;border-radius:8px;height:8px;margin:0 0 24px;overflow:hidden;">
                <div style="background:#22c55e;height:100%;width:${progressPct}%;border-radius:8px;"></div>
              </div>

              <!-- Agent status -->
              <ul style="list-style:none;padding:0;margin:0 0 24px;font-size:14px;">
                ${completedList}
                ${remainingList}
              </ul>

              <!-- CTA -->
              <a href="${resumeUrl}" style="display:inline-block;background:#22c55e;color:#000;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
                Resume Onboarding &rarr;
              </a>

              <p style="margin:20px 0 0;font-size:12px;color:#555;line-height:1.5;">
                The sooner all executives are contextualized, the sooner your AI workforce can start executing autonomously with full awareness of your business.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #222;">
              <p style="margin:0;font-size:11px;color:#555;line-height:1.6;">
                You're receiving this because you started onboarding for <strong style="color:#777;">${companyName}</strong> in OpenCommand.<br/>
                <a href="${resumeUrl}" style="color:#888;text-decoration:underline;">Continue onboarding</a>
                ${opts.unsubscribeUrl ? `&nbsp;&middot;&nbsp;<a href="${opts.unsubscribeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe from emails</a>` : ""}
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
      subject: `Your executive team is ${progressPct}% built — continue onboarding for ${companyName}`,
      html,
    });

    if (error) {
      console.error("[OnboardingReminder] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[OnboardingReminder] Unexpected error:", err);
    return false;
  }
}
