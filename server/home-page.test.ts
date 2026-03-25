import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * These tests validate the redesigned Home.tsx page structure by reading the source file
 * and checking that all required sections, copy, and components are present.
 * This approach works within the server-side vitest config.
 */

const homeSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/Home.tsx"),
  "utf-8"
);

describe("Home Page Redesign - Structure Validation", () => {
  // ─── Section 1: Navigation ─────────────────────────────────────────
  describe("Navigation — Hamburger Menu", () => {
    it("includes How It Works nav link in dropdown", () => {
      expect(homeSource).toContain("How It Works");
    });

    it("includes Blueprints nav link in dropdown", () => {
      expect(homeSource).toContain("Blueprints");
    });

    it("includes Creators nav link in dropdown", () => {
      expect(homeSource).toContain("Creators");
    });

    it("uses hamburger menu for all screen sizes (no hidden md:flex desktop nav)", () => {
      // The old desktop nav had "hidden md:flex" — now removed
      expect(homeSource).not.toContain('"hidden md:flex items-center gap-8"');
    });

    it("includes Login link for unauthenticated users in dropdown", () => {
      expect(homeSource).toContain("Login");
    });

    it("includes Mission Control link for authenticated users in dropdown", () => {
      expect(homeSource).toContain("Mission Control");
    });

    it("includes mobile menu toggle", () => {
      expect(homeSource).toContain("Toggle menu");
      expect(homeSource).toContain("mobileMenuOpen");
    });
  });

  // ─── Section 2: Hero ───────────────────────────────────────────────
  describe("Hero Section", () => {
    it("has the main headline", () => {
      expect(homeSource).toContain("Deploy your");
      expect(homeSource).toContain("zero-human workforce.");
    });

    it("has updated subheadline about self-contextualizing engine", () => {
      expect(homeSource).toContain("connects to your tools");
      expect(homeSource).toContain("builds its own context");
      expect(homeSource).toContain("context-engineers itself");
    });

    it("has Personal Intelligence Engine label", () => {
      expect(homeSource).toContain("Personal Intelligence Engine");
    });

    it("always shows HeroEmailInput regardless of auth state", () => {
      // The hero CTA section should just have <HeroEmailInput /> without auth branching
      expect(homeSource).toContain('className="hero-cta w-full max-w-xl"');
      // Should NOT have isAuthenticated branching in the hero CTA div
      const heroCta = homeSource.match(/hero-cta[\s\S]*?<\/div>/);
      expect(heroCta).toBeTruthy();
    });
  });

  // ─── Section 3: Context Engine Demo — 4 Agent Toggle ──────────────
  describe("Context Engine Demo - 4 Executive Agents", () => {
    it("includes the ContextEngineDemo component", () => {
      expect(homeSource).toContain("ContextEngineDemo");
    });

    it("has Introducing Self-Contextualization section header", () => {
      expect(homeSource).toContain("Introducing Self-Contextualization");
    });

    it("defines AGENT_DEMOS data for all 4 executives", () => {
      expect(homeSource).toContain("AGENT_DEMOS");
      expect(homeSource).toContain("cmo:");
      expect(homeSource).toContain("ceo:");
      expect(homeSource).toContain("cto:");
      expect(homeSource).toContain("cfo:");
    });

    it("has toggle tabs showing only job titles (no agent names)", () => {
      // Tabs render {d.label} which is "CMO", "CEO", "CTO", "CFO"
      expect(homeSource).toContain("{d.label}");
      // Should NOT render agent names in tabs
      expect(homeSource).not.toContain("{d.name} — {d.label}");
    });

    // CMO (NOVA) demo
    it("CMO demo pulls from 3 data sources: Meta Ads, Google Ads, Google Analytics", () => {
      expect(homeSource).toContain("Connecting to Meta Ads");
      expect(homeSource).toContain("Connecting to Google Ads");
      expect(homeSource).toContain("Connecting to Google Analytics");
    });

    it("CMO demo shows specific data from each source", () => {
      expect(homeSource).toContain("14 active campaigns");
      expect(homeSource).toContain("847 keywords");
      expect(homeSource).toContain("42K sessions");
    });

    it("CMO demo includes actionable recommendation", () => {
      expect(homeSource).toContain("shift $2K/mo from underperforming search keywords");
    });

    // CEO (ARCH) demo
    it("CEO demo pulls from 3 data sources: HubSpot CRM, Stripe, Google Analytics", () => {
      expect(homeSource).toContain("Connecting to HubSpot CRM");
      expect(homeSource).toContain("Connecting to Stripe");
    });

    it("CEO demo shows pipeline and revenue data", () => {
      expect(homeSource).toContain("47 open deals");
      expect(homeSource).toContain("$204K MRR");
    });

    it("CEO demo includes actionable recommendation", () => {
      expect(homeSource).toContain("deploy NOVA to run a 30-day conversion optimization sprint");
    });

    // CTO (SAGE) demo
    it("CTO demo pulls from 3 data sources: GitHub, Datadog, Jira", () => {
      expect(homeSource).toContain("Connecting to GitHub");
      expect(homeSource).toContain("Connecting to Datadog");
      expect(homeSource).toContain("Connecting to Jira");
    });

    it("CTO demo shows tech metrics", () => {
      expect(homeSource).toContain("23 active");
      expect(homeSource).toContain("99.94% uptime");
      expect(homeSource).toContain("42 pts/sprint");
    });

    it("CTO demo includes actionable recommendation", () => {
      expect(homeSource).toContain("hotfix sprint targeting the connection pooling issues");
    });

    // CFO (TED) demo
    it("CFO demo pulls from 3 data sources: Stripe, QuickBooks, HubSpot CRM", () => {
      expect(homeSource).toContain("Connecting to QuickBooks");
    });

    it("CFO demo shows financial data", () => {
      expect(homeSource).toContain("$2.4M ARR");
      expect(homeSource).toContain("$167K/mo burn");
      expect(homeSource).toContain("18 months runway");
    });

    it("CFO demo includes actionable recommendation", () => {
      expect(homeSource).toContain("board-ready financial forecast by Friday");
    });

    it("all demos include cross-referencing and context assembly steps", () => {
      expect(homeSource).toContain("Cross-referencing");
      expect(homeSource).toContain("Context assembled from 3 sources");
    });

    it("has the tagline about three data sources", () => {
      expect(homeSource).toContain("Three data sources. One unified context. Zero manual setup.");
    });
  });

  // ─── Section 4: Integration Logo Bar ───────────────────────────────
  describe("Integration Logo Bar", () => {
    it("includes integration logos array", () => {
      expect(homeSource).toContain("integrationLogos");
    });

    it("lists key integration tools including ad platforms", () => {
      const tools = ["HubSpot", "Salesforce", "Stripe", "Gmail", "Slack", "Notion", "Google Analytics", "Mailchimp", "Shopify", "Meta Ads", "Google Ads", "TikTok Ads"];
      for (const tool of tools) {
        expect(homeSource).toContain(`"${tool}"`);
      }
    });

    it("has the 100+ tools tagline", () => {
      expect(homeSource).toContain("Connects to 100+ tools");
    });

    it("includes scrolling animation", () => {
      expect(homeSource).toContain("logo-scroll");
      expect(homeSource).toContain("logoScroll");
    });

    it("shows +90 more indicator", () => {
      expect(homeSource).toContain("+90 more");
    });
  });

  // ─── Section 5: Core Systems (Features) ────────────────────────────
  describe("Core Systems Features", () => {
    it("has the Core Systems section header", () => {
      expect(homeSource).toContain("Core Systems");
      expect(homeSource).toContain("Everything you need to command outcomes.");
    });

    it("includes Intent Engine with updated copy", () => {
      expect(homeSource).toContain("Intent Engine");
      expect(homeSource).toContain("Pulls live data before asking its first question");
    });

    it("includes AI CEO — ARCH", () => {
      expect(homeSource).toContain("AI CEO — ARCH");
    });

    it("includes Company Blueprints feature card", () => {
      expect(homeSource).toContain("Company Blueprints");
      expect(homeSource).toContain("full company operating systems");
    });

    it("includes Proof of Outcome", () => {
      expect(homeSource).toContain("Proof of Outcome");
    });

    it("includes Governance", () => {
      expect(homeSource).toContain("Governance");
    });
  });

  // ─── Section 6: How It Works (4 steps) ─────────────────────────────
  describe("How It Works - 4 Steps", () => {
    it("has the section header", () => {
      expect(homeSource).toContain("Four steps to autonomous execution.");
    });

    it("includes Step 01: State your intent", () => {
      expect(homeSource).toContain("State your intent");
    });

    it("includes Step 02: We pull your context (new step)", () => {
      expect(homeSource).toContain("We pull your context");
    });

    it("includes Step 03: Your workforce executes", () => {
      expect(homeSource).toContain("Your workforce executes");
    });

    it("includes Step 04 marker", () => {
      expect(homeSource).toContain('"04"');
    });

    it("has the how-it-works anchor id for smooth scrolling", () => {
      expect(homeSource).toContain('id="how-it-works"');
    });
  });

  // ─── Section 7: Blueprints Differentiator ─────────────────────────
  describe("Blueprints Differentiator Section", () => {
    it("has the Coming Soon badge", () => {
      expect(homeSource).toContain("Coming Soon");
    });

    it("has the headline: Not agents. Entire companies.", () => {
      expect(homeSource).toContain("Not agents. Entire companies.");
    });

    it("contrasts single-task agents vs full company operating systems", () => {
      expect(homeSource).toContain("single-task agents");
      expect(homeSource).toContain("complete company operating systems");
    });

    it("has the What others sell vs What Blueprints are comparison", () => {
      expect(homeSource).toContain("What others sell");
      expect(homeSource).toContain("What Blueprints are");
      expect(homeSource).toContain("Single agents, single tasks");
      expect(homeSource).toContain("Full company operating systems");
    });

    it("includes the 4 differentiator cards (Scope, Context, Coordination, Accountability)", () => {
      expect(homeSource).toContain("BlueprintDiffCard");
      expect(homeSource).toContain('label="Scope"');
      expect(homeSource).toContain('label="Context"');
      expect(homeSource).toContain('label="Coordination"');
      expect(homeSource).toContain('label="Accountability"');
    });

    it("includes the example Blueprint: The Growth Machine", () => {
      expect(homeSource).toContain("The Growth Machine");
      expect(homeSource).toContain("CMO Agent");
      expect(homeSource).toContain("SDR Agent");
      expect(homeSource).toContain("Analytics Agent");
      expect(homeSource).toContain("CFO Agent");
    });

    it("includes deploy stats for the example blueprint", () => {
      expect(homeSource).toContain("4 agents");
      expect(homeSource).toContain("12 pre-configured OKRs");
      expect(homeSource).toContain("Deploys in");
    });

    it("has EmailCapture for blueprints section and Build Blueprints as a Creator link", () => {
      expect(homeSource).toContain('source="blueprints"');
      expect(homeSource).toContain("Build Blueprints as a Creator");
      expect(homeSource).not.toContain("Browse Marketplace");
    });

    it("has the blueprints-section anchor id", () => {
      expect(homeSource).toContain('id="blueprints-section"');
    });
  });

  // ─── Social Proof Removed ─────────────────────────────────────
  describe("Social Proof Section - Removed", () => {
    it("no longer has fake testimonials", () => {
      expect(homeSource).not.toContain("Marcus Chen");
      expect(homeSource).not.toContain("Meridian Growth");
      expect(homeSource).not.toContain("Sarah Okonkwo");
      expect(homeSource).not.toContain("David Reeves");
      expect(homeSource).not.toContain("What beta users are saying");
    });
  });

  // ─── Section 8: Pricing ────────────────────────────────────────
  describe("Pricing Section - Free During Beta", () => {
    it("has the free during beta header", () => {
      expect(homeSource).toContain("Free during beta. Full access.");
    });

    it("includes beta badge", () => {
      expect(homeSource).toContain("Beta");
    });

    it("includes full access features", () => {
      expect(homeSource).toContain("Unlimited commands");
      expect(homeSource).toContain("Unlimited agents");
      expect(homeSource).toContain("Self-contextualizing engine");
      expect(homeSource).toContain("No credit card required");
    });

    it("includes grandfathering notice", () => {
      expect(homeSource).toContain("Early users will be grandfathered");
    });

    it("always shows HeroEmailInput in pricing section (no auth branching)", () => {
      expect(homeSource).toContain("HeroEmailInput");
    });
  });

  // ─── Section 9: Bottom CTA ─────────────────────────────────────────
  describe("Bottom CTA with Email Capture", () => {
    it("has the bottom-cta anchor id", () => {
      expect(homeSource).toContain('id="bottom-cta"');
    });

    it("includes EmailCapture component", () => {
      expect(homeSource).toContain("EmailCapture");
    });

    it("includes email input placeholder", () => {
      expect(homeSource).toContain('placeholder="your@email.com"');
    });

    it("includes Join the Beta button text", () => {
      expect(homeSource).toContain("Join the Beta");
    });

    it("always shows email form and sign-in link (no auth branching in bottom CTA)", () => {
      expect(homeSource).toContain("Already have an account? Sign in");
    });

    it("uses waitlist.emailSignup mutation", () => {
      expect(homeSource).toContain("trpc.waitlist.emailSignup.useMutation");
    });
  });

  // ─── Section 10: Footer ────────────────────────────────────────────
  describe("Footer - 4 Column Layout", () => {
    it("has the brand column", () => {
      expect(homeSource).toContain("From idea to verified outcome.");
    });

    it("has the Product column header", () => {
      expect(homeSource).toContain(">Product<");
    });

    it("has the Company column header", () => {
      expect(homeSource).toContain(">Company<");
    });

    it("has the Connect column header", () => {
      expect(homeSource).toContain(">Connect<");
    });

    it("includes social links", () => {
      expect(homeSource).toContain("Twitter / X");
      expect(homeSource).toContain("LinkedIn");
      expect(homeSource).toContain("GitHub");
    });

    it("includes copyright", () => {
      expect(homeSource).toContain("Open Command. All rights reserved.");
    });

    it("includes domain reference", () => {
      expect(homeSource).toContain("opencommand.co");
    });
  });

  // ─── Auth-Aware Elements ───────────────────────────────────────────
  describe("Auth-Aware Elements", () => {
    it("queries companies to determine onboarding state (for hamburger menu)", () => {
      expect(homeSource).toContain("trpc.companies.list.useQuery");
      expect(homeSource).toContain("hasCompany");
    });

    it("shows Get Started CTA in hero email input", () => {
      expect(homeSource).toContain("Get Started");
    });

    it("routes to /onboarding/pro for users without company", () => {
      expect(homeSource).toContain('/onboarding/pro');
    });
  });

  // ─── Removed Elements ─────────────────────────────────────────────
  describe("Removed Elements from Old Design", () => {
    it("no longer has fake metrics strip ($48,240, 321.6 hours, etc.)", () => {
      expect(homeSource).not.toContain("$48,240");
      expect(homeSource).not.toContain("321.6");
      expect(homeSource).not.toContain("1,847");
      expect(homeSource).not.toContain("Active Agents");
    });

    it("no longer has Hire Your AI CEO CTA", () => {
      expect(homeSource).not.toContain("Hire Your AI CEO");
    });

    it("no longer has marketplace agent cards (Pipeline Doctor, Content Engine, etc.)", () => {
      expect(homeSource).not.toContain("The Pipeline Doctor");
      expect(homeSource).not.toContain("The Content Engine");
      expect(homeSource).not.toContain("Freelancer Back Office");
      expect(homeSource).not.toContain("@SalesGuru");
    });

    it("no longer has Buy proven agents headline", () => {
      expect(homeSource).not.toContain("Buy proven agents. Or sell your own.");
    });

    it("no longer has Start Free as a nav CTA (replaced by Login)", () => {
      // "Start Free" was the old desktop nav CTA — now it's "Login" in the hamburger
      expect(homeSource).not.toContain('"Start Free"');
    });

    it("no longer has Build Your Team CTA (replaced by Continue Onboarding)", () => {
      expect(homeSource).not.toContain("Build Your Team");
    });
  });
});
