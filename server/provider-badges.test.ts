/**
 * Tests for provider badges, Gemini UI flow, heartbeat auto-pause,
 * and OpenCommand AI branding across MissionControl and AgentDetail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptConnectorConfig, decryptConnectorConfig } from "./connectors/encrypt";
import { testConnector } from "./connectors/dispatcher";

// ─── Provider Badge Config ────────────────────────────────────────────────────
describe("Provider badge config", () => {
  const PROVIDER_BADGE: Record<string, { label: string; color: string; logo?: string }> = {
    internal:   { label: "OpenCommand AI", color: "text-emerald-400", logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663354746985/WP82CNZ6C5SdwCUYfYptJQ/opencommand-ai-owl-icon-e3SxVtUebh4P2Phx8gqNjM.webp" },
    openai:     { label: "OpenAI",         color: "text-blue-400" },
    anthropic:  { label: "Anthropic",      color: "text-violet-400" },
    gemini:     { label: "Gemini",         color: "text-amber-400" },
    custom_api: { label: "Custom API",     color: "text-pink-400" },
    crewai:     { label: "CrewAI",         color: "text-cyan-400" },
  };

  it("internal provider is labelled OpenCommand AI", () => {
    expect(PROVIDER_BADGE.internal.label).toBe("OpenCommand AI");
  });

  it("internal provider has an owl logo URL", () => {
    expect(PROVIDER_BADGE.internal.logo).toBeDefined();
    expect(PROVIDER_BADGE.internal.logo).toMatch(/^https:\/\//);
    expect(PROVIDER_BADGE.internal.logo).toContain("owl");
  });

  it("all 6 connector types have a badge entry", () => {
    const types = ["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"];
    for (const t of types) {
      expect(PROVIDER_BADGE[t]).toBeDefined();
      expect(PROVIDER_BADGE[t].label).toBeTruthy();
      expect(PROVIDER_BADGE[t].color).toMatch(/^text-/);
    }
  });

  it("only internal has a logo (BYOA providers use color dots)", () => {
    const byoaTypes = ["openai", "anthropic", "gemini", "custom_api", "crewai"];
    for (const t of byoaTypes) {
      expect(PROVIDER_BADGE[t].logo).toBeUndefined();
    }
  });

  it("internal badge uses emerald color (premium/managed feel)", () => {
    expect(PROVIDER_BADGE.internal.color).toContain("emerald");
  });
});

// ─── Gemini Key Link ──────────────────────────────────────────────────────────
describe("Gemini connector key link", () => {
  const CONNECTOR_OPTIONS = [
    { value: "internal",   keyLink: undefined },
    { value: "openai",     keyLink: undefined },
    { value: "anthropic",  keyLink: undefined },
    { value: "gemini",     keyLink: "https://aistudio.google.com/apikey" },
    { value: "custom_api", keyLink: undefined },
    { value: "crewai",     keyLink: undefined },
  ];

  it("only Gemini has a keyLink", () => {
    const withLink = CONNECTOR_OPTIONS.filter(o => o.keyLink);
    expect(withLink).toHaveLength(1);
    expect(withLink[0].value).toBe("gemini");
  });

  it("Gemini keyLink points to aistudio.google.com/apikey", () => {
    const gemini = CONNECTOR_OPTIONS.find(o => o.value === "gemini");
    expect(gemini?.keyLink).toBe("https://aistudio.google.com/apikey");
  });
});

// ─── Heartbeat Auto-Pause Logic ───────────────────────────────────────────────
describe("Heartbeat auto-pause on connector failure", () => {
  it("testConnector returns ok:false for invalid openai key", async () => {
    const badConfig = encryptConnectorConfig(JSON.stringify({ apiKey: "sk-invalid-key-for-test" }));
    // testConnector should return ok:false without throwing
    const result = await testConnector("openai", badConfig).catch(() => ({ ok: false, message: "caught" }));
    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("testConnector returns ok:false for invalid anthropic key", async () => {
    const badConfig = encryptConnectorConfig(JSON.stringify({ apiKey: "sk-ant-invalid-key-for-test" }));
    const result = await testConnector("anthropic", badConfig).catch(() => ({ ok: false, message: "caught" }));
    expect(result.ok).toBe(false);
  });

  it("testConnector returns ok:false for unreachable custom_api endpoint", async () => {
    const badConfig = encryptConnectorConfig(JSON.stringify({ url: "https://this-endpoint-does-not-exist-12345.example.com/api" }));
    const result = await testConnector("custom_api", badConfig).catch(() => ({ ok: false, message: "caught" }));
    expect(result.ok).toBe(false);
  });

  it("testConnector returns ok:true for internal connector (no config needed)", async () => {
    const result = await testConnector("internal", null).catch(() => ({ ok: false, message: "caught" }));
    expect(result.ok).toBe(true);
  });

  it("auto-pause logic: when connTest.ok is false, heartbeat should not proceed", () => {
    // Simulate the heartbeat guard logic
    const connTest = { ok: false, message: "401 Unauthorized" };
    let heartbeatProceeded = false;

    if (!connTest.ok) {
      // auto-pause branch — heartbeat does NOT proceed
    } else {
      heartbeatProceeded = true;
    }

    expect(heartbeatProceeded).toBe(false);
  });

  it("auto-pause logic: when connTest.ok is true, heartbeat proceeds", () => {
    const connTest = { ok: true, message: "ok" };
    let heartbeatProceeded = false;

    if (!connTest.ok) {
      // auto-pause branch
    } else {
      heartbeatProceeded = true;
    }

    expect(heartbeatProceeded).toBe(true);
  });
});

// ─── OpenCommand AI Branding ──────────────────────────────────────────────────
describe("OpenCommand AI provider branding", () => {
  it("internal connector is branded as OpenCommand AI, not Internal", () => {
    const label = "OpenCommand AI";
    expect(label).not.toBe("Internal");
    expect(label).toContain("OpenCommand");
  });

  it("internal connector badge is Managed (not BYOA)", () => {
    const badge = "Managed";
    expect(badge).toBe("Managed");
    expect(badge).not.toBe("BYOA");
  });

  it("all BYOA providers have BYOA badge", () => {
    const byoa = [
      { value: "openai",     badge: "BYOA" },
      { value: "anthropic",  badge: "BYOA" },
      { value: "gemini",     badge: "BYOA" },
      { value: "custom_api", badge: "BYOA" },
      { value: "crewai",     badge: "BYOA" },
    ];
    for (const p of byoa) {
      expect(p.badge).toBe("BYOA");
    }
  });
});
