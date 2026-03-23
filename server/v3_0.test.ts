import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  // Existing mocks
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  // Integration Hub
  getAllToolCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "CRM", slug: "crm", description: "Customer Relationship Management", abstractActions: '["read_contacts","create_contact","read_pipeline"]' },
    { id: 2, name: "Email Marketing", slug: "email_marketing", description: "Email campaigns", abstractActions: '["send_campaign","list_subscribers"]' },
  ]),
  getAllToolProviders: vi.fn().mockResolvedValue([
    { id: 1, name: "HubSpot", slug: "hubspot", categoryId: 1, authType: "oauth2", description: "CRM platform" },
    { id: 2, name: "Mailchimp", slug: "mailchimp", categoryId: 2, authType: "api_key", description: "Email marketing" },
  ]),
  getUserConnectionsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, providerId: 1, categoryId: 1, status: "connected", accountName: "My HubSpot" },
  ]),
  createToolConnection: vi.fn().mockResolvedValue([{ insertId: 10 }]),
  disconnectToolConnection: vi.fn().mockResolvedValue(undefined),
  createUserConnection: vi.fn().mockResolvedValue(undefined),
  disconnectUserConnection: vi.fn().mockResolvedValue(undefined),
  seedToolCategories: vi.fn().mockResolvedValue([{ id: 1, slug: "crm" }, { id: 2, slug: "email_marketing" }]),
  seedToolProviders: vi.fn().mockResolvedValue(undefined),
  getContextObjectsByUserId: vi.fn().mockResolvedValue([]),
  getToolCategoryBySlug: vi.fn().mockResolvedValue({ id: 1, name: "CRM", slug: "crm" }),
  getUserConnectionsByCategory: vi.fn().mockResolvedValue([
    { id: 1, providerId: 1, status: "connected" },
  ]),
  seedDefaultCategories: vi.fn().mockResolvedValue(undefined),
  // Context Engine
  createContextObject: vi.fn().mockResolvedValue([{ insertId: 5 }]),
  getContextObjectById: vi.fn().mockResolvedValue({
    id: 5, userId: 1, rawRequest: "Grow email list", status: "interpreted",
    inferredCategories: '["email_marketing","crm"]', confidence: 0.85,
  }),
  updateContextObject: vi.fn().mockResolvedValue(undefined),
  // Compatibility
  getRequiredCategoriesByAgentId: vi.fn().mockResolvedValue([{ categoryId: 1 }, { categoryId: 2 }]),
  getRequiredCategoriesByBlueprintId: vi.fn().mockResolvedValue([{ categoryId: 1 }]),
  getRequiredCategoriesByListingId: vi.fn().mockResolvedValue([{ categoryId: 1 }, { categoryId: 3 }]),
  checkUserCompatibility: vi.fn().mockImplementation(async (userId: number, requiredIds: number[]) => {
    const connected = [1]; // mock: user has category 1 connected
    const missing = requiredIds.filter((id: number) => !connected.includes(id));
    return { compatible: missing.length === 0, connected, missing, requiredCategories: requiredIds };
  }),
  // Other existing mocks
  getAgentsByUserId: vi.fn().mockResolvedValue([]),
  getOkrsByUserId: vi.fn().mockResolvedValue([]),
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getPooReceiptsByUserId: vi.fn().mockResolvedValue([]),
  getInboxByUserId: vi.fn().mockResolvedValue([]),
  getDecisionLogByUserId: vi.fn().mockResolvedValue([]),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  getBlueprintsByUserId: vi.fn().mockResolvedValue([]),
  getCompanyById: vi.fn().mockResolvedValue(null),
  getCompaniesByUserId: vi.fn().mockResolvedValue([]),
  getDepartmentsByCompanyId: vi.fn().mockResolvedValue([]),
  getHeartbeatsByCompanyId: vi.fn().mockResolvedValue([]),
  getBudgetsByCompanyId: vi.fn().mockResolvedValue([]),
  getApprovalGatesByUserId: vi.fn().mockResolvedValue([]),
  getAuditLogByUserId: vi.fn().mockResolvedValue([]),
  getToolsByUserId: vi.fn().mockResolvedValue([]),
  getWebhooksByUserId: vi.fn().mockResolvedValue([]),
  getSkillsByUserId: vi.fn().mockResolvedValue([]),
  getPooSummary: vi.fn().mockResolvedValue({ totalReceipts: 0, totalValueCreated: 0, totalHoursSaved: 0 }),
  createAgent: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createOkr: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createTask: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createPooReceipt: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createInboxItem: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createDecisionLogEntry: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createBlueprint: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createCompany: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createDepartment: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createHeartbeat: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createBudget: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createApprovalGate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createTool: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createWebhook: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  createSkill: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateInboxItemStatus: vi.fn().mockResolvedValue(undefined),
  updateAgentStatus: vi.fn().mockResolvedValue(undefined),
  getTaskById: vi.fn().mockResolvedValue({ id: 1, title: "Test", status: "pending", userId: 1 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deployBlueprint: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  getMarketplaceLeaderboard: vi.fn().mockResolvedValue([]),
  seedDefaultAgents: vi.fn().mockResolvedValue(undefined),
  seedDefaultOkrs: vi.fn().mockResolvedValue(undefined),
  hasWelcomeEmailBeenSent: vi.fn().mockResolvedValue(false),
  markWelcomeEmailSent: vi.fn().mockResolvedValue(undefined),
  getChangelogEntries: vi.fn().mockResolvedValue([]),
  seedChangelogIfEmpty: vi.fn().mockResolvedValue(undefined),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      inferredCategories: ["email_marketing", "crm"],
      confidence: 0.85,
      reasoning: "User wants to grow email list which requires email marketing and CRM tools",
    }) } }],
  }),
}));

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-user", email: "test@example.com", name: "Test User",
      loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Integration Hub Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  beforeEach(() => { caller = appRouter.createCaller(createTestContext()); });

  it("lists all tool categories", async () => {
    const result = await caller.hub.categories();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("CRM");
  });

  it("lists all tool providers", async () => {
    const result = await caller.hub.providers();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("HubSpot");
  });

  it("lists user connections", async () => {
    const result = await caller.hub.connections();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("connected");
  });

  it("connects a new tool", async () => {
    const result = await caller.hub.connect({
      providerId: 2,
      categoryId: 2,
      accountName: "My Mailchimp",
    });
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("disconnects a tool", async () => {
    const result = await caller.hub.disconnect({ connectionId: 1 });
    expect(result).toEqual({ success: true });
  });

  it("seeds default categories and providers", async () => {
    const result = await caller.hub.seedDefaults();
    expect(result).toEqual({ success: true });
  });
});

describe("Context Engine Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  beforeEach(() => { caller = appRouter.createCaller(createTestContext()); });

  it("interprets a user request and creates a context object", async () => {
    const result = await caller.context.interpret({ requestText: "I want to grow my email list by 50%" });
    expect(result).toHaveProperty("contextId");
    expect(result).toHaveProperty("inferredCategories");
    expect(result).toHaveProperty("confidence");
  });

  it("gathers context from connected tools", async () => {
    const result = await caller.context.gather({ contextId: 5 });
    expect(result).toHaveProperty("liveState");
    expect(result).toHaveProperty("success");
  });

  it("contextualizes with enriched parameters", async () => {
    const result = await caller.context.contextualize({ contextId: 5 });
    expect(result).toHaveProperty("inferredCategories");
    expect(result).toHaveProperty("status");
  });
});

describe("Compatibility Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  beforeEach(() => { caller = appRouter.createCaller(createTestContext()); });

  it("checks agent compatibility", async () => {
    const result = await caller.compatibility.checkForAgent({ agentId: 1 });
    expect(result).toHaveProperty("compatible");
    expect(result).toHaveProperty("requiredCategories");
    expect(result).toHaveProperty("connected");
    expect(result).toHaveProperty("missing");
  });

  it("checks blueprint compatibility", async () => {
    const result = await caller.compatibility.checkForBlueprint({ blueprintId: 1 });
    expect(result).toHaveProperty("compatible");
    expect(result).toHaveProperty("requiredCategories");
  });

  it("checks listing compatibility", async () => {
    const result = await caller.compatibility.checkForListing({ listingId: 1 });
    expect(result).toHaveProperty("compatible");
    expect(result).toHaveProperty("missing");
  });
});
