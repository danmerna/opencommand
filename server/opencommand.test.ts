import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAgentsByUserId: vi.fn().mockResolvedValue([]),
  getAgentById: vi.fn().mockResolvedValue(null),
  getAgentsByCompanyId: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn().mockResolvedValue({ id: 1 }),
  updateAgentStatus: vi.fn().mockResolvedValue(undefined),
  updateAgent: vi.fn().mockResolvedValue(undefined),
  getOkrsByUserId: vi.fn().mockResolvedValue([]),
  createOkr: vi.fn().mockResolvedValue({ id: 1 }),
  updateOkrProgress: vi.fn().mockResolvedValue(undefined),
  deleteOkr: vi.fn().mockResolvedValue(undefined),
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getTaskById: vi.fn().mockResolvedValue(null),
  createTask: vi.fn().mockResolvedValue({ id: 1 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  getPooReceiptsByUserId: vi.fn().mockResolvedValue([]),
  createPooReceipt: vi.fn().mockResolvedValue({ id: 1 }),
  getPooSummaryByUserId: vi.fn().mockResolvedValue({ totalValue: "0", totalHours: "0", totalReceipts: 0 }),
  getInboxItemsByUserId: vi.fn().mockResolvedValue([]),
  createInboxItem: vi.fn().mockResolvedValue({ id: 1 }),
  resolveInboxItem: vi.fn().mockResolvedValue(undefined),
  dismissInboxItem: vi.fn().mockResolvedValue(undefined),
  markInboxItemRead: vi.fn().mockResolvedValue(undefined),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getMarketplaceListingById: vi.fn().mockResolvedValue(null),
  createMarketplaceListing: vi.fn().mockResolvedValue({ id: 1 }),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  createCreatorPartnership: vi.fn().mockResolvedValue({ id: 1 }),
  getDecisionLogByUserId: vi.fn().mockResolvedValue([]),
  createDecisionLogEntry: vi.fn().mockResolvedValue({ id: 1 }),
  // ZHC v2.0 helpers
  getCompaniesByUserId: vi.fn().mockResolvedValue([]),
  getCompanyById: vi.fn().mockResolvedValue(null),
  createCompany: vi.fn().mockResolvedValue({ id: 1 }),
  updateCompany: vi.fn().mockResolvedValue(undefined),
  getDepartmentsByCompanyId: vi.fn().mockResolvedValue([]),
  createDepartment: vi.fn().mockResolvedValue({ id: 1 }),
  getApprovalGatesByCompanyId: vi.fn().mockResolvedValue([]),
  createApprovalGate: vi.fn().mockResolvedValue({ id: 1 }),
  updateApprovalGate: vi.fn().mockResolvedValue(undefined),
  deleteApprovalGate: vi.fn().mockResolvedValue(undefined),
  getAuditLogByCompanyId: vi.fn().mockResolvedValue([]),
  createAuditLogEntry: vi.fn().mockResolvedValue({ id: 1 }),
  getBlueprintsByUserId: vi.fn().mockResolvedValue([]),
  getPublicBlueprints: vi.fn().mockResolvedValue([]),
  getBlueprintById: vi.fn().mockResolvedValue(null),
  createBlueprint: vi.fn().mockResolvedValue({ id: 1 }),
  updateBlueprint: vi.fn().mockResolvedValue(undefined),
  getSkills: vi.fn().mockResolvedValue([]),
  createSkill: vi.fn().mockResolvedValue({ id: 1 }),
  getToolsByCompanyId: vi.fn().mockResolvedValue([]),
  createToolRegistryEntry: vi.fn().mockResolvedValue({ id: 1 }),
  updateToolRegistryEntry: vi.fn().mockResolvedValue(undefined),
  deleteToolRegistryEntry: vi.fn().mockResolvedValue(undefined),
  getWebhooksByCompanyId: vi.fn().mockResolvedValue([]),
  createWebhook: vi.fn().mockResolvedValue({ id: 1 }),
  updateWebhook: vi.fn().mockResolvedValue(undefined),
  deleteWebhook: vi.fn().mockResolvedValue(undefined),
  getActiveBlueprints: vi.fn().mockResolvedValue([]),
  getActiveSkills: vi.fn().mockResolvedValue([]),
  getSkillById: vi.fn().mockResolvedValue(null),
  getBlueprintReviews: vi.fn().mockResolvedValue([]),
  getReviewsByBlueprintId: vi.fn().mockResolvedValue([]),
  getDeploymentsByBlueprintId: vi.fn().mockResolvedValue([]),
  createBlueprintDeployment: vi.fn().mockResolvedValue({ id: 1 }),
  createBlueprintReview: vi.fn().mockResolvedValue({ id: 1 }),
  getMarketplaceListingsByType: vi.fn().mockResolvedValue([]),
  hasWelcomeEmailBeenSent: vi.fn().mockResolvedValue(false),
  markWelcomeEmailSent: vi.fn().mockResolvedValue(undefined),
  getChangelogEntries: vi.fn().mockResolvedValue([]),
  seedChangelogIfEmpty: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test AI response" } }],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Auth context factory ─────────────────────────────────────────────────────
type AuthUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthUser = {
    id: 1, openId: "test-user-openid", email: "test@opencommand.ai", name: "Test User",
    loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => { clearedCookies.push({ name, options }); } } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true });
  });

  it("returns the current user on auth.me", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.name).toBe("Test User");
    expect(user?.email).toBe("test@opencommand.ai");
  });

  it("returns null for unauthenticated auth.me", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ─── Router Structure Tests ──────────────────────────────────────────────────
describe("router structure", () => {
  it("has all 15 top-level routers", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(caller.auth).toBeDefined();
    expect(caller.companies).toBeDefined();
    expect(caller.departments).toBeDefined();
    expect(caller.agents).toBeDefined();
    expect(caller.okrs).toBeDefined();
    expect(caller.tasks).toBeDefined();
    expect(caller.poo).toBeDefined();
    expect(caller.inbox).toBeDefined();
    expect(caller.governance).toBeDefined();
    expect(caller.blueprints).toBeDefined();
    expect(caller.marketplace).toBeDefined();
    expect(caller.skills).toBeDefined();
    expect(caller.integrations).toBeDefined();
    expect(caller.creators).toBeDefined();
    expect(caller.aiCeo).toBeDefined();
  });

  it("companies router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.companies.list).toBeDefined();
    expect(caller.companies.create).toBeDefined();
    expect(caller.companies.seedDefaults).toBeDefined();
  });

  it("agents router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.agents.list).toBeDefined();
    expect(caller.agents.create).toBeDefined();
    expect(caller.agents.updateStatus).toBeDefined();
    expect(caller.agents.seedDefaults).toBeDefined();
  });

  it("governance router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.governance.gates).toBeDefined();
    expect(caller.governance.createGate).toBeDefined();
    expect(caller.governance.updateGate).toBeDefined();
    expect(caller.governance.removeGate).toBeDefined();
    expect(caller.governance.auditLog).toBeDefined();
    expect(caller.governance.killSwitch).toBeDefined();
    expect(caller.governance.seedDefaults).toBeDefined();
  });

  it("integrations router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.integrations.tools).toBeDefined();
    expect(caller.integrations.createTool).toBeDefined();
    expect(caller.integrations.updateTool).toBeDefined();
    expect(caller.integrations.removeTool).toBeDefined();
    expect(caller.integrations.webhooks).toBeDefined();
    expect(caller.integrations.createWebhook).toBeDefined();
    expect(caller.integrations.updateWebhook).toBeDefined();
    expect(caller.integrations.removeWebhook).toBeDefined();
    expect(caller.integrations.seedDefaults).toBeDefined();
  });

  it("blueprints router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.blueprints.list).toBeDefined();
    expect(caller.blueprints.create).toBeDefined();
    expect(caller.blueprints.deploy).toBeDefined();
    expect(caller.blueprints.seedDefaults).toBeDefined();
  });

  it("marketplace router has all procedures", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(caller.marketplace.list).toBeDefined();
    expect(caller.marketplace.leaderboard).toBeDefined();
  });

  it("skills router has list procedure", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(caller.skills.list).toBeDefined();
  });

  it("creators router has all procedures", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(caller.creators.list).toBeDefined();
    expect(caller.creators.submitApplication).toBeDefined();
  });

  it("aiCeo router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiCeo.socratiqueQuestion).toBeDefined();
    expect(caller.aiCeo.strategize).toBeDefined();
    expect(caller.aiCeo.decisionLog).toBeDefined();
  });

  it("departments router has all procedures", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.departments.list).toBeDefined();
    expect(caller.departments.create).toBeDefined();
  });
});

// ─── Agents Tests ─────────────────────────────────────────────────────────────
describe("agents", () => {
  it("returns empty agent list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const agents = await caller.agents.list();
    expect(Array.isArray(agents)).toBe(true);
  });

  it("creates an agent successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.create({ name: "Arch — AI CEO", type: "ceo", description: "Executive Core agent" });
    expect(result.success).toBe(true);
  });

  it("updates agent status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.updateStatus({ id: 1, status: "active" });
    expect(result.success).toBe(true);
  });

  it("seeds default agents without error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── OKRs Tests ───────────────────────────────────────────────────────────────
describe("okrs", () => {
  it("returns empty OKR list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const okrs = await caller.okrs.list();
    expect(Array.isArray(okrs)).toBe(true);
  });

  it("creates an OKR successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.okrs.create({ objective: "Reach PMF", keyResult: "$50K MRR", targetValue: 50000, unit: "USD/mo" });
    expect(result.success).toBe(true);
  });

  it("seeds default OKRs without error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.okrs.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Tasks Tests ──────────────────────────────────────────────────────────────
describe("tasks", () => {
  it("returns empty task list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("creates a task successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.create({ title: "Analyze competitors", routingMode: "ai", priority: "high" });
    expect(result.success).toBe(true);
  });
});

// ─── PoO Receipts Tests ───────────────────────────────────────────────────────
describe("poo", () => {
  it("returns empty PoO receipt list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const receipts = await caller.poo.list();
    expect(Array.isArray(receipts)).toBe(true);
  });

  it("returns PoO summary with correct shape", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.poo.summary();
    expect(summary).toHaveProperty("totalValue");
    expect(summary).toHaveProperty("totalHours");
    expect(summary).toHaveProperty("totalReceipts");
  });
});

// ─── Inbox Tests ──────────────────────────────────────────────────────────────
describe("inbox", () => {
  it("returns empty inbox", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.inbox.list();
    expect(Array.isArray(items)).toBe(true);
  });

  it("resolves an inbox item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inbox.resolve({ id: 1, resolution: "Acknowledged" });
    expect(result.success).toBe(true);
  });

  it("dismisses an inbox item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inbox.dismiss({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Companies Tests ─────────────────────────────────────────────────────────
describe("companies", () => {
  it("returns empty company list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const companies = await caller.companies.list();
    expect(Array.isArray(companies)).toBe(true);
  });

  it("creates a company successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.companies.create({ name: "ZHC Corp", industry: "AI", description: "Zero-human company" });
    expect(result.success).toBe(true);
  });

  it("seeds default companies without error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.companies.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Departments Tests ───────────────────────────────────────────────────────
describe("departments", () => {
  it("returns empty department list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const depts = await caller.departments.list({ companyId: 1 });
    expect(Array.isArray(depts)).toBe(true);
  });

  it("creates a department successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.departments.create({ companyId: 1, name: "Engineering", headAgentId: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Governance Tests ────────────────────────────────────────────────────────
describe("governance", () => {
  it("returns empty gates list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const gates = await caller.governance.gates({ companyId: 1 });
    expect(Array.isArray(gates)).toBe(true);
  });

  it("creates an approval gate", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.governance.createGate({ companyId: 1, gateType: "spend", threshold: 500, description: "Spending over $500" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid gate type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.governance.createGate({ companyId: 1, gateType: "invalid" as any })).rejects.toThrow();
  });

  it("returns empty audit log", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const log = await caller.governance.auditLog({ companyId: 1 });
    expect(Array.isArray(log)).toBe(true);
  });

  it("seeds default governance gates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.governance.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Integrations Tests ──────────────────────────────────────────────────────
describe("integrations", () => {
  it("returns empty tools list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const tools = await caller.integrations.tools({ companyId: 1 });
    expect(Array.isArray(tools)).toBe(true);
  });

  it("creates a tool", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.createTool({ companyId: 1, name: "Stripe API", category: "Payments", apiEndpoint: "https://api.stripe.com" });
    expect(result.success).toBe(true);
  });

  it("returns empty webhooks list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const webhooks = await caller.integrations.webhooks({ companyId: 1 });
    expect(Array.isArray(webhooks)).toBe(true);
  });

  it("creates a webhook", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.createWebhook({ companyId: 1, name: "Slack", url: "https://hooks.slack.com/test", eventType: "task.completed" });
    expect(result.success).toBe(true);
  });

  it("seeds default tools", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Blueprints Tests ────────────────────────────────────────────────────────
describe("blueprints", () => {
  it("returns empty blueprint list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const blueprints = await caller.blueprints.list();
    expect(Array.isArray(blueprints)).toBe(true);
  });

  it("creates a blueprint", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blueprints.create({ name: "Content Agency", category: "Marketing", description: "Full content marketing agency" });
    expect(result.success).toBe(true);
  });

  it("seeds default blueprints", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blueprints.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Marketplace Tests ───────────────────────────────────────────────────────
describe("marketplace", () => {
  it("returns empty marketplace listings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const listings = await caller.marketplace.list();
    expect(Array.isArray(listings)).toBe(true);
  });

  it("seeds default marketplace listings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketplace.seedDefaults();
    expect(result.success).toBe(true);
  });
});

// ─── Skills Tests ────────────────────────────────────────────────────────────
describe("skills", () => {
  it("returns empty skills list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const skills = await caller.skills.list();
    expect(Array.isArray(skills)).toBe(true);
  });
});

// ─── Creators Tests ──────────────────────────────────────────────────────────
describe("creators", () => {
  it("returns empty creator partnerships", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const creators = await caller.creators.list();
    expect(Array.isArray(creators)).toBe(true);
  });

  it("submits a creator application", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.creators.submitApplication({ creatorName: "Alex Chen", creatorHandle: "@alexbuilds", niche: "Indie Hacking", audienceSize: 84000, platform: "Twitter/X" });
    expect(result.success).toBe(true);
  });

  it("rejects empty creator name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.creators.submitApplication({ creatorName: "", creatorHandle: "@test", niche: "AI" })).rejects.toThrow();
  });

  it("rejects empty creator handle", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.creators.submitApplication({ creatorName: "Test", creatorHandle: "", niche: "AI" })).rejects.toThrow();
  });
});

// ─── AI CEO Tests ────────────────────────────────────────────────────────────
describe("aiCeo", () => {
  it("returns decision log as array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const log = await caller.aiCeo.decisionLog();
    expect(Array.isArray(log)).toBe(true);
  });

  it("processes a Socratic question", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.aiCeo.socratiqueQuestion({ userInput: "I want to grow my email list" });
    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
  });

  it("generates a strategy", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.aiCeo.strategize({ goal: "Double MRR in 90 days" });
    expect(result).toHaveProperty("strategy");
    expect(typeof result.strategy).toBe("string");
  });

  it("rejects empty Socratic input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.aiCeo.socratiqueQuestion({ userInput: "" })).rejects.toThrow();
  });

  it("accepts any non-empty strategy goal", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.aiCeo.strategize({ goal: "Test goal" });
    expect(result).toHaveProperty("strategy");
  });
});
