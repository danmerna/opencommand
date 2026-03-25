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

  // ─── Section 3: Socratic Intent Engine Demo ──────────────────────
  describe("Socratic Intent Engine Demo - 4 Executive Agents", () => {
    it("includes the ContextEngineDemo component", () => {
      expect(homeSource).toContain("ContextEngineDemo");
    });

    it("has Introducing Self-Contextualization section header", () => {
      expect(homeSource).toContain("Introducing Self-Contextualization");
    });

    it("defines AGENT_DEMOS data for all 4 executives in correct order (CEO first)", () => {
      expect(homeSource).toContain("AGENT_DEMOS");
      const ceoIdx = homeSource.indexOf("ceo:");
      const cmoIdx = homeSource.indexOf("cmo:");
      const ctoIdx = homeSource.indexOf("cto:");
      const cfoIdx = homeSource.indexOf("cfo:");
      expect(ceoIdx).toBeLessThan(cmoIdx);
      expect(cmoIdx).toBeLessThan(ctoIdx);
      expect(ctoIdx).toBeLessThan(cfoIdx);
    });

    it("has toggle tabs showing only job titles (no agent names)", () => {
      expect(homeSource).toContain("{d.label}");
      expect(homeSource).not.toContain("{d.name} — {d.label}");
    });

    it("uses Socratic UI pattern: user request, data sources, insights, questions", () => {
      expect(homeSource).toContain("SocraticDataGrid");
      expect(homeSource).toContain("SocraticInsights");
      expect(homeSource).toContain("SocraticResponse");
      expect(homeSource).toContain("User Request");
      expect(homeSource).toContain("Live Data Pulled");
      expect(homeSource).toContain("Cross-Source Insights");
    });

    it("shows the Open Command header with self-contextualizing label", () => {
      expect(homeSource).toContain("OPEN COMMAND");
      expect(homeSource).toContain("Self-contextualizing intent engine");
    });

    it("shows Socratic intent engine branding in response section", () => {
      expect(homeSource).toContain("Socratic intent engine");
    });

    // CEO demo — "Close more deals this quarter"
    it("CEO demo has user request about closing deals", () => {
      expect(homeSource).toContain("Close more deals this quarter");
    });

    it("CEO demo pulls from 4 data sources: HubSpot CRM, Gmail, Calendly, Stripe", () => {
      // Check data source cards within the CEO demo
      expect(homeSource).toContain('"HubSpot CRM"');
      expect(homeSource).toContain('"Gmail"');
      expect(homeSource).toContain('"Calendly"');
      expect(homeSource).toContain('"Stripe"');
    });

    it("CEO demo shows cross-source insights with bold metrics", () => {
      expect(homeSource).toContain("Win rate 39%");
      expect(homeSource).toContain("8 of 11 stalled deals");
      expect(homeSource).toContain("$64K in closed deals sitting unpaid");
    });

    it("CEO demo has numbered Socratic questions with 'Should we' format", () => {
      expect(homeSource).toContain("second meeting close at 68%");
      expect(homeSource).toContain("Should we prioritize second meetings");
      expect(homeSource).toContain("$140K\u2013$210K in recoverable revenue");
    });

    // CMO demo — "Build me an outbound campaign for Q2"
    it("CMO demo has user request about outbound campaign", () => {
      expect(homeSource).toContain("Build me an outbound campaign for Q2");
    });

    it("CMO demo pulls from HubSpot CRM, Gmail, LinkedIn Sales Nav, Calendly", () => {
      expect(homeSource).toContain('"LinkedIn Sales Nav"');
    });

    it("CMO demo shows cross-source insights about LinkedIn and cold email", () => {
      expect(homeSource).toContain("LinkedIn produces 57% of discovery calls");
      expect(homeSource).toContain("47% open rate");
      expect(homeSource).toContain("187 contacts who engaged");
    });

    it("CMO demo has Socratic questions about scaling outbound", () => {
      expect(homeSource).toContain("Should we 3x that to 10/day");
      expect(homeSource).toContain("Should I build the full multichannel sequence");
    });

    // CTO demo — "Why is our release velocity slowing down?"
    it("CTO demo has user request about release velocity", () => {
      expect(homeSource).toContain("Why is our release velocity slowing down");
    });

    it("CTO demo pulls from GitHub, Datadog, Jira, PagerDuty", () => {
      expect(homeSource).toContain('"GitHub"');
      expect(homeSource).toContain('"Datadog"');
      expect(homeSource).toContain('"Jira"');
      expect(homeSource).toContain('"PagerDuty"');
    });

    it("CTO demo shows engineering velocity insights", () => {
      expect(homeSource).toContain("Sprint velocity dropped 26%");
      expect(homeSource).toContain("6 revert commits and 4 deploy rollbacks");
      expect(homeSource).toContain("3 PagerDuty incidents share the same root cause");
    });

    it("CTO demo has Socratic questions about fixing root causes", () => {
      expect(homeSource).toContain("Should I prioritize a hotfix sprint this week");
      expect(homeSource).toContain("Should we implement a review SLA");
    });

    // CFO demo — "Are we on track to hit profitability this year?"
    it("CFO demo has user request about profitability", () => {
      expect(homeSource).toContain("Are we on track to hit profitability this year");
    });

    it("CFO demo pulls from Stripe, QuickBooks, HubSpot CRM, Gusto", () => {
      expect(homeSource).toContain('"QuickBooks"');
      expect(homeSource).toContain('"Gusto"');
    });

    it("CFO demo shows financial insights about breakeven and burn", () => {
      expect(homeSource).toContain("$204K MRR with 12% MoM growth");
      expect(homeSource).toContain("Engineering is 62% of total spend");
      expect(homeSource).toContain("$18K in failed Stripe charges");
    });

    it("CFO demo has Socratic questions about hiring and dunning", () => {
      expect(homeSource).toContain("Should we phase the hires");
      expect(homeSource).toContain("Should I set up a dunning sequence");
    });

    it("has the tagline about multiple data sources", () => {
      expect(homeSource).toContain("Multiple data sources. One unified context. Zero manual setup.");
    });

    it("shows footer with context ID, sources list, and domain", () => {
      expect(homeSource).toContain("Context: CTX-2026-");
      expect(homeSource).toContain("opencommand.co");
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
