/**
 * Onboarding Reminder Scheduler
 * Checks every 6 hours for users who started onboarding more than 48 hours ago
 * but haven't completed all 4 executive interviews. Sends a single reminder email
 * with a direct link to resume, and tracks reminder state to avoid duplicates.
 */
import cron from "node-cron";
import { getDb, getOnboardingsByCompanyId, setUserUnsubscribeToken } from "./db";
import { companies, agents, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { sendOnboardingReminderEmail } from "./email";
import crypto from "crypto";

// C-suite agent types that require onboarding
const CSUITE_TYPES = ["ceo", "cmo", "cfo", "coo"];

// Track which companies have already been sent a reminder (in-memory + DB-backed)
const sentReminders = new Set<number>();

async function checkAndSendReminders() {
  const db = await getDb();
  if (!db) return;

  try {
    // Find all companies created more than 48 hours ago
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const allCompanies = await db
      .select({ company: companies, user: users })
      .from(companies)
      .innerJoin(users, eq(users.id, companies.userId))
      .where(
        and(
          eq(companies.status, "active"),
          sql`${companies.createdAt} < ${cutoff}`
        )
      );

    for (const { company, user } of allCompanies) {
      // Skip if already sent a reminder for this company
      if (sentReminders.has(company.id)) continue;

      // Skip if user has unsubscribed from emails
      if ((user as any).emailUnsubscribed) continue;

      // Skip if no email address
      if (!user.email) continue;

      // Get all C-suite agents for this company
      const companyAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.companyId, company.id));

      const csuiteAgents = companyAgents.filter(a =>
        CSUITE_TYPES.includes(a.type as string)
      );

      // Skip if no C-suite agents exist (company might not have gone through executive onboarding)
      if (csuiteAgents.length === 0) continue;

      // Check onboarding status
      const onboardings = await getOnboardingsByCompanyId(company.id);
      const completedOnboardings = onboardings.filter(o => o.status === "completed");

      // Skip if all are completed
      if (completedOnboardings.length >= csuiteAgents.length) continue;

      // Build agent status lists
      const completedAgentIds = new Set(completedOnboardings.map(o => o.agentId));
      const completedAgents = csuiteAgents
        .filter(a => completedAgentIds.has(a.id))
        .map(a => `${a.roleTitle || a.name} (${a.type.toUpperCase()})`);
      const remainingAgents = csuiteAgents
        .filter(a => !completedAgentIds.has(a.id))
        .map(a => `${a.roleTitle || a.name} (${a.type.toUpperCase()})`);

      // Generate unsubscribe token if needed
      let unsubToken = (user as any).emailUnsubscribeToken as string | undefined;
      if (!unsubToken) {
        unsubToken = crypto.randomBytes(32).toString("hex");
        await setUserUnsubscribeToken(user.id, unsubToken);
      }

      const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL
        ? "https://opencommand.co"
        : "http://localhost:3000";
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubToken}`;
      const resumeUrl = `${baseUrl}/onboarding/pro`;

      // Send the reminder email
      const emailSent = await sendOnboardingReminderEmail({
        to: user.email,
        name: user.name ?? "there",
        companyName: company.name,
        completedCount: completedOnboardings.length,
        totalCount: csuiteAgents.length,
        completedAgents,
        remainingAgents,
        resumeUrl,
        unsubscribeUrl,
      });

      if (emailSent) {
        console.log(`[OnboardingReminder] Sent reminder for company ${company.id} (${company.name}) — ${completedOnboardings.length}/${csuiteAgents.length} complete`);
        sentReminders.add(company.id);

        // Also notify the owner
        await notifyOwner({
          title: `Onboarding Reminder Sent — ${company.name}`,
          content: `Reminder email sent to ${user.email}. ${completedOnboardings.length}/${csuiteAgents.length} executives onboarded. Remaining: ${remainingAgents.join(", ")}.`,
        });
      } else {
        console.warn(`[OnboardingReminder] Failed to send reminder for company ${company.id}`);
      }
    }
  } catch (err) {
    console.error("[OnboardingReminder] Scheduler error:", err);
  }
}

export function startOnboardingReminderScheduler() {
  console.log("[OnboardingReminder] Starting onboarding reminder scheduler...");

  // Run every 6 hours: at midnight, 6am, noon, 6pm
  cron.schedule("0 0,6,12,18 * * *", async () => {
    console.log("[OnboardingReminder] Checking for incomplete onboardings...");
    await checkAndSendReminders();
  });

  console.log("[OnboardingReminder] Scheduled (every 6 hours at 0:00, 6:00, 12:00, 18:00)");
}

// Export for testing
export { checkAndSendReminders };
