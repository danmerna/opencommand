import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const clientDir = join(__dirname, "..", "client", "src");

function readComponent(relativePath: string): string {
  return readFileSync(join(clientDir, relativePath), "utf-8");
}

// ─── Context Assembly Animation ────────────────────────────────────────────────
describe("ContextAssemblyAnimation component", () => {
  const src = readComponent("components/ContextAssemblyAnimation.tsx");

  it("exports ContextAssemblyAnimation", () => {
    expect(src).toContain("export function ContextAssemblyAnimation");
  });

  it("accepts connectedProviders, agentName, agentIcon, and isComplete props", () => {
    expect(src).toContain("connectedProviders: string[]");
    expect(src).toContain("agentName: string");
    expect(src).toContain("agentIcon: string");
    expect(src).toContain("isComplete: boolean");
  });

  it("defines provider streams for major integrations", () => {
    for (const provider of ["hubspot", "salesforce", "ga4", "meta_ads", "stripe"]) {
      expect(src).toContain(provider);
    }
  });

  it("has a fallback stream for when no providers are connected", () => {
    expect(src).toContain("FALLBACK_STREAM");
    expect(src).toContain("Context Engine");
  });

  it("renders a progress bar with percentage", () => {
    expect(src).toContain("assemblyProgress");
    expect(src).toMatch(/width.*assemblyProgress/);
  });

  it("shows streaming and done status indicators", () => {
    expect(src).toContain('"streaming"');
    expect(src).toContain('"done"');
    expect(src).toContain("animate-spin");
    expect(src).toContain("CheckCircle2");
  });

  it("auto-scrolls as new lines appear", () => {
    expect(src).toContain("scrollRef");
    expect(src).toContain("scrollTop");
    expect(src).toContain("scrollHeight");
  });

  it("shows connected provider badges in footer", () => {
    expect(src).toContain("Sources:");
    expect(src).toContain("connectedProviders.map");
  });

  it("animates data points at intervals", () => {
    expect(src).toContain("setInterval");
    expect(src).toContain("clearInterval");
  });
});

// ─── Context Assembly Animation Integration in ProOnboarding ────────────────
describe("ContextAssemblyAnimation integration in ProOnboarding", () => {
  const src = readComponent("pages/ProOnboarding.tsx");

  it("imports ContextAssemblyAnimation", () => {
    expect(src).toContain('import { ContextAssemblyAnimation }');
  });

  it("renders ContextAssemblyAnimation during context loading", () => {
    expect(src).toContain("<ContextAssemblyAnimation");
    expect(src).toContain("agentContextLoading");
  });

  it("passes connected providers to the animation", () => {
    expect(src).toContain("connectedProviders=");
  });
});

// ─── Onboarding Resume Banner ──────────────────────────────────────────────────
describe("Onboarding Resume Banner in MissionControl", () => {
  const src = readComponent("pages/MissionControl.tsx");

  it("shows 'Continue Building Your Executive Team' for incomplete onboarding", () => {
    expect(src).toContain("Continue Building Your Executive Team");
  });

  it("displays progress as X of Y executives contextualized", () => {
    expect(src).toContain("executives contextualized");
    expect(src).toContain("data.completed");
    expect(src).toContain("data.total");
  });

  it("has a progress bar showing completion percentage", () => {
    expect(src).toContain("progressPct");
    expect(src).toMatch(/width.*progressPct/);
  });

  it("renders a grid of agent cards with status indicators", () => {
    expect(src).toContain("grid grid-cols-2 lg:grid-cols-4");
    expect(src).toContain("data.agents.map");
    expect(src).toContain("isOnboarded");
  });

  it("has a Resume Onboarding button linking to /onboarding/pro", () => {
    expect(src).toContain("Resume Onboarding");
    expect(src).toContain('/onboarding/pro');
  });

  it("shows role-specific colors for each agent type", () => {
    expect(src).toContain("text-amber-400");
    expect(src).toContain("text-blue-400");
    expect(src).toContain("text-pink-400");
    expect(src).toContain("text-emerald-400");
  });

  it("shows executive icons for each agent type", () => {
    expect(src).toContain("EXEC_ICONS");
    expect(src).toContain("👑");
    expect(src).toContain("⚡");
  });

  it("shows context explanation legend at the bottom", () => {
    expect(src).toContain("Contextualized");
    expect(src).toContain("Awaiting interview");
    expect(src).toContain("Each interview takes ~2 min");
  });
});

// ─── Quick Tour Overlay ────────────────────────────────────────────────────────
describe("QuickTour component", () => {
  const src = readComponent("components/QuickTour.tsx");

  it("exports QuickTour", () => {
    expect(src).toContain("export function QuickTour");
  });

  it("accepts isFirstTime prop", () => {
    expect(src).toContain("isFirstTime: boolean");
  });

  it("defines tour steps for Strategy, Fleet, and Intent Engine", () => {
    expect(src).toContain('"strategy"');
    expect(src).toContain('"fleet"');
    expect(src).toContain('"intent-engine"');
    expect(src).toContain("Strategy Tab");
    expect(src).toContain("Agent Fleet");
    expect(src).toContain("Intent Engine");
  });

  it("uses localStorage to persist tour completion", () => {
    expect(src).toContain("localStorage.getItem(TOUR_STORAGE_KEY)");
    expect(src).toContain("localStorage.setItem(TOUR_STORAGE_KEY");
    expect(src).toContain("opencommand_tour_completed");
  });

  it("renders a spotlight SVG mask for the target element", () => {
    expect(src).toContain("tour-spotlight");
    expect(src).toContain("spotlightRect");
    expect(src).toContain("<mask");
  });

  it("has navigation controls (Next, Back, Got it)", () => {
    expect(src).toContain("handleNext");
    expect(src).toContain("handlePrev");
    expect(src).toContain("Got it");
    expect(src).toContain("Next");
    expect(src).toContain("Back");
  });

  it("has a skip/close button", () => {
    expect(src).toContain("handleSkip");
    expect(src).toContain("<X");
  });

  it("shows step progress dots", () => {
    expect(src).toContain("TOUR_STEPS.map");
    expect(src).toContain("currentStep");
    expect(src).toContain("bg-blue-400 scale-125");
    expect(src).toContain("bg-emerald-400");
  });

  it("positions tooltip based on target element", () => {
    expect(src).toContain("positionTooltip");
    expect(src).toContain("getBoundingClientRect");
    expect(src).toContain("targetSelector");
  });

  it("delays activation to let page render", () => {
    expect(src).toContain("setTimeout");
    expect(src).toContain("1500");
  });
});

// ─── Quick Tour Integration in MissionControl ──────────────────────────────────
describe("QuickTour integration in MissionControl", () => {
  const src = readComponent("pages/MissionControl.tsx");

  it("imports QuickTour", () => {
    expect(src).toContain('import { QuickTour }');
  });

  it("renders QuickTour when companies exist", () => {
    expect(src).toContain("<QuickTour");
    expect(src).toContain("isFirstTime=");
  });

  it("adds data-tour attributes to Strategy and Fleet tabs", () => {
    expect(src).toContain('data-tour={t.id === "strategy" ? "strategy" : t.id === "fleet" ? "fleet" : undefined}');
  });
});

// ─── data-tour attribute on Intent Engine in AppLayout ─────────────────────────
describe("data-tour attribute in AppLayout", () => {
  const src = readComponent("components/AppLayout.tsx");

  it("adds data-tour='intent-engine' to the Intent Engine nav item", () => {
    expect(src).toContain('data-tour={item.href === "/intent-engine" ? "intent-engine" : undefined}');
  });
});
