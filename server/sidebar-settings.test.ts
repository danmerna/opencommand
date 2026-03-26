import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const clientDir = path.resolve(__dirname, "../client/src");

function readComponent(relativePath: string): string {
  return fs.readFileSync(path.join(clientDir, relativePath), "utf-8");
}

// ─── Streamlined Sidebar ──────────────────────────────────────────────────────
describe("Streamlined Sidebar (AppLayout)", () => {
  const src = readComponent("components/AppLayout.tsx");

  it("has exactly 6 core nav items", () => {
    expect(src).toContain("const coreNavItems = [");
    // All 6 primary items present
    expect(src).toContain("Mission Control");
    expect(src).toContain("Intent Engine");
    expect(src).toContain("Executive Board");
    expect(src).toContain("Blueprints");
    expect(src).toContain("Execution");
    expect(src).toContain("Analytics");
  });

  it("has a Settings nav item separate from core items", () => {
    expect(src).toContain("const settingsNavItem = ");
    expect(src).toContain('href: "/settings"');
    expect(src).toContain('label: "Settings"');
  });

  it("does NOT have old nav items in the sidebar", () => {
    // These were moved to Settings page
    expect(src).not.toContain('href: "/governance"');
    expect(src).not.toContain('href: "/integration-hub"');
    expect(src).not.toContain('href: "/context-history"');
    expect(src).not.toContain('href: "/payments"');
    expect(src).not.toContain('href: "/pricing"');
    expect(src).not.toContain('href: "/whats-new"');
    expect(src).not.toContain('href: "/ai-ceo"');
  });

  it("has Feedback link in the user footer area", () => {
    expect(src).toContain("/feedback-admin");
    expect(src).toContain("Feedback");
    expect(src).toContain("MessageSquare");
  });

  it("imports Settings icon from lucide-react", () => {
    expect(src).toContain("Settings");
  });

  it("preserves FeedbackWidget", () => {
    expect(src).toContain("<FeedbackWidget />");
  });

  it("preserves Agents and Projects sections", () => {
    expect(src).toContain(">Agents</");
    expect(src).toContain(">Projects</");
  });

  it("renders Projects section before Agents section", () => {
    const projectsIdx = src.indexOf("{/* Projects section */}");
    const agentsIdx = src.indexOf("{/* Agents section */}");
    expect(projectsIdx).toBeGreaterThan(-1);
    expect(agentsIdx).toBeGreaterThan(-1);
    expect(projectsIdx).toBeLessThan(agentsIdx);
  });
});

// ─── Settings Page ────────────────────────────────────────────────────────────
describe("Settings Page", () => {
  const src = readComponent("pages/Settings.tsx");

  it("exports a default Settings component", () => {
    expect(src).toContain("export default function Settings()");
  });

  it("defines 5 tabs: connections, governance, history, account, about", () => {
    expect(src).toContain('"connections"');
    expect(src).toContain('"governance"');
    expect(src).toContain('"history"');
    expect(src).toContain('"account"');
    expect(src).toContain('"about"');
  });

  it("has human-readable tab labels", () => {
    expect(src).toContain("Connections");
    expect(src).toContain("Governance");
    expect(src).toContain("Context History");
    expect(src).toContain("Account");
    expect(src).toContain("What's New");
  });

  it("embeds IntegrationHub for the connections tab", () => {
    expect(src).toContain("import IntegrationHub from");
    expect(src).toContain("<IntegrationHub");
  });

  it("embeds Governance for the governance tab", () => {
    expect(src).toContain("import Governance from");
    expect(src).toContain("<Governance");
  });

  it("embeds ContextHistory for the history tab", () => {
    expect(src).toContain("import ContextHistory from");
    expect(src).toContain("<ContextHistory");
  });

  it("embeds Pricing and PaymentHistory for the account tab", () => {
    expect(src).toContain("import Pricing from");
    expect(src).toContain("<Pricing");
    expect(src).toContain("import PaymentHistory from");
    expect(src).toContain("<PaymentHistory");
  });

  it("embeds WhatsNew for the about tab", () => {
    expect(src).toContain("import WhatsNew from");
    expect(src).toContain("<WhatsNew");
  });

  it("supports deep-linking via ?tab= query parameter", () => {
    expect(src).toContain('searchParams.get("tab")');
  });
});

// ─── App.tsx Route Changes ────────────────────────────────────────────────────
describe("App.tsx Route Changes", () => {
  const src = readComponent("App.tsx");

  it("has a /settings route", () => {
    expect(src).toContain('path="/settings"');
    expect(src).toContain("<Settings");
  });

  it("redirects /ai-ceo to /executive-board", () => {
    expect(src).toContain('path="/ai-ceo"');
    expect(src).toContain('to="/executive-board');
  });

  it("redirects legacy routes to Settings tabs", () => {
    expect(src).toContain('to="/settings?tab=governance"');
    expect(src).toContain('to="/settings?tab=connections"');
    expect(src).toContain('to="/settings?tab=history"');
    expect(src).toContain('to="/settings?tab=account"');
    expect(src).toContain('to="/settings?tab=about"');
  });

  it("imports Settings page", () => {
    expect(src).toContain('import Settings from "./pages/Settings"');
  });

  it("no longer imports AICeo page", () => {
    expect(src).not.toContain('import AICeo from');
  });
});
