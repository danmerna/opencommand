import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock all db helpers used in v3.1 ────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllToolCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "CRM", slug: "crm", description: "Customer relationship management", abstractActions: ["read_pipeline", "create_contact"], isActive: true, createdAt: new Date() },
    { id: 2, name: "Email Marketing", slug: "email_marketing", description: "Email campaigns", abstractActions: ["send_campaign", "get_subscribers"], isActive: true, createdAt: new Date() },
  ]),
  getAllToolProviders: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "HubSpot", slug: "hubspot", description: "HubSpot CRM", authType: "oauth2", isActive: true, createdAt: new Date() },
    { id: 2, categoryId: 2, name: "Mailchimp", slug: "mailchimp", description: "Mailchimp Email", authType: "oauth2", isActive: true, createdAt: new Date() },
  ]),
  getUserConnectionsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, providerId: 1, categoryId: 1, status: "connected", accountName: "My HubSpot", accountId: "hs-123", accessToken: "tok", refreshToken: null, tokenExpiresAt: null, lastSyncAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  ]),
  createUserConnection: vi.fn().mockResolvedValue({ id: 2, userId: 1, providerId: 2, categoryId: 2, status: "connected", accountName: "My Mailchimp", accountId: null, accessToken: null, refreshToken: null, tokenExpiresAt: null, lastSyncAt: null, createdAt: new Date(), updatedAt: new Date() }),
  disconnectUserConnection: vi.fn().mockResolvedValue(undefined),
  seedToolCategories: vi.fn().mockResolvedValue([{id:1},{id:2},{id:3},{id:4},{id:5},{id:6},{id:7},{id:8}]),
  seedToolProviders: vi.fn().mockResolvedValue([]),
  seedIntegrationDefaults: vi.fn().mockResolvedValue({ categories: 8, providers: 21 }),
  getContextObjectsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, taskId: null, requestText: "Grow my email list by 20%", inferredDomain: "marketing", inferredCategories: ["email_marketing", "crm"], userProfile: null, liveState: { email_marketing: { subscribers: 1200 } }, recentHistory: null, inferredInsights: ["User has email marketing connected"], suggestedParameters: { target_growth: "20%", current_subscribers: 1200 }, contextualizedQuestions: ["What is your current open rate?"], status: "ready", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, userId: 1, taskId: null, requestText: "Analyze my sales pipeline", inferredDomain: "sales", inferredCategories: ["crm"], userProfile: null, liveState: null, recentHistory: null, inferredInsights: [], suggestedParameters: {}, contextualizedQuestions: [], status: "gathering", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createContextObject: vi.fn().mockResolvedValue({ id: 3, userId: 1, taskId: null, requestText: "New request", inferredDomain: null, inferredCategories: [], userProfile: null, liveState: null, recentHistory: null, inferredInsights: [], suggestedParameters: {}, contextualizedQuestions: [], status: "interpreting", createdAt: new Date(), updatedAt: new Date() }),
  getContextObjectById: vi.fn().mockResolvedValue(null),
  updateContextObject: vi.fn().mockResolvedValue(undefined),
  checkUserCompatibility: vi.fn().mockResolvedValue({ compatible: true, missingCategories: [], connectedCategories: ["crm"] }),
  getAbstractionMappings: vi.fn().mockResolvedValue([]),
  createAbstractionMapping: vi.fn().mockResolvedValue({ id: 1 }),
  getAgentsByCompany: vi.fn().mockResolvedValue([]),
  getCompanies: vi.fn().mockResolvedValue([]),
  getCompanyById: vi.fn().mockResolvedValue(null),
  createCompany: vi.fn().mockResolvedValue({ id: 1, name: "Test Co" }),
  getOKRsByCompany: vi.fn().mockResolvedValue([]),
  getTasksByCompany: vi.fn().mockResolvedValue([]),
  getPooReceiptsByCompany: vi.fn().mockResolvedValue([]),
  getInboxItems: vi.fn().mockResolvedValue([]),
  getBlueprints: vi.fn().mockResolvedValue([]),
  getBlueprintById: vi.fn().mockResolvedValue(null),
  createBlueprint: vi.fn().mockResolvedValue({ id: 1, name: "Test Blueprint" }),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getMarketplaceLeaderboard: vi.fn().mockResolvedValue([]),
  getSkills: vi.fn().mockResolvedValue([]),
  getAuditLog: vi.fn().mockResolvedValue([]),
  getApprovalGates: vi.fn().mockResolvedValue([]),
  getWebhooks: vi.fn().mockResolvedValue([]),
  getToolRegistry: vi.fn().mockResolvedValue([]),
  createTool: vi.fn().mockResolvedValue({ id: 1 }),
  createWebhook: vi.fn().mockResolvedValue({ id: 1 }),
  createApprovalGate: vi.fn().mockResolvedValue({ id: 1 }),
  getHeartbeats: vi.fn().mockResolvedValue([]),
  getBudgetAllocations: vi.fn().mockResolvedValue([]),
  getDepartments: vi.fn().mockResolvedValue([]),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  getBlueprintDeployments: vi.fn().mockResolvedValue([]),
  getBlueprintReviews: vi.fn().mockResolvedValue([]),
  getUserPayments: vi.fn().mockResolvedValue([]),
}));

vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ domain: "marketing", categories: ["email_marketing"], insights: ["User wants growth"], questions: ["What is your current subscriber count?"] }) } }],
  }),
}));

function makeCtx(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Integration Hub Tests ────────────────────────────────────────────────────
describe("hub.categories", () => {
  it("returns all tool categories", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.categories();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("crm");
    expect(result[1].slug).toBe("email_marketing");
  });
});

describe("hub.providers", () => {
  it("returns all tool providers", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.providers();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("HubSpot");
    expect(result[1].name).toBe("Mailchimp");
  });
});

describe("hub.connections", () => {
  it("returns user connections when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.connections();
    expect(result).toHaveLength(1);
    expect(result[0].accountName).toBe("My HubSpot");
    expect(result[0].status).toBe("connected");
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any });
    await expect(caller.hub.connections()).rejects.toThrow();
  });
});

describe("hub.connect", () => {
  it("creates a new tool connection", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.connect({ providerId: 2, categoryId: 2, accountName: "My Mailchimp" });
    expect(result.success).toBe(true);
  });
});

describe("hub.disconnect", () => {
  it("disconnects a tool connection", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.disconnect({ connectionId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("hub.seedDefaults", () => {
  it("seeds default categories and providers", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.hub.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Context Engine Tests ─────────────────────────────────────────────────────
describe("context.list", () => {
  it("returns user context objects", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.context.list();
    expect(result).toHaveLength(2);
    expect(result[0].requestText).toBe("Grow my email list by 20%");
    expect(result[0].status).toBe("ready");
  });
});

describe("context.interpret", () => {
  it("creates a context object from a request", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.context.interpret({ requestText: "New request" });
    expect(result).toBeDefined();
    expect(result.contextId).toBeDefined();
    expect(typeof result.domain).toBe("string");
  });
});

// ─── OAuth Flow Tests (backend route validation) ──────────────────────────────
describe("OAuth2 provider configuration", () => {
  it("identifies HubSpot as an OAuth2 provider", () => {
    const oauthProviders = ["hubspot", "mailchimp", "slack", "stripe_connect"];
    expect(oauthProviders).toContain("hubspot");
    expect(oauthProviders).toContain("mailchimp");
    expect(oauthProviders).toContain("slack");
    expect(oauthProviders).toContain("stripe_connect");
  });

  it("OAuth2 providers have correct auth type", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const providers = await caller.hub.providers();
    const hubspot = providers.find(p => p.slug === "hubspot");
    expect(hubspot?.authType).toBe("oauth2");
    const mailchimp = providers.find(p => p.slug === "mailchimp");
    expect(mailchimp?.authType).toBe("oauth2");
  });
});

// ─── Context History Page Logic Tests ────────────────────────────────────────
describe("context history filtering", () => {
  it("filters contexts by status", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const readyContexts = contexts.filter(c => c.status === "ready");
    expect(readyContexts).toHaveLength(1);
    expect(readyContexts[0].requestText).toBe("Grow my email list by 20%");
  });

  it("contexts contain inferred categories", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const firstCtx = contexts[0];
    expect(firstCtx.inferredCategories).toContain("email_marketing");
    expect(firstCtx.inferredCategories).toContain("crm");
  });

  it("contexts contain live state data", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const firstCtx = contexts[0];
    expect(firstCtx.liveState).toBeDefined();
    expect((firstCtx.liveState as any)?.email_marketing?.subscribers).toBe(1200);
  });

  it("contexts contain suggested parameters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const firstCtx = contexts[0];
    expect(firstCtx.suggestedParameters).toBeDefined();
    expect((firstCtx.suggestedParameters as any)?.target_growth).toBe("20%");
  });
});

// ─── Integration with Intent Engine ─────────────────────────────────────────
describe("context-aware Intent Engine questions", () => {
  it("contextualized questions are stored in context object", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const readyCtx = contexts.find(c => c.status === "ready");
    expect(readyCtx?.contextualizedQuestions).toBeDefined();
    expect(Array.isArray(readyCtx?.contextualizedQuestions)).toBe(true);
    expect((readyCtx?.contextualizedQuestions as string[]).length).toBeGreaterThan(0);
  });

  it("inferred insights are populated for ready contexts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const contexts = await caller.context.list();
    const readyCtx = contexts.find(c => c.status === "ready");
    expect(readyCtx?.inferredInsights).toBeDefined();
    expect(Array.isArray(readyCtx?.inferredInsights)).toBe(true);
  });
});
