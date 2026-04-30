import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read source files for static analysis
const routersSource = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
const quickStartPage = readFileSync(resolve(__dirname, "../client/src/pages/QuickStart.tsx"), "utf-8");
const chiefOfStaffPage = readFileSync(resolve(__dirname, "../client/src/pages/ChiefOfStaff.tsx"), "utf-8");
const homePage = readFileSync(resolve(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
const appTsx = readFileSync(resolve(__dirname, "../client/src/App.tsx"), "utf-8");

describe("Quick-Start Mode", () => {
  describe("Backend: onboarding.quickStart procedure", () => {
    it("should define quickStart mutation in the onboarding router", () => {
      expect(routersSource).toContain("quickStart: protectedProcedure");
    });

    it("should accept companyName, website, and optional industry inputs", () => {
      expect(routersSource).toContain("companyName: z.string().min(1)");
      expect(routersSource).toContain("website: z.string().min(1)");
      expect(routersSource).toContain("industry: z.string().optional()");
    });

    it("should call createCompany for new companies", () => {
      // The quickStart procedure creates a company if one doesn't exist
      const quickStartSection = routersSource.slice(routersSource.indexOf("quickStart: protectedProcedure"));
      expect(quickStartSection).toContain("createCompany");
    });

    it("should call runWebsiteAudit during quick-start", () => {
      const quickStartSection = routersSource.slice(routersSource.indexOf("quickStart: protectedProcedure"));
      expect(quickStartSection).toContain("runWebsiteAudit");
    });

    it("should invoke LLM for Σ synthesis recommendation", () => {
      const quickStartSection = routersSource.slice(routersSource.indexOf("quickStart: protectedProcedure"));
      expect(quickStartSection).toContain("invokeLLM");
      expect(quickStartSection).toContain("highest-leverage");
    });

    it("should return recommendation, auditStatus, auditSummary, and seoScore", () => {
      const quickStartSection = routersSource.slice(routersSource.indexOf("quickStart: protectedProcedure"));
      expect(quickStartSection).toContain("recommendation");
      expect(quickStartSection).toContain("auditStatus");
      expect(quickStartSection).toContain("auditSummary");
      expect(quickStartSection).toContain("seoScore");
    });
  });

  describe("Frontend: QuickStart page", () => {
    it("should have four steps: input, email-gate, analyzing, results", () => {
      expect(quickStartPage).toContain('"input" | "analyzing" | "email-gate" | "results"');
    });

    it("should have company name input field", () => {
      expect(quickStartPage).toContain("Company Name");
      expect(quickStartPage).toContain("companyName");
    });

    it("should have website URL input field", () => {
      expect(quickStartPage).toContain("Website URL");
      expect(quickStartPage).toContain("website");
    });

    it("should have optional industry field", () => {
      expect(quickStartPage).toContain("Industry");
      expect(quickStartPage).toContain("industry");
    });

    it("should call onboarding.quickStart mutation on submit", () => {
      expect(quickStartPage).toContain("trpc.onboarding.quickStart.useMutation");
    });

    it("should show analyzing animation during processing", () => {
      expect(quickStartPage).toContain("analyzing");
      expect(quickStartPage).toContain("Σ is analyzing your business");
    });

    it("should display Σ recommendation in results step", () => {
      expect(quickStartPage).toContain("Highest-Leverage Move");
      expect(quickStartPage).toContain("Streamdown");
    });

    it("should show SEO score badge in results", () => {
      expect(quickStartPage).toContain("seoScore");
      expect(quickStartPage).toContain("SEO Score");
    });

    it("should provide links to full onboarding and Σ chat after results", () => {
      expect(quickStartPage).toContain("/onboarding/pro");
      expect(quickStartPage).toContain("/sigma-chat");
    });

    it("should redirect unauthenticated users to login", () => {
      expect(quickStartPage).toContain("getLoginUrl");
      expect(quickStartPage).toContain("Sign In to Continue");
    });
  });

  describe("Route registration", () => {
    it("should have /quick-start route in App.tsx", () => {
      expect(appTsx).toContain('path="/quick-start"');
      expect(appTsx).toContain("QuickStart");
    });

    it("should import QuickStart page in App.tsx", () => {
      expect(appTsx).toContain('import QuickStart from "./pages/QuickStart"');
    });
  });

  describe("Chief of Staff landing page integration", () => {
    it("should have quick-start CTA button on /chief-of-staff page", () => {
      expect(chiefOfStaffPage).toContain("/quick-start");
      expect(chiefOfStaffPage).toContain("Quick Start");
    });

    it("should mention 60 seconds in the quick-start CTA", () => {
      expect(chiefOfStaffPage).toContain("60 seconds");
    });
  });

  describe("Home page menu integration", () => {
    it("should have AI Chief of Staff link in the hamburger menu", () => {
      expect(homePage).toContain("/chief-of-staff");
      expect(homePage).toContain("AI Chief of Staff");
    });
  });
});
