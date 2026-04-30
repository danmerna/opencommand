import { describe, it, expect } from "vitest";

/**
 * Tests for the AI Chief of Staff landing page (/chief-of-staff)
 * Validates the page structure, content sections, and routing
 */

describe("ChiefOfStaff Landing Page", () => {
  describe("Route Configuration", () => {
    it("should have /chief-of-staff route registered in App.tsx", async () => {
      const fs = await import("fs");
      const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");
      expect(appContent).toContain('path="/chief-of-staff"');
      expect(appContent).toContain("ChiefOfStaff");
    });

    it("should import ChiefOfStaff component in App.tsx", async () => {
      const fs = await import("fs");
      const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");
      expect(appContent).toContain('import ChiefOfStaff from "./pages/ChiefOfStaff"');
    });
  });

  describe("Page Component Structure", () => {
    it("should export a default component from ChiefOfStaff.tsx", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("export default");
    });

    it("should contain the hero section with product name and tagline", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("AI Chief of Staff");
      expect(content).toContain("Four executives");
      expect(content).toContain("highest-leverage move");
    });

    it("should contain the 5-4-3-2-1-Σ cascade mini-diagram in hero", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("ARCH");
      expect(content).toContain("LEDGER");
      expect(content).toContain("SIGNAL");
      expect(content).toContain("FORGE");
      expect(content).toContain("SIGMA");
      expect(content).toContain("5-year vision");
      expect(content).toContain("4-month plan");
      expect(content).toContain("3-week sprint");
      expect(content).toContain("2-day ship");
    });

    it("should contain the problem section with statistics", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("bottleneck");
      expect(content).toContain("23");
      expect(content).toContain("4.2");
      expect(content).toContain("67");
    });

    it("should contain four executive persona cards plus Σ", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      // Check all four executives + Σ are represented
      expect(content).toContain("CEO");
      expect(content).toContain("CFO");
      expect(content).toContain("CMO");
      expect(content).toContain("CTO");
      expect(content).toContain("Synthesis");
    });

    it("should contain the full cascade example (Denver market)", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("Denver");
      expect(content).toContain("Every decision, every angle, one answer");
    });

    it("should contain the How It Works section with 4 steps", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("Connect your tools");
      expect(content).toContain("Meet your executives");
      expect(content).toContain("synthesizes everything");
      expect(content).toContain("Execute with receipts");
    });

    it("should contain the capabilities grid", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("Morning Briefings");
      expect(content).toContain("Individual Chat");
      expect(content).toContain("The Cascade");
      expect(content).toContain("Website Intelligence");
      expect(content).toContain("Tool Integration");
      expect(content).toContain("Proof of Outcome");
    });

    it("should contain pricing section with Beta free tier", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("$0");
      expect(content).toContain("Free during beta");
      expect(content).toContain("Pro");
      expect(content).toContain("Coming Soon");
    });

    it("should have CTA buttons linking to onboarding", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("/onboarding/pro");
      expect(content).toContain("Get Started Free");
      expect(content).toContain("Start Executive Onboarding");
    });

    it("should use the executive persona colors", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      // ARCH indigo #818CF8, LEDGER green #34D399, SIGNAL amber #FBBF24, FORGE red #F87171, Σ teal #00D4AA
      expect(content).toContain("#818CF8"); // ARCH indigo
      expect(content).toContain("#34D399"); // LEDGER green
      expect(content).toContain("#FBBF24"); // SIGNAL amber
      expect(content).toContain("#F87171"); // FORGE red
      expect(content).toContain("#00D4AA"); // Σ teal
    });
  });

  describe("Navigation", () => {
    it("should include navigation links to Home and Mission Control", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ChiefOfStaff.tsx", "utf-8");
      expect(content).toContain("Home");
      expect(content).toContain("Mission Control");
    });
  });
});
