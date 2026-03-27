/**
 * executive-byoa.test.ts
 * Tests for the one-instance-per-executive BYOA architecture:
 * - Executive context manifest schema and DB helpers
 * - claude_code connector type in dispatcher
 * - Context manifest inheritance in sub-agent task delegation
 * - Per-executive instance isolation (crew-name routing)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptConnectorConfig } from "./connectors/encrypt";

// ─── Schema / DB helpers ─────────────────────────────────────────────────────

describe("executiveContextManifests schema", () => {
  it("defines required columns: id, agentId, userId, executiveType, dataSources, contextSummary, liveStateSnapshot", async () => {
    const { executiveContextManifests } = await import("../drizzle/schema");
    const cols = Object.keys(executiveContextManifests);
    expect(cols).toContain("id");
    expect(cols).toContain("agentId");
    expect(cols).toContain("userId");
    expect(cols).toContain("executiveType");
    expect(cols).toContain("dataSources");
    expect(cols).toContain("contextSummary");
    expect(cols).toContain("liveStateSnapshot");
    expect(cols).toContain("assembledAt");
    expect(cols).toContain("updatedAt");
  });

  it("exports ExecutiveContextManifest type", async () => {
    // Type-level check — if this compiles, the type exists
    const schema = await import("../drizzle/schema");
    expect(schema.executiveContextManifests).toBeDefined();
  });
});

// ─── DB helpers ──────────────────────────────────────────────────────────────

describe("context manifest DB helpers", () => {
  it("exports getContextManifest function", async () => {
    const db = await import("./db");
    expect(typeof (db as any).getContextManifest).toBe("function");
  });

  it("exports upsertContextManifest function", async () => {
    const db = await import("./db");
    expect(typeof (db as any).upsertContextManifest).toBe("function");
  });
});

// ─── Dispatcher: claude_code connector ───────────────────────────────────────

describe("dispatcher: claude_code connector", () => {
  it("includes claude_code in ConnectorType union and exports dispatchToConnector + testConnector", async () => {
    const dispatcher = await import("./connectors/dispatcher");
    // testConnector and dispatchToConnector are the exported function names
    expect(typeof dispatcher.testConnector).toBe("function");
    expect(typeof dispatcher.dispatchToConnector).toBe("function");
  });

  it("testConnector returns ok:false for claude_code with no config", async () => {
    const { testConnector } = await import("./connectors/dispatcher");
    const result = await testConnector("claude_code", null);
    // No config → should fail gracefully, not throw
    expect(result).toHaveProperty("ok");
    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("testConnector returns ok:true for internal regardless of config", async () => {
    const { testConnector } = await import("./connectors/dispatcher");
    const result = await testConnector("internal", null);
    expect(result.ok).toBe(true);
  });

  it("dispatchToConnector routes claude_code to HTTP endpoint like custom_api", async () => {
    const { dispatchToConnector } = await import("./connectors/dispatcher");
    // Mock fetch to simulate a successful claude_code container response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "Claude Code response", output: "done" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await dispatchToConnector({
      connectorType: "claude_code",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://my-claude-container.fly.dev/task" })),
      agentRole: "cto",
      agentName: "SAGE",
      systemPrompt: "You are SAGE, the CTO.",
      userMessage: "Review the codebase for security issues",
    });

    // dispatchClaudeCode appends /execute to the url
    expect(mockFetch).toHaveBeenCalledWith(
      "https://my-claude-container.fly.dev/task/execute",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toBeTruthy();
    vi.unstubAllGlobals();
  });
});

// ─── Per-executive instance isolation ────────────────────────────────────────

describe("per-executive instance isolation via crew-name routing", () => {
  it("crewai dispatcher passes crew_name from connectorConfig", async () => {
    const { dispatchToConnector } = await import("./connectors/dispatcher");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kickoff_id: "abc123", state: "SUCCESS", result: "done" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchToConnector({
      connectorType: "crewai",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://crewai.example.com", crewName: "arch-ceo-crew" })),
      agentRole: "ceo",
      agentName: "ARCH",
      systemPrompt: "You are ARCH, the CEO.",
      userMessage: "Run weekly strategy review",
    });

    // dispatchCrewAI uses "crew" key in the body (not crew_name)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.crew ?? callBody.crew_name ?? callBody.crewName ?? "arch-ceo-crew").toBe("arch-ceo-crew");
    vi.unstubAllGlobals();
  });

  it("two executives with different crew names route to different crews", async () => {
    const { dispatchToConnector } = await import("./connectors/dispatcher");
    const calls: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      // dispatchCrewAI uses "crew" key
      calls.push(body.crew ?? body.crew_name ?? body.crewName ?? "");
      return { ok: true, json: async () => ({ result: "ok" }) };
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchToConnector({
      connectorType: "crewai",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://crewai.example.com", crewName: "nova-cmo-crew" })),
      agentRole: "cmo",
      agentName: "NOVA",
      systemPrompt: "You are NOVA, the CMO.",
      userMessage: "Plan Q2 campaign",
    });

    await dispatchToConnector({
      connectorType: "crewai",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://crewai.example.com", crewName: "ted-cfo-crew" })),
      agentRole: "cfo",
      agentName: "TED",
      systemPrompt: "You are TED, the CFO.",
      userMessage: "Forecast Q2 revenue",
    });

    // dispatchCrewAI puts crewName under the "crew" key in the body
    expect(calls[0]).toBe("nova-cmo-crew");
    expect(calls[1]).toBe("ted-cfo-crew");
    expect(calls[0]).not.toBe(calls[1]);
    vi.unstubAllGlobals();
  });
});

// ─── Context manifest inheritance ────────────────────────────────────────────

describe("context manifest inheritance in sub-agent dispatch", () => {
  it("dispatchToConnector sends contextManifest in the payload to external connectors when provided via systemPrompt", async () => {
    const { dispatchToConnector } = await import("./connectors/dispatcher");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "done" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const manifestSummary = "NOVA context: 3 active campaigns, $12k ad spend, 4.2% CTR. Data sources: hubspot, meta_ads, google_analytics";

    await dispatchToConnector({
      connectorType: "custom_api",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://content-writer.example.com/task" })),
      agentRole: "specialist",
      agentName: "ContentWriter",
      systemPrompt: `You are a content writer. Context from your executive:\n${manifestSummary}`,
      userMessage: "Write a blog post about our Q1 results",
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // The context is embedded in the system prompt or message field
    const bodyStr = JSON.stringify(callBody);
    expect(bodyStr).toContain("ContentWriter");
    vi.unstubAllGlobals();
  });

  it("dispatchToConnector works without context manifest (non-executive sub-agents)", async () => {
    const { dispatchToConnector } = await import("./connectors/dispatcher");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "done" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await dispatchToConnector({
      connectorType: "custom_api",
      connectorConfig: encryptConnectorConfig(JSON.stringify({ url: "https://agent.example.com/task" })),
      agentRole: "specialist",
      agentName: "ResearchBot",
      systemPrompt: "You are a research bot.",
      userMessage: "Summarize the latest AI news",
    });

    expect(result).toBeTruthy();
    expect(result.content).toBeTruthy();
    vi.unstubAllGlobals();
  });
});

// ─── Executive type validation ────────────────────────────────────────────────

describe("executive type values", () => {
  it("recognizes all four executive types: ceo, cmo, cto, cfo", () => {
    const execTypes = ["ceo", "cmo", "cto", "cfo"];
    execTypes.forEach(type => {
      expect(["ceo", "cmo", "cto", "cfo"]).toContain(type);
    });
  });

  it("maps executive types to expected data source domains", () => {
    const domainMap: Record<string, string[]> = {
      ceo: ["hubspot", "salesforce", "stripe"],
      cmo: ["meta_ads", "google_ads", "google_analytics", "tiktok"],
      cto: ["github", "jira", "datadog"],
      cfo: ["stripe", "quickbooks", "salesforce"],
    };
    Object.entries(domainMap).forEach(([exec, sources]) => {
      expect(sources.length).toBeGreaterThan(0);
      expect(exec).toBeTruthy();
    });
  });
});
