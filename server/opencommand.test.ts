import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAgentsByUserId: vi.fn().mockResolvedValue([]),
  getAgentById: vi.fn().mockResolvedValue(null),
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
    id: 1,
    openId: "test-user-openid",
    email: "test@opencommand.ai",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
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
    const result = await caller.agents.create({
      name: "ARIA — AI CEO",
      type: "ceo",
      description: "Executive Core agent",
    });
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
    const result = await caller.okrs.create({
      objective: "Reach Product-Market Fit",
      keyResult: "Achieve $50K MRR",
      targetValue: 50000,
      unit: "USD/mo",
    });
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
    const result = await caller.tasks.create({
      title: "Analyze competitor landscape",
      routingMode: "ai",
      priority: "high",
    });
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

// ─── Marketplace Tests ────────────────────────────────────────────────────────
describe("marketplace", () => {
  it("returns empty marketplace listings as public", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const listings = await caller.marketplace.list();
    expect(Array.isArray(listings)).toBe(true);
  });
});

// ─── Creator Partnerships Tests ───────────────────────────────────────────────
describe("creators", () => {
  it("returns empty creator partnerships as public", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const creators = await caller.creators.list();
    expect(Array.isArray(creators)).toBe(true);
  });

  it("submits a creator application", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.creators.submitApplication({
      creatorName: "Alex Chen",
      creatorHandle: "@alexbuilds",
      niche: "Indie Hacking",
      audienceSize: 84000,
      platform: "Twitter/X",
    });
    expect(result.success).toBe(true);
  });
});

// ─── AI CEO Tests ─────────────────────────────────────────────────────────────
describe("aiCeo", () => {
  it("returns decision log as array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const log = await caller.aiCeo.decisionLog();
    expect(Array.isArray(log)).toBe(true);
  });

  it("processes a Socratic question and returns a response", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.aiCeo.socratiqueQuestion({
      userInput: "I want to grow my email list",
    });
    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
  });

  it("generates a strategy and logs it", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.aiCeo.strategize({
      goal: "Double MRR in 90 days",
    });
    expect(result).toHaveProperty("strategy");
    expect(typeof result.strategy).toBe("string");
  });
});
