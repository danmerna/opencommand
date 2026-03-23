import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getAgentsByUserId: vi.fn().mockResolvedValue([]),
  getAgentsByCompanyId: vi.fn().mockResolvedValue([]),
  getAgentById: vi.fn().mockResolvedValue(null),
  createAgent: vi.fn().mockResolvedValue({}),
  updateAgentStatus: vi.fn().mockResolvedValue({}),
  updateAgent: vi.fn().mockResolvedValue({}),
  deleteAgent: vi.fn().mockResolvedValue({}),
  getOkrsByUserId: vi.fn().mockResolvedValue([]),
  getOkrsByCompanyId: vi.fn().mockResolvedValue([]),
  createOkr: vi.fn().mockResolvedValue({}),
  updateOkrProgress: vi.fn().mockResolvedValue({}),
  deleteOkr: vi.fn().mockResolvedValue({}),
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getTasksByCompanyId: vi.fn().mockResolvedValue([]),
  getTaskById: vi.fn().mockResolvedValue(null),
  createTask: vi.fn().mockResolvedValue({}),
  updateTask: vi.fn().mockResolvedValue({}),
  getPooReceiptsByUserId: vi.fn().mockResolvedValue([]),
  getPooReceiptByNumber: vi.fn().mockResolvedValue(null),
  createPooReceipt: vi.fn().mockResolvedValue({}),
  getPooSummaryByUserId: vi.fn().mockResolvedValue({ totalReceipts: 0, totalValueCreated: "0", totalHoursSaved: "0", totalCost: "0" }),
  getInboxItemsByUserId: vi.fn().mockResolvedValue([]),
  createInboxItem: vi.fn().mockResolvedValue({}),
  resolveInboxItem: vi.fn().mockResolvedValue({}),
  dismissInboxItem: vi.fn().mockResolvedValue({}),
  markInboxItemRead: vi.fn().mockResolvedValue({}),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getMarketplaceListingById: vi.fn().mockResolvedValue(null),
  createMarketplaceListing: vi.fn().mockResolvedValue({}),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  createCreatorPartnership: vi.fn().mockResolvedValue({}),
  getDecisionLogByUserId: vi.fn().mockResolvedValue([]),
  createDecisionLogEntry: vi.fn().mockResolvedValue({}),
  getCompaniesByUserId: vi.fn().mockResolvedValue([]),
  getCompanyById: vi.fn().mockResolvedValue(null),
  createCompany: vi.fn().mockResolvedValue({}),
  updateCompany: vi.fn().mockResolvedValue({}),
  getCompanyPnL: vi.fn().mockResolvedValue({ revenue: 0, costs: 0, net: 0 }),
  getDepartmentsByCompanyId: vi.fn().mockResolvedValue([]),
  createDepartment: vi.fn().mockResolvedValue({}),
  updateDepartment: vi.fn().mockResolvedValue({}),
  deleteDepartment: vi.fn().mockResolvedValue({}),
  getCapabilitiesByAgentId: vi.fn().mockResolvedValue([]),
  createAgentCapability: vi.fn().mockResolvedValue({}),
  deleteAgentCapability: vi.fn().mockResolvedValue({}),
  getThreadsByTaskId: vi.fn().mockResolvedValue([]),
  createTaskThread: vi.fn().mockResolvedValue({}),
  getHeartbeatLogByAgentId: vi.fn().mockResolvedValue([]),
  getHeartbeatLogByCompanyId: vi.fn().mockResolvedValue([]),
  createHeartbeatLogEntry: vi.fn().mockResolvedValue({}),
  getApprovalGatesByCompanyId: vi.fn().mockResolvedValue([]),
  createApprovalGate: vi.fn().mockResolvedValue({}),
  updateApprovalGate: vi.fn().mockResolvedValue({}),
  deleteApprovalGate: vi.fn().mockResolvedValue({}),
  getActiveBlueprints: vi.fn().mockResolvedValue([]),
  getBlueprintById: vi.fn().mockResolvedValue(null),
  getBlueprintsByUserId: vi.fn().mockResolvedValue([]),
  createBlueprint: vi.fn().mockResolvedValue({}),
  updateBlueprint: vi.fn().mockResolvedValue({}),
  getReviewsByBlueprintId: vi.fn().mockResolvedValue([]),
  createBlueprintReview: vi.fn().mockResolvedValue({}),
  getDeploymentsByUserId: vi.fn().mockResolvedValue([]),
  getDeploymentsByBlueprintId: vi.fn().mockResolvedValue([]),
  createBlueprintDeployment: vi.fn().mockResolvedValue({}),
  updateBlueprintDeployment: vi.fn().mockResolvedValue({}),
  getActiveSkills: vi.fn().mockResolvedValue([]),
  getSkillById: vi.fn().mockResolvedValue(null),
  createSkill: vi.fn().mockResolvedValue({}),
  getToolsByCompanyId: vi.fn().mockResolvedValue([]),
  createToolRegistryEntry: vi.fn().mockResolvedValue({}),
  updateToolRegistryEntry: vi.fn().mockResolvedValue({}),
  deleteToolRegistryEntry: vi.fn().mockResolvedValue({}),
  getWebhooksByCompanyId: vi.fn().mockResolvedValue([]),
  createWebhook: vi.fn().mockResolvedValue({}),
  updateWebhook: vi.fn().mockResolvedValue({}),
  deleteWebhook: vi.fn().mockResolvedValue({}),
  getAuditLogByCompanyId: vi.fn().mockResolvedValue([]),
  createAuditLogEntry: vi.fn().mockResolvedValue({}),
  getAllToolCategories: vi.fn().mockResolvedValue([]),
  getToolCategoryById: vi.fn().mockResolvedValue(null),
  getToolCategoryBySlug: vi.fn().mockResolvedValue(null),
  seedToolCategories: vi.fn().mockResolvedValue({}),
  getAllToolProviders: vi.fn().mockResolvedValue([]),
  getProvidersByCategoryId: vi.fn().mockResolvedValue([]),
  getToolProviderById: vi.fn().mockResolvedValue(null),
  seedToolProviders: vi.fn().mockResolvedValue({}),
  getUserConnectionsByUserId: vi.fn().mockResolvedValue([]),
  getUserConnectionsByCategory: vi.fn().mockResolvedValue([]),
  createUserConnection: vi.fn().mockResolvedValue({}),
  updateUserConnection: vi.fn().mockResolvedValue({}),
  disconnectUserConnection: vi.fn().mockResolvedValue({}),
  getMappingsByCategoryId: vi.fn().mockResolvedValue([]),
  getMappingsByProviderId: vi.fn().mockResolvedValue([]),
  getMappingForAction: vi.fn().mockResolvedValue(null),
  createAbstractionMapping: vi.fn().mockResolvedValue({}),
  getContextObjectsByUserId: vi.fn().mockResolvedValue([]),
  getContextObjectById: vi.fn().mockResolvedValue(null),
  createContextObject: vi.fn().mockResolvedValue({}),
  updateContextObject: vi.fn().mockResolvedValue({}),
  getRequiredCategoriesByAgentId: vi.fn().mockResolvedValue([]),
  getRequiredCategoriesByBlueprintId: vi.fn().mockResolvedValue([]),
  getRequiredCategoriesByListingId: vi.fn().mockResolvedValue([]),
  createAgentRequiredCategory: vi.fn().mockResolvedValue({}),
  checkUserCompatibility: vi.fn().mockResolvedValue({ score: 100, missing: [], connected: [] }),
  hasWelcomeEmailBeenSent: vi.fn().mockResolvedValue(false),
  markWelcomeEmailSent: vi.fn().mockResolvedValue(undefined),
  getChangelogEntries: vi.fn().mockResolvedValue([]),
  seedChangelogIfEmpty: vi.fn().mockResolvedValue(undefined),
  logFeatureEvent: vi.fn().mockResolvedValue(undefined),
  getFeatureEventsSummary: vi.fn().mockResolvedValue([]),
  getFeatureEventsAll: vi.fn().mockResolvedValue([]),
  createUserFeedback: vi.fn().mockResolvedValue({}),
  getUserFeedback: vi.fn().mockResolvedValue([]),
  updateFeedbackStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "{}" } }] }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-user", email: "test@example.com", name: "Test User",
      loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

const { getPooReceiptByNumber } = await import("./db");

describe("v3.2 — Payment History & PoO Receipt Viewer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("payments.products (public)", () => {
    it("returns the product catalog", async () => {
      const caller = appRouter.createCaller(createPublicCtx());
      const products = await caller.payments.products();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty("key");
      expect(products[0]).toHaveProperty("name");
      expect(products[0]).toHaveProperty("priceAmount");
      expect(products[0]).toHaveProperty("type");
    });
  });

  describe("payments.history (protected)", () => {
    it("returns empty array when Stripe has no sessions", async () => {
      const caller = appRouter.createCaller(createAuthCtx());
      const history = await caller.payments.history();
      expect(Array.isArray(history)).toBe(true);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createPublicCtx());
      await expect(caller.payments.history()).rejects.toThrow();
    });
  });

  describe("poo.getByNumber (public)", () => {
    it("returns null for non-existent receipt", async () => {
      (getPooReceiptByNumber as any).mockResolvedValue(null);
      const caller = appRouter.createCaller(createPublicCtx());
      const result = await caller.poo.getByNumber({ receiptNumber: "POO-NONEXISTENT" });
      expect(result).toBeNull();
    });

    it("returns receipt data for valid receipt number", async () => {
      const mockReceipt = {
        id: 1, taskId: 1, userId: 1, companyId: 1, agentId: null,
        receiptNumber: "POO-12345-ABCDEF",
        taskTitle: "Generate Q1 Marketing Report",
        outcome: "Successfully generated comprehensive marketing report with 15 charts",
        laborHoursSaved: "4.50",
        dollarValueCreated: "675.00",
        costIncurred: "0.0320",
        hourlyRateBenchmark: "150.00",
        verificationStatus: "verified" as const,
        metadata: null,
        createdAt: new Date(),
      };
      (getPooReceiptByNumber as any).mockResolvedValue(mockReceipt);
      const caller = appRouter.createCaller(createPublicCtx());
      const result = await caller.poo.getByNumber({ receiptNumber: "POO-12345-ABCDEF" });
      expect(result).not.toBeNull();
      expect(result!.receiptNumber).toBe("POO-12345-ABCDEF");
      expect(result!.taskTitle).toBe("Generate Q1 Marketing Report");
      expect(result!.dollarValueCreated).toBe("675.00");
      expect(result!.laborHoursSaved).toBe("4.50");
      expect(result!.verificationStatus).toBe("verified");
    });

    it("does not expose userId or internal IDs", async () => {
      const mockReceipt = {
        id: 1, taskId: 1, userId: 1, companyId: 1, agentId: null,
        receiptNumber: "POO-TEST",
        taskTitle: "Test Task",
        outcome: "Test outcome",
        laborHoursSaved: "1.00",
        dollarValueCreated: "150.00",
        costIncurred: "0.01",
        hourlyRateBenchmark: "150.00",
        verificationStatus: "verified" as const,
        metadata: null,
        createdAt: new Date(),
      };
      (getPooReceiptByNumber as any).mockResolvedValue(mockReceipt);
      const caller = appRouter.createCaller(createPublicCtx());
      const result = await caller.poo.getByNumber({ receiptNumber: "POO-TEST" });
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty("id");
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("taskId");
      expect(result).not.toHaveProperty("companyId");
      expect(result).not.toHaveProperty("agentId");
    });
  });

  describe("poo.list (protected)", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createPublicCtx());
      await expect(caller.poo.list()).rejects.toThrow();
    });

    it("returns receipts for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthCtx());
      const result = await caller.poo.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("poo.summary (protected)", () => {
    it("returns summary stats", async () => {
      const caller = appRouter.createCaller(createAuthCtx());
      const result = await caller.poo.summary();
      expect(result).toHaveProperty("totalReceipts");
      expect(result).toHaveProperty("totalValueCreated");
      expect(result).toHaveProperty("totalHoursSaved");
    });
  });
});
