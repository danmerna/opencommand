/**
 * Briefing Scheduler
 * Sends strategy briefings to users on their chosen cadence (daily/weekly/monthly/quarterly).
 * Delivers via: (1) in-app owner notification, (2) Resend email, (3) briefing_logs DB record.
 */
import cron from "node-cron";
import { getDb, createBriefingLog } from "./db";
import { companies, strategyProposals, users } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { sendBriefingEmail } from "./email";
import { setUserUnsubscribeToken } from "./db";
import crypto from "crypto";

// Map briefing frequency to cron expressions
const FREQUENCY_CRON: Record<string, string> = {
  daily:     "0 8 * * *",        // Every day at 8:00 AM
  weekly:    "0 8 * * 1",        // Every Monday at 8:00 AM
  monthly:   "0 8 1 * *",        // 1st of every month at 8:00 AM
  quarterly: "0 8 1 1,4,7,10 *", // 1st of Jan, Apr, Jul, Oct at 8:00 AM
};

async function deliverBriefingForFrequency(frequency: string) {
  const db = await getDb();
  if (!db) return;

  // Find all companies with this briefing frequency, joined with their owner user
  const matchingCompanies = await db
    .select({ company: companies, user: users })
    .from(companies)
    .innerJoin(users, eq(users.id, companies.userId))
    .where(eq((companies as any).briefingFrequency, frequency));

  for (const { company, user } of matchingCompanies) {
    try {
      // Get the latest accepted or pending strategy proposal
      const proposals = await db
        .select()
        .from(strategyProposals)
        .where(eq(strategyProposals.companyId, company.id))
        .orderBy(desc(strategyProposals.createdAt))
        .limit(1);

      const latest = proposals[0];
      const freqLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);

      let title: string;
      let content: string;

      if (latest) {
        const summary = latest.executiveSummary
          ? latest.executiveSummary.slice(0, 600) + (latest.executiveSummary.length > 600 ? "..." : "")
          : "Your executive team has a strategy ready for review.";

        title = `${freqLabel} Strategy Briefing — ${company.name}`;
        content = `Your ${frequency} OpenCommand briefing is ready.\n\n${summary}\n\nVisit Mission Control → Strategy to review the full plan and accept or revise it.`;
      } else {
        title = `${freqLabel} Briefing Reminder — ${company.name}`;
        content = `Your ${frequency} strategy briefing is due, but no strategy has been generated yet for ${company.name}.\n\nVisit Mission Control → Strategy to generate your first combined strategic plan.`;
      }

      // 1. In-app owner notification
      await notifyOwner({ title, content });

      // 2. Email delivery via Resend (non-blocking — failure doesn't abort the log)
      if (user.email && !(user as any).emailUnsubscribed) {
        // Ensure user has an unsubscribe token; generate one if missing
        let unsubToken = (user as any).emailUnsubscribeToken as string | undefined;
        if (!unsubToken) {
          unsubToken = crypto.randomBytes(32).toString("hex");
          await setUserUnsubscribeToken(user.id, unsubToken);
        }
        const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL
          ? "https://opencommand.co"
          : "http://localhost:3000";
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubToken}`;

        const emailSent = await sendBriefingEmail({
          to: user.email,
          name: user.name ?? "there",
          companyName: company.name,
          frequency,
          title,
          content,
          unsubscribeUrl,
        });
        if (!emailSent) {
          console.warn(`[BriefingScheduler] Email delivery failed for user ${user.id} (${user.email})`);
        }
      }

      // 3. Log to DB for /briefings history page
      await createBriefingLog({
        userId: company.userId,
        companyId: company.id,
        companyName: company.name,
        frequency: frequency as any,
        title,
        content,
        deliveredAt: new Date(),
      });

      console.log(`[BriefingScheduler] Delivered ${frequency} briefing for company ${company.id} (${company.name})`);
    } catch (err) {
      console.error(`[BriefingScheduler] Failed to deliver briefing for company ${company.id}:`, err);
    }
  }
}

export function startBriefingScheduler() {
  console.log("[BriefingScheduler] Starting briefing scheduler...");

  for (const [frequency, cronExpr] of Object.entries(FREQUENCY_CRON)) {
    cron.schedule(cronExpr, async () => {
      console.log(`[BriefingScheduler] Delivering ${frequency} briefings...`);
      await deliverBriefingForFrequency(frequency);
    });
    console.log(`[BriefingScheduler] Scheduled ${frequency} briefings (${cronExpr})`);
  }
}
