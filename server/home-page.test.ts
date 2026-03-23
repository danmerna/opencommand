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
  describe("Navigation", () => {
    it("includes How It Works nav link", () => {
      expect(homeSource).toContain("How It Works");
    });

    it("includes Blueprints nav link", () => {
      expect(homeSource).toContain("Blueprints");
    });

    it("includes Creators nav link", () => {
      expect(homeSource).toContain("Creators");
    });

    it("includes Start Free CTA for unauthenticated users", () => {
      expect(homeSource).toContain("Start Free");
    });

    it("includes Mission Control link for authenticated users", () => {
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
  });

  // ─── Section 3: Context Engine Demo ────────────────────────────────
  describe("Context Engine Demo", () => {
    it("includes the ContextEngineDemo component", () => {
      expect(homeSource).toContain("ContextEngineDemo");
    });

    it("has The Magic Moment section header", () => {
      expect(homeSource).toContain("The Magic Moment");
    });

    it("has the key tagline about starting informed", () => {
      expect(homeSource).toContain("Other AI tools start cold. Open Command starts informed.");
    });

    it("includes typewriter text for user input", () => {
      expect(homeSource).toContain("I want more leads");
    });

    it("includes HubSpot connection status lines", () => {
      expect(homeSource).toContain("Connecting to HubSpot...");
      expect(homeSource).toContain("Reading pipeline: 47 deals, $847K value");
      expect(homeSource).toContain("Analyzing closed deals: 80% manufacturing");
      expect(homeSource).toContain("Context assembled in 3.2s");
    });

    it("includes the context card with HubSpot data", () => {
      expect(homeSource).toContain("Context from HubSpot");
      expect(homeSource).toContain("142 contacts");
      expect(homeSource).toContain("$847K pipeline");
    });

    it("includes the AI response from Arch", () => {
      expect(homeSource).toContain("$847K across 47 deals");
      expect(homeSource).toContain("double down on that segment");
    });

    it("has the italic tagline about context", () => {
      expect(homeSource).toContain("doesn't ask you for context. It goes and gets it.");
    });
  });

  // ─── Section 4: Integration Logo Bar ───────────────────────────────
  describe("Integration Logo Bar", () => {
    it("includes integration logos array", () => {
      expect(homeSource).toContain("integrationLogos");
    });

    it("lists key integration tools", () => {
      const tools = ["HubSpot", "Salesforce", "Stripe", "Gmail", "Slack", "Notion", "Google Analytics", "Mailchimp", "Shopify"];
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

    it("includes AI CEO — Arch", () => {
      expect(homeSource).toContain("AI CEO — Arch");
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

    it("has Join the Waitlist CTA instead of Browse Marketplace", () => {
      expect(homeSource).toContain("Join the Waitlist");
      expect(homeSource).toContain("Build Blueprints as a Creator");
      expect(homeSource).not.toContain("Browse Marketplace");
    });

    it("has the blueprints-section anchor id", () => {
      expect(homeSource).toContain('id="blueprints-section"');
    });
  });

  // ─── Section 8: Pricing ────────────────────────────────────────────
  describe("Pricing Section - Three Tiers", () => {
    it("has the pricing section header", () => {
      expect(homeSource).toContain("Start free. Scale when it works.");
    });

    it("includes Free tier at $0", () => {
      expect(homeSource).toContain("$0");
      expect(homeSource).toContain("10 commands / month");
      expect(homeSource).toContain("2 connected tools");
    });

    it("includes Pro tier at $29", () => {
      expect(homeSource).toContain("$29");
      expect(homeSource).toContain("100 commands / month");
      expect(homeSource).toContain("Self-contextualizing engine");
    });

    it("includes Business tier at $99", () => {
      expect(homeSource).toContain("$99");
      expect(homeSource).toContain("Unlimited commands");
      expect(homeSource).toContain("Featured marketplace selling");
    });

    it("includes Founding Member pricing callout", () => {
      expect(homeSource).toContain("Founding Member pricing");
      expect(homeSource).toContain("$19/mo for Pro");
      expect(homeSource).toContain("First 500 users");
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

    it("includes 500 founding member spots text", () => {
      expect(homeSource).toContain("500 founding member spots");
    });

    it("uses waitlist.join mutation", () => {
      expect(homeSource).toContain("trpc.waitlist.join.useMutation");
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
  });
});
