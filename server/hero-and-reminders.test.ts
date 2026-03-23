import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ─── Hero Illustration Tests ──────────────────────────────────────────────────

describe("ContextEngineHero component", () => {
  const heroSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/components/ContextEngineHero.tsx"),
    "utf-8"
  );

  it("exports ContextEngineHero function", () => {
    expect(heroSource).toContain("export function ContextEngineHero");
  });

  it("defines 8 tool nodes for the orbit", () => {
    const toolMatches = heroSource.match(/\{ name: "/g);
    expect(toolMatches).not.toBeNull();
    expect(toolMatches!.length).toBeGreaterThanOrEqual(8);
  });

  it("includes key tools: HubSpot, Salesforce, Stripe, Slack", () => {
    expect(heroSource).toContain('"HubSpot"');
    expect(heroSource).toContain('"Salesforce"');
    expect(heroSource).toContain('"Stripe"');
    expect(heroSource).toContain('"Slack"');
  });

  it("renders an SVG with viewBox", () => {
    expect(heroSource).toContain('viewBox="0 0 400 400"');
  });

  it("has animated particles flowing toward center", () => {
    expect(heroSource).toContain("particles");
    expect(heroSource).toContain("setParticles");
    expect(heroSource).toContain("progress");
  });

  it("displays CONTEXT ENGINE label at center", () => {
    expect(heroSource).toContain("CONTEXT ENGINE");
  });

  it("includes data labels for flowing particles", () => {
    expect(heroSource).toContain("pipeline_revenue");
    expect(heroSource).toContain("lead_score");
    expect(heroSource).toContain("campaign_roas");
  });

  it("has a pulsing animation for the brain node", () => {
    expect(heroSource).toContain("pulsePhase");
    expect(heroSource).toContain("setPulsePhase");
  });
});

describe("Homepage hero section layout", () => {
  const homeSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/Home.tsx"),
    "utf-8"
  );

  it("imports ContextEngineHero component", () => {
    expect(homeSource).toContain('import { ContextEngineHero }');
  });

  it("uses a two-column grid layout for the hero", () => {
    expect(homeSource).toContain("grid lg:grid-cols-2");
  });

  it("renders ContextEngineHero in the right column", () => {
    expect(homeSource).toContain("<ContextEngineHero />");
  });

  it("hides illustration on mobile with lg:block", () => {
    expect(homeSource).toContain('className="hidden lg:block"');
  });
});

// ─── Onboarding Reminder Email Tests ──────────────────────────────────────────

describe("Onboarding reminder email template", () => {
  const emailSource = fs.readFileSync(
    path.resolve(__dirname, "./email.ts"),
    "utf-8"
  );

  it("exports sendOnboardingReminderEmail function", () => {
    expect(emailSource).toContain("export async function sendOnboardingReminderEmail");
  });

  it("defines OnboardingReminderEmailOptions interface", () => {
    expect(emailSource).toContain("export interface OnboardingReminderEmailOptions");
  });

  it("includes required fields: to, name, companyName, completedCount, totalCount", () => {
    expect(emailSource).toContain("to: string");
    expect(emailSource).toContain("name: string");
    expect(emailSource).toContain("companyName: string");
    expect(emailSource).toContain("completedCount: number");
    expect(emailSource).toContain("totalCount: number");
  });

  it("includes resumeUrl and unsubscribeUrl fields", () => {
    expect(emailSource).toContain("resumeUrl: string");
    expect(emailSource).toContain("unsubscribeUrl?: string");
  });

  it("renders a progress bar in the email", () => {
    expect(emailSource).toContain("progressPct");
    expect(emailSource).toContain("width:${progressPct}%");
  });

  it("includes completed and remaining agent lists", () => {
    expect(emailSource).toContain("completedAgents");
    expect(emailSource).toContain("remainingAgents");
    expect(emailSource).toContain("completedList");
    expect(emailSource).toContain("remainingList");
  });

  it("includes a Resume Onboarding CTA button", () => {
    expect(emailSource).toContain("Resume Onboarding");
  });
});

// ─── Onboarding Reminder Scheduler Tests ──────────────────────────────────────

describe("Onboarding reminder scheduler", () => {
  const schedulerSource = fs.readFileSync(
    path.resolve(__dirname, "./onboardingReminderScheduler.ts"),
    "utf-8"
  );

  it("exports startOnboardingReminderScheduler function", () => {
    expect(schedulerSource).toContain("export function startOnboardingReminderScheduler");
  });

  it("exports checkAndSendReminders for testing", () => {
    expect(schedulerSource).toContain("export { checkAndSendReminders }");
  });

  it("uses a 6-hour cron schedule", () => {
    expect(schedulerSource).toContain("0 0,6,12,18 * * *");
  });

  it("checks for 48-hour cutoff", () => {
    expect(schedulerSource).toContain("48 * 60 * 60 * 1000");
  });

  it("filters for C-suite agent types", () => {
    expect(schedulerSource).toContain('["ceo", "cmo", "cfo", "coo"]');
  });

  it("tracks sent reminders to avoid duplicates", () => {
    expect(schedulerSource).toContain("sentReminders");
    expect(schedulerSource).toContain("sentReminders.has(company.id)");
    expect(schedulerSource).toContain("sentReminders.add(company.id)");
  });

  it("calls sendOnboardingReminderEmail", () => {
    expect(schedulerSource).toContain("sendOnboardingReminderEmail");
  });

  it("notifies owner when reminder is sent", () => {
    expect(schedulerSource).toContain("notifyOwner");
    expect(schedulerSource).toContain("Onboarding Reminder Sent");
  });

  it("respects email unsubscribe preference", () => {
    expect(schedulerSource).toContain("emailUnsubscribed");
  });

  it("generates unsubscribe token if missing", () => {
    expect(schedulerSource).toContain("setUserUnsubscribeToken");
    expect(schedulerSource).toContain("crypto.randomBytes");
  });
});

describe("Server startup integration", () => {
  const serverSource = fs.readFileSync(
    path.resolve(__dirname, "./_core/index.ts"),
    "utf-8"
  );

  it("imports onboarding reminder scheduler", () => {
    expect(serverSource).toContain('import { startOnboardingReminderScheduler }');
  });

  it("calls startOnboardingReminderScheduler on server start", () => {
    expect(serverSource).toContain("startOnboardingReminderScheduler()");
  });
});
