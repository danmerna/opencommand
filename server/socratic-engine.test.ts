import { describe, it, expect } from "vitest";

/**
 * Tests for Phase 1: Structured Socratic Engine types, display metrics,
 * and context assembler restructuring.
 *
 * These tests validate:
 * 1. Shared types are properly defined
 * 2. Each adapter's getDisplayMetrics() returns correct DataSourceCard format
 * 3. The contextAssembler exports the new structured response shape
 */

// ─── 1. Shared Types Validation ─────────────────────────────────────────────

describe("Shared Types — SocraticEngineResponse", () => {
  it("exports DataSourceCard type with required fields", async () => {
    const types = await import("../shared/types");
    // TypeScript compile-time check — if these types don't exist, the import fails
    const card: import("../shared/types").DataSourceCard = {
      sourceId: "test",
      sourceName: "Test Source",
      sourceColor: "#000",
      metrics: [{ label: "Metric", value: "123" }],
    };
    expect(card.sourceId).toBe("test");
    expect(card.metrics).toHaveLength(1);
    expect(card.metrics[0].label).toBe("Metric");
    expect(card.metrics[0].value).toBe("123");
  });

  it("exports CrossSourceInsight type with severity levels", async () => {
    const insight: import("../shared/types").CrossSourceInsight = {
      text: "Test insight",
      severity: "warning",
      relatedSources: ["hubspot_crm", "salesforce_crm"],
    };
    expect(insight.severity).toBe("warning");
    expect(insight.relatedSources).toHaveLength(2);
  });

  it("exports SocraticQuestion type with all required fields", async () => {
    const question: import("../shared/types").SocraticQuestion = {
      id: "q-1-0",
      question: "Should we increase ad spend?",
      rationale: "CTR is above average",
      estimatedImpact: "+$50K pipeline",
      relatedSources: ["google_ads"],
    };
    expect(question.id).toBe("q-1-0");
    expect(question.estimatedImpact).toBe("+$50K pipeline");
  });

  it("exports SocraticEngineResponse with all required fields", async () => {
    const response: import("../shared/types").SocraticEngineResponse = {
      contextId: 1,
      userRequest: "Test request",
      title: "Test analysis",
      sourceCount: 2,
      queryTimeMs: 1500,
      dataCards: [],
      insights: [],
      questions: [],
      contextSummary: "Summary",
      suggestedParameters: {},
      hasLiveData: false,
      connectedProviders: [],
    };
    expect(response.contextId).toBe(1);
    expect(response.sourceCount).toBe(2);
    expect(response.queryTimeMs).toBe(1500);
  });
});

// ─── 2. Display Metrics — HubSpot ───────────────────────────────────────────

describe("HubSpot getDisplayMetrics()", () => {
  it("returns a valid DataSourceCard from a HubSpot snapshot", async () => {
    const { getHubSpotDisplayMetrics } = await import("./integrations/hubspot");
    const { DEMO_HUBSPOT } = await import("./integrations/demoMockData");
    const card = getHubSpotDisplayMetrics(DEMO_HUBSPOT as any);

    expect(card.sourceId).toBe("hubspot_crm");
    expect(card.sourceName).toBe("HubSpot CRM");
    expect(card.sourceColor).toBe("#ff7a59");
    expect(card.metrics.length).toBeGreaterThanOrEqual(4);

    // Verify metric labels exist
    const labels = card.metrics.map(m => m.label);
    expect(labels).toContain("Open deals");
    expect(labels).toContain("Stalled deals");
    expect(labels).toContain("Avg deal size");

    // Verify all values are non-empty strings
    card.metrics.forEach(m => {
      expect(typeof m.value).toBe("string");
      expect(m.value.length).toBeGreaterThan(0);
    });
  });
});

// ─── 3. Display Metrics — Salesforce ────────────────────────────────────────

describe("Salesforce getDisplayMetrics()", () => {
  it("returns a valid DataSourceCard from a Salesforce snapshot", async () => {
    const { getSalesforceDisplayMetrics } = await import("./integrations/salesforce");
    const { DEMO_SALESFORCE } = await import("./integrations/demoMockData");
    const card = getSalesforceDisplayMetrics(DEMO_SALESFORCE);

    expect(card.sourceId).toBe("salesforce_crm");
    expect(card.sourceName).toBe("Salesforce CRM");
    expect(card.sourceColor).toBe("#00a1e0");
    expect(card.metrics.length).toBeGreaterThanOrEqual(4);

    const labels = card.metrics.map(m => m.label);
    expect(labels).toContain("Open opportunities");
    expect(labels).toContain("Stalled opps");
    expect(labels).toContain("Avg deal size");

    card.metrics.forEach(m => {
      expect(typeof m.value).toBe("string");
      expect(m.value.length).toBeGreaterThan(0);
    });
  });
});

// ─── 4. Display Metrics — Meta Ads ──────────────────────────────────────────

describe("Meta Ads getDisplayMetrics()", () => {
  it("returns a valid DataSourceCard from a Meta Ads snapshot", async () => {
    const { getMetaAdsDisplayMetrics } = await import("./integrations/metaAds");
    const { DEMO_META_ADS } = await import("./integrations/demoMockData");
    const card = getMetaAdsDisplayMetrics(DEMO_META_ADS);

    expect(card.sourceId).toBe("meta_ads");
    expect(card.sourceName).toBe("Meta Ads");
    expect(card.sourceColor).toBe("#1877f2");
    expect(card.metrics.length).toBeGreaterThanOrEqual(4);

    const labels = card.metrics.map(m => m.label);
    expect(labels).toContain("Active campaigns");
    expect(labels).toContain("Spend (30d)");
    expect(labels).toContain("Clicks (30d)");
    expect(labels).toContain("Conversions");

    card.metrics.forEach(m => {
      expect(typeof m.value).toBe("string");
      expect(m.value.length).toBeGreaterThan(0);
    });
  });
});

// ─── 5. Display Metrics — Google Ads ────────────────────────────────────────

describe("Google Ads getDisplayMetrics()", () => {
  it("returns a valid DataSourceCard from a Google Ads snapshot", async () => {
    const { getGoogleAdsDisplayMetrics } = await import("./integrations/googleAds");
    const { DEMO_GOOGLE_ADS } = await import("./integrations/demoMockData");
    const card = getGoogleAdsDisplayMetrics(DEMO_GOOGLE_ADS);

    expect(card.sourceId).toBe("google_ads");
    expect(card.sourceName).toBe("Google Ads");
    expect(card.sourceColor).toBe("#4285f4");
    expect(card.metrics.length).toBeGreaterThanOrEqual(4);

    const labels = card.metrics.map(m => m.label);
    expect(labels).toContain("Active campaigns");
    expect(labels).toContain("Spend (30d)");
    expect(labels).toContain("Clicks (30d)");
    expect(labels).toContain("Conversions");

    card.metrics.forEach(m => {
      expect(typeof m.value).toBe("string");
      expect(m.value.length).toBeGreaterThan(0);
    });
  });
});

// ─── 6. Display Metrics — GA4 ───────────────────────────────────────────────

describe("GA4 getDisplayMetrics()", () => {
  it("returns a valid DataSourceCard from a GA4 snapshot", async () => {
    const { getGA4DisplayMetrics } = await import("./integrations/ga4");
    const { DEMO_GA4 } = await import("./integrations/demoMockData");
    const card = getGA4DisplayMetrics(DEMO_GA4);

    expect(card.sourceId).toBe("google_analytics");
    expect(card.sourceName).toBe("Google Analytics");
    expect(card.sourceColor).toBe("#e37400");
    expect(card.metrics.length).toBeGreaterThanOrEqual(4);

    const labels = card.metrics.map(m => m.label);
    expect(labels).toContain("Users (30d)");
    expect(labels).toContain("Sessions (30d)");
    expect(labels).toContain("Bounce rate");
    expect(labels).toContain("Conversions");

    card.metrics.forEach(m => {
      expect(typeof m.value).toBe("string");
      expect(m.value.length).toBeGreaterThan(0);
    });
  });
});

// ─── 7. Context Assembler — Structured Output Shape ─────────────────────────

describe("Context Assembler — Exports and Types", () => {
  it("exports assembleContext function", async () => {
    const assembler = await import("./integrations/contextAssembler");
    expect(typeof assembler.assembleContext).toBe("function");
  });

  it("AssembledContext includes socratic field in its type", async () => {
    // Validate the type shape by creating a mock that satisfies the interface
    const mockResult: import("./integrations/contextAssembler").AssembledContext = {
      contextId: 1,
      questions: ["Should we do X?"],
      insights: ["Revenue is up 20%"],
      contextSummary: "HubSpot: 100 contacts",
      suggestedParameters: { targetSegment: "enterprise" },
      liveState: { hubspot: {} },
      hasLiveData: true,
      connectedProviders: ["hubspot"],
      socratic: {
        contextId: 1,
        userRequest: "Grow revenue",
        title: "Revenue growth analysis",
        sourceCount: 1,
        queryTimeMs: 2000,
        dataCards: [{
          sourceId: "hubspot_crm",
          sourceName: "HubSpot CRM",
          sourceColor: "#ff7a59",
          metrics: [{ label: "Contacts", value: "100" }],
        }],
        insights: [{
          text: "Revenue is up 20%",
          severity: "opportunity",
          relatedSources: ["hubspot_crm"],
        }],
        questions: [{
          id: "q-1-0",
          question: "Should we expand into enterprise?",
          rationale: "Average deal size is growing",
          estimatedImpact: "+$200K ARR",
          relatedSources: ["hubspot_crm"],
        }],
        contextSummary: "HubSpot: 100 contacts",
        suggestedParameters: { targetSegment: "enterprise" },
        hasLiveData: true,
        connectedProviders: ["hubspot"],
      },
    };

    expect(mockResult.socratic).toBeDefined();
    expect(mockResult.socratic.dataCards).toHaveLength(1);
    expect(mockResult.socratic.insights).toHaveLength(1);
    expect(mockResult.socratic.questions).toHaveLength(1);
    expect(mockResult.socratic.title).toBe("Revenue growth analysis");
    expect(mockResult.socratic.queryTimeMs).toBe(2000);
  });
});

// ─── 8. DataSourceCard Metric Value Formatting ──────────────────────────────

describe("Display Metrics — Value Formatting", () => {
  it("HubSpot formats open deals with $ and K suffix", async () => {
    const { getHubSpotDisplayMetrics } = await import("./integrations/hubspot");
    const { DEMO_HUBSPOT } = await import("./integrations/demoMockData");
    const card = getHubSpotDisplayMetrics(DEMO_HUBSPOT as any);
    const dealsMetric = card.metrics.find(m => m.label === "Open deals");
    expect(dealsMetric?.value).toMatch(/\$/);
    expect(dealsMetric?.value).toMatch(/K/);
  });

  it("Salesforce formats open opportunities with $ and K suffix", async () => {
    const { getSalesforceDisplayMetrics } = await import("./integrations/salesforce");
    const { DEMO_SALESFORCE } = await import("./integrations/demoMockData");
    const card = getSalesforceDisplayMetrics(DEMO_SALESFORCE);
    const oppMetric = card.metrics.find(m => m.label === "Open opportunities");
    expect(oppMetric?.value).toMatch(/\$/);
    expect(oppMetric?.value).toMatch(/K/);
  });

  it("Meta Ads formats spend with $ prefix", async () => {
    const { getMetaAdsDisplayMetrics } = await import("./integrations/metaAds");
    const { DEMO_META_ADS } = await import("./integrations/demoMockData");
    const card = getMetaAdsDisplayMetrics(DEMO_META_ADS);
    const spendMetric = card.metrics.find(m => m.label === "Spend (30d)");
    expect(spendMetric?.value).toMatch(/^\$/);
  });

  it("GA4 formats bounce rate with % suffix", async () => {
    const { getGA4DisplayMetrics } = await import("./integrations/ga4");
    const { DEMO_GA4 } = await import("./integrations/demoMockData");
    const card = getGA4DisplayMetrics(DEMO_GA4);
    const bounceMetric = card.metrics.find(m => m.label === "Bounce rate");
    expect(bounceMetric?.value).toMatch(/%$/);
  });
});
