/**
 * Briefing Scheduler
 * Sends strategy briefings to users on their chosen cadence (daily/weekly/monthly/quarterly).
 * Uses node-cron to run checks and the notifyOwner helper to deliver notifications.
 */
import cron from "node-cron";
import { getDb } from "./db";
import { companies, strategyProposals } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

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

  // Find all companies with this briefing frequency
  const matchingCompanies = await db
    .select()
    .from(companies)
    .where(eq((companies as any).briefingFrequency, frequency));

  for (const company of matchingCompanies) {
    try {
      // Get the latest accepted or proposed strategy
      const proposals = await db
        .select()
        .from(strategyProposals)
        .where(eq(strategyProposals.companyId, company.id))
        .orderBy(desc(strategyProposals.createdAt))
        .limit(1);

      const latest = proposals[0];
      const freqLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);

      if (latest) {
        const summary = latest.executiveSummary
          ? latest.executiveSummary.slice(0, 300) + (latest.executiveSummary.length > 300 ? "..." : "")
          : "Your executive team has a strategy ready for review.";

        await notifyOwner({
          title: `${freqLabel} Strategy Briefing — ${company.name}`,
          content: `Your ${frequency} IntelligenceOS briefing is ready.\n\n${summary}\n\nVisit Mission Control → Strategy to review the full plan and accept or revise it.`,
        });
      } else {
        // No strategy yet — prompt the user to generate one
        await notifyOwner({
          title: `${freqLabel} Briefing Reminder — ${company.name}`,
          content: `Your ${frequency} strategy briefing is due, but no strategy has been generated yet for ${company.name}. Visit Mission Control → Strategy to generate your first combined strategic plan.`,
        });
      }
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
