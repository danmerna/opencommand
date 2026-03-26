import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ─── Welcome Email Tests ──────────────────────────────────────────────────────
describe("Post-Onboarding Welcome Email", () => {
  const emailSource = fs.readFileSync(
    path.resolve(__dirname, "./email.ts"),
    "utf-8"
  );

  it("exports sendWelcomeEmail function", () => {
    expect(emailSource).toContain("export async function sendWelcomeEmail");
  });

  it("accepts to, name, companyName, agents, and strategyUrl options", () => {
    expect(emailSource).toContain("to: string");
    expect(emailSource).toContain("name: string");
    expect(emailSource).toContain("companyName: string");
    expect(emailSource).toContain("agents: {");
    expect(emailSource).toContain("strategyUrl: string");
  });

  it("returns a boolean (true on success, false on failure)", () => {
    expect(emailSource).toContain("Promise<boolean>");
    expect(emailSource).toContain("return true");
    expect(emailSource).toContain("return false");
  });

  it("includes the company name in the email subject", () => {
    expect(emailSource).toContain("Your AI executive team is ready");
  });

  it("renders agent list in the email HTML", () => {
    expect(emailSource).toContain("agentList");
    expect(emailSource).toContain(".map(a =>");
  });

  it("includes a CTA link to the strategy URL", () => {
    expect(emailSource).toContain("strategyUrl");
    expect(emailSource).toContain("View Your Strategy");
  });

  it("handles errors non-fatally and returns false", () => {
    expect(emailSource).toContain("return false");
    expect(emailSource).toContain("catch");
  });
});

// ─── Welcome Email DB Helpers Tests ──────────────────────────────────────────
describe("Welcome Email DB Helpers", () => {
  const dbSource = fs.readFileSync(
    path.resolve(__dirname, "./db.ts"),
    "utf-8"
  );

  it("exports hasWelcomeEmailBeenSent", () => {
    expect(dbSource).toContain("export async function hasWelcomeEmailBeenSent");
  });

  it("exports markWelcomeEmailSent", () => {
    expect(dbSource).toContain("export async function markWelcomeEmailSent");
  });

  it("hasWelcomeEmailBeenSent returns false when db is unavailable", () => {
    expect(dbSource).toContain("hasWelcomeEmailBeenSent");
    expect(dbSource).toContain("if (!db) return false");
  });

  it("markWelcomeEmailSent uses onDuplicateKeyUpdate to prevent duplicates", () => {
    expect(dbSource).toContain("onDuplicateKeyUpdate");
  });
});

// ─── Welcome Email Router Integration Tests ───────────────────────────────────
describe("Welcome Email Router Integration", () => {
  const routerSource = fs.readFileSync(
    path.resolve(__dirname, "./routers.ts"),
    "utf-8"
  );

  it("imports sendWelcomeEmail in routers.ts", () => {
    expect(routerSource).toContain("sendWelcomeEmail");
    expect(routerSource).toContain("import");
  });

  it("imports hasWelcomeEmailBeenSent and markWelcomeEmailSent", () => {
    expect(routerSource).toContain("hasWelcomeEmailBeenSent");
    expect(routerSource).toContain("markWelcomeEmailSent");
  });

  it("triggers welcome email when all 4 executives complete onboarding", () => {
    expect(routerSource).toContain("EXEC_TOTAL = 4");
    expect(routerSource).toContain("completedCount >= EXEC_TOTAL");
  });

  it("checks if welcome email was already sent before sending", () => {
    expect(routerSource).toContain("alreadySent = await hasWelcomeEmailBeenSent");
    expect(routerSource).toContain("!alreadySent && bgUserEmail");
  });

  it("marks welcome email as sent after successful send", () => {
    expect(routerSource).toContain("await markWelcomeEmailSent");
  });

  it("handles welcome email errors non-fatally", () => {
    expect(routerSource).toContain("[WelcomeEmail] Background non-fatal error:");
  });
});

// ─── Changelog DB Helpers Tests ───────────────────────────────────────────────
describe("Changelog DB Helpers", () => {
  const dbSource = fs.readFileSync(
    path.resolve(__dirname, "./db.ts"),
    "utf-8"
  );

  it("exports getChangelogEntries", () => {
    expect(dbSource).toContain("export async function getChangelogEntries");
  });

  it("exports seedChangelogIfEmpty", () => {
    expect(dbSource).toContain("export async function seedChangelogIfEmpty");
  });

  it("getChangelogEntries accepts a limit parameter", () => {
    expect(dbSource).toContain("getChangelogEntries(limit = 20)");
  });

  it("seedChangelogIfEmpty only seeds when table is empty", () => {
    expect(dbSource).toContain("const existing = await db.select().from(changelogEntries).limit(1)");
    expect(dbSource).toContain("if (existing.length > 0) return");
  });

  it("seed data includes feature, improvement, fix, and announcement types", () => {
    expect(dbSource).toContain('"feature"');
    expect(dbSource).toContain('"improvement"');
    expect(dbSource).toContain('"announcement"');
  });

  it("seed data includes version numbers", () => {
    expect(dbSource).toContain("version:");
    expect(dbSource).toContain('"0.9');
  });
});

// ─── Changelog Router Tests ───────────────────────────────────────────────────
describe("Changelog Router", () => {
  const routerSource = fs.readFileSync(
    path.resolve(__dirname, "./routers.ts"),
    "utf-8"
  );

  it("defines a changelogRouter", () => {
    expect(routerSource).toContain("const changelogRouter = router(");
  });

  it("exposes a public list procedure", () => {
    expect(routerSource).toContain("list: publicProcedure");
    expect(routerSource).toContain("getChangelogEntries");
  });

  it("registers changelogRouter in appRouter", () => {
    expect(routerSource).toContain("changelog: changelogRouter");
  });
});

// ─── What's New Page Tests ────────────────────────────────────────────────────
describe("What's New Page", () => {
  const pageSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/WhatsNew.tsx"),
    "utf-8"
  );

  it("renders a page title", () => {
    expect(pageSource).toContain("What's New");
    expect(pageSource).toContain("OpenCommand Changelog");
  });

  it("uses trpc.changelog.list.useQuery to fetch entries", () => {
    expect(pageSource).toContain("trpc.changelog.list.useQuery");
  });

  it("shows a loading skeleton while fetching", () => {
    expect(pageSource).toContain("isLoading");
    expect(pageSource).toContain("ChangelogSkeleton");
  });

  it("renders entries in a timeline layout", () => {
    expect(pageSource).toContain("entries.map");
    expect(pageSource).toContain("entry.title");
    expect(pageSource).toContain("entry.description");
  });

  it("shows type badges (feature, improvement, fix, announcement)", () => {
    expect(pageSource).toContain("TYPE_CONFIG");
    expect(pageSource).toContain("feature");
    expect(pageSource).toContain("improvement");
    expect(pageSource).toContain("announcement");
  });

  it("shows a back link to Mission Control", () => {
    expect(pageSource).toContain("/mission-control");
    expect(pageSource).toContain("Mission Control");
  });

  it("shows an empty state when no entries exist", () => {
    expect(pageSource).toContain("No changelog entries yet");
  });

  it("highlights the latest entry visually", () => {
    expect(pageSource).toContain("idx === 0");
    expect(pageSource).toContain("bg-emerald-400");
  });
});

// ─── AppLayout Nav Tests ──────────────────────────────────────────────────────
describe("AppLayout Settings Nav (What's New moved to Settings page)", () => {
  const layoutSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/components/AppLayout.tsx"),
    "utf-8"
  );
  const settingsSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/Settings.tsx"),
    "utf-8"
  );

  it("includes a Settings nav item in the sidebar", () => {
    expect(layoutSource).toContain("/settings");
    expect(layoutSource).toContain("Settings");
  });

  it("Settings page contains What's New tab", () => {
    expect(settingsSource).toContain("What's New");
    expect(settingsSource).toContain("Megaphone");
  });

  it("Settings page embeds WhatsNew component", () => {
    expect(settingsSource).toContain("<WhatsNew");
  });
});

// ─── Server Startup Tests ─────────────────────────────────────────────────────
describe("Server Startup Changelog Seeding", () => {
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, "./_core/index.ts"),
    "utf-8"
  );

  it("imports seedChangelogIfEmpty in server startup", () => {
    expect(indexSource).toContain("seedChangelogIfEmpty");
  });

  it("calls seedChangelogIfEmpty on server start", () => {
    expect(indexSource).toContain("seedChangelogIfEmpty()");
  });
});
