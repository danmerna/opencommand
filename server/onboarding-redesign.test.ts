import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for the onboarding redesign, feedback admin page, and updated entry points.
 * Validates that self-contextualization messaging is clear across all touchpoints.
 */

const proOnboardingSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/ProOnboarding.tsx"),
  "utf-8"
);

const missionControlSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/MissionControl.tsx"),
  "utf-8"
);

const appLayoutSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/components/AppLayout.tsx"),
  "utf-8"
);

const paymentSuccessSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/PaymentSuccess.tsx"),
  "utf-8"
);

const feedbackAdminSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/FeedbackAdmin.tsx"),
  "utf-8"
);

describe("ProOnboarding Welcome Step - Self-Contextualization", () => {
  it("has Beta Access badge instead of Pro Plan Activated", () => {
    expect(proOnboardingSource).toContain("Beta Access");
    expect(proOnboardingSource).not.toContain("Pro Plan Activated");
  });

  it("has Build Your AI Executive Team heading", () => {
    expect(proOnboardingSource).toContain("Build Your");
    expect(proOnboardingSource).toContain("AI Executive Team");
  });

  it("explains self-contextualizing engine in welcome copy", () => {
    expect(proOnboardingSource).toContain("self-contextualizing engine");
    expect(proOnboardingSource).toContain("connects to your existing tools");
    expect(proOnboardingSource).toContain("pulls real data");
  });

  it("has 3-step visual explaining the flow", () => {
    expect(proOnboardingSource).toContain("Step 1");
    expect(proOnboardingSource).toContain("Step 2");
    expect(proOnboardingSource).toContain("Step 3");
    expect(proOnboardingSource).toContain("Connect Your Tools");
    expect(proOnboardingSource).toContain("We Pull Your Context");
    expect(proOnboardingSource).toContain("Personalized Interviews");
  });

  it("mentions time estimate and skip option", () => {
    expect(proOnboardingSource).toContain("Takes about 5 minutes");
    expect(proOnboardingSource).toContain("optional deep-dives");
  });
});

describe("ProOnboarding Integration Step - Data Preview", () => {
  it("has updated heading: Power [Role]'s Context Engine", () => {
    expect(proOnboardingSource).toContain("Power {integrationExec.roleTitle}'s Context Engine");
  });

  it("explains that data is pulled before the interview", () => {
    expect(proOnboardingSource).toContain("before the interview starts");
    expect(proOnboardingSource).toContain("reference your actual numbers");
  });

  it("shows What we'll pull for this interview section", () => {
    expect(proOnboardingSource).toContain("What we'll pull for this interview");
  });

  it("has role-specific data tags for CEO", () => {
    expect(proOnboardingSource).toContain("Pipeline velocity");
    expect(proOnboardingSource).toContain("Deal count");
    expect(proOnboardingSource).toContain("Revenue trends");
  });

  it("has role-specific data tags for CMO", () => {
    expect(proOnboardingSource).toContain("Ad spend & ROAS");
    expect(proOnboardingSource).toContain("Campaign performance");
    expect(proOnboardingSource).toContain("Audience data");
  });

  it("has role-specific data tags for CTO", () => {
    expect(proOnboardingSource).toContain("Product usage");
    expect(proOnboardingSource).toContain("Customer feedback");
  });

  it("has role-specific data tags for CFO", () => {
    expect(proOnboardingSource).toContain("Revenue pipeline");
    expect(proOnboardingSource).toContain("Cost per acquisition");
  });
});

describe("MissionControl - Empty State Onboarding CTA", () => {
  it("shows Build Your AI Executive Team when no company exists", () => {
    expect(missionControlSource).toContain("Build Your AI Executive Team");
  });

  it("explains self-contextualizing engine in empty state", () => {
    expect(missionControlSource).toContain("self-contextualizing engine");
    expect(missionControlSource).toContain("connects to your existing tools");
  });

  it("shows 3-step flow: Connect tools → Context pulled → Personalized team", () => {
    expect(missionControlSource).toContain("Connect tools");
    expect(missionControlSource).toContain("Context pulled");
    expect(missionControlSource).toContain("Personalized team");
  });

  it("has Start Executive Onboarding button linking to /onboarding/pro", () => {
    expect(missionControlSource).toContain("Start Executive Onboarding");
    expect(missionControlSource).toContain("/onboarding/pro");
  });

  it("hides the main dashboard when no company exists", () => {
    expect(missionControlSource).toContain("companies.length === 0");
  });
});

describe("AppLayout - Add Company Routes to Onboarding", () => {
  it("routes add company button to /onboarding/pro", () => {
    expect(appLayoutSource).toContain('navigate("/onboarding/pro")');
  });

  it("has Build Executive Team title on add button", () => {
    expect(appLayoutSource).toContain("Build Executive Team");
  });
});

describe("PaymentSuccess - Beta Alignment", () => {
  it("has Beta Access badge instead of Pro Plan Activated", () => {
    expect(paymentSuccessSource).toContain("Beta Access");
    expect(paymentSuccessSource).not.toContain("Pro Plan Activated");
    expect(paymentSuccessSource).not.toContain("Welcome to Pro");
  });

  it("has Welcome to OpenCommand heading", () => {
    expect(paymentSuccessSource).toContain("Welcome to OpenCommand");
  });

  it("mentions self-contextualization in the description", () => {
    expect(paymentSuccessSource).toContain("connect to your tools");
    expect(paymentSuccessSource).toContain("pull your context");
  });

  it("links to /onboarding/pro as primary CTA", () => {
    expect(paymentSuccessSource).toContain("/onboarding/pro");
    expect(paymentSuccessSource).toContain("Start Executive Onboarding");
  });

  it("includes fallback link to Mission Control", () => {
    expect(paymentSuccessSource).toContain("/mission-control");
  });
});

describe("FeedbackAdmin Page", () => {
  it("has Feedback Admin heading", () => {
    expect(feedbackAdminSource).toContain("Feedback");
  });

  it("includes filter by type", () => {
    expect(feedbackAdminSource).toContain("bug");
    expect(feedbackAdminSource).toContain("feature");
    expect(feedbackAdminSource).toContain("general");
  });

  it("includes filter by status", () => {
    expect(feedbackAdminSource).toContain("new");
    expect(feedbackAdminSource).toContain("reviewed");
    expect(feedbackAdminSource).toContain("resolved");
  });

  it("uses trpc feedback.list query", () => {
    expect(feedbackAdminSource).toContain("trpc.feedback.list");
  });

  it("uses trpc feedback.updateStatus mutation", () => {
    expect(feedbackAdminSource).toContain("feedback.updateStatus");
  });
});
