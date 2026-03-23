import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getCompaniesByUserId: vi.fn().mockResolvedValue([]),
  createCompany: vi.fn().mockResolvedValue({ insertId: 1 }),
  getCompanyById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "Test Corp",
    mission: "Test mission",
    industry: "AI",
    status: "active",
    monthlyBudget: "0",
    totalRevenue: "0",
    totalCosts: "0",
    agentCount: 0,
    briefingFrequency: "weekly",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateCompany: vi.fn().mockResolvedValue(undefined),
  getCompanyPnL: vi.fn().mockResolvedValue({ revenue: 0, costs: 0, profit: 0 }),
  // Stub all other db functions to avoid import errors
  getAllToolCategories: vi.fn().mockResolvedValue([]),
  getAllToolProviders: vi.fn().mockResolvedValue([]),
  getUserConnectionsByUserId: vi.fn().mockResolvedValue([]),
  createUserConnection: vi.fn().mockResolvedValue({}),
  disconnectUserConnection: vi.fn().mockResolvedValue(undefined),
  seedToolCategories: vi.fn().mockResolvedValue([]),
  seedToolProviders: vi.fn().mockResolvedValue([]),
  seedIntegrationDefaults: vi.fn().mockResolvedValue({}),
  getContextObjectsByUserId: vi.fn().mockResolvedValue([]),
  createContextObject: vi.fn().mockResolvedValue({}),
  getContextObjectById: vi.fn().mockResolvedValue(null),
  updateContextObject: vi.fn().mockResolvedValue(undefined),
  getAgentsByUserId: vi.fn().mockResolvedValue([]),
  getAgentsByCompanyId: vi.fn().mockResolvedValue([]),
  getAgentById: vi.fn().mockResolvedValue(null),
  createAgent: vi.fn().mockResolvedValue({}),
  updateAgent: vi.fn().mockResolvedValue(undefined),
  updateAgentStatus: vi.fn().mockResolvedValue(undefined),
  getDepartmentsByCompanyId: vi.fn().mockResolvedValue([]),
  createDepartment: vi.fn().mockResolvedValue({}),
  updateDepartment: vi.fn().mockResolvedValue(undefined),
  deleteDepartment: vi.fn().mockResolvedValue(undefined),
  getOkrsByUserId: vi.fn().mockResolvedValue([]),
  getOkrsByCompanyId: vi.fn().mockResolvedValue([]),
  createOkr: vi.fn().mockResolvedValue({}),
  updateOkrProgress: vi.fn().mockResolvedValue(undefined),
  deleteOkr: vi.fn().mockResolvedValue(undefined),
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getTaskById: vi.fn().mockResolvedValue(null),
  getThreadsByTaskId: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({}),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  createTaskThread: vi.fn().mockResolvedValue({}),
  getPooReceiptsByUserId: vi.fn().mockResolvedValue([]),
  getPooReceiptsByCompanyId: vi.fn().mockResolvedValue([]),
  createPooReceipt: vi.fn().mockResolvedValue({}),
  getInboxItemsByUserId: vi.fn().mockResolvedValue([]),
  markInboxItemRead: vi.fn().mockResolvedValue(undefined),
  createInboxItem: vi.fn().mockResolvedValue({}),
  getApprovalGatesByCompanyId: vi.fn().mockResolvedValue([]),
  createApprovalGate: vi.fn().mockResolvedValue({}),
  updateApprovalGate: vi.fn().mockResolvedValue(undefined),
  deleteApprovalGate: vi.fn().mockResolvedValue(undefined),
  getAuditLogByCompanyId: vi.fn().mockResolvedValue([]),
  createAuditLogEntry: vi.fn().mockResolvedValue({}),
  getActiveBlueprints: vi.fn().mockResolvedValue([]),
  getBlueprintById: vi.fn().mockResolvedValue(null),
  getBlueprintsByUserId: vi.fn().mockResolvedValue([]),
  getReviewsByBlueprintId: vi.fn().mockResolvedValue([]),
  getDeploymentsByBlueprintId: vi.fn().mockResolvedValue([]),
  getDeploymentsByUserId: vi.fn().mockResolvedValue([]),
  createBlueprint: vi.fn().mockResolvedValue({}),
  updateBlueprint: vi.fn().mockResolvedValue(undefined),
  createBlueprintDeployment: vi.fn().mockResolvedValue({}),
  createBlueprintReview: vi.fn().mockResolvedValue({}),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getMarketplaceListingById: vi.fn().mockResolvedValue(null),
  getMarketplaceListingsByUserId: vi.fn().mockResolvedValue([]),
  createMarketplaceListing: vi.fn().mockResolvedValue({}),
  updateMarketplaceListing: vi.fn().mockResolvedValue(undefined),
  deleteMarketplaceListing: vi.fn().mockResolvedValue(undefined),
  getSkillsByUserId: vi.fn().mockResolvedValue([]),
  createSkill: vi.fn().mockResolvedValue({}),
  updateSkill: vi.fn().mockResolvedValue(undefined),
  deleteSkill: vi.fn().mockResolvedValue(undefined),
  getToolRegistryByCompanyId: vi.fn().mockResolvedValue([]),
  createToolRegistryEntry: vi.fn().mockResolvedValue({}),
  updateToolRegistryEntry: vi.fn().mockResolvedValue(undefined),
  deleteToolRegistryEntry: vi.fn().mockResolvedValue(undefined),
  getWebhooksByCompanyId: vi.fn().mockResolvedValue([]),
  createWebhook: vi.fn().mockResolvedValue({}),
  updateWebhook: vi.fn().mockResolvedValue(undefined),
  deleteWebhook: vi.fn().mockResolvedValue(undefined),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  createCreatorPartnership: vi.fn().mockResolvedValue({}),
  getDecisionLogByUserId: vi.fn().mockResolvedValue([]),
  createDecisionLogEntry: vi.fn().mockResolvedValue({}),
  getPaymentsByUserId: vi.fn().mockResolvedValue([]),
  createPayment: vi.fn().mockResolvedValue({}),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null),
  createProject: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  getProjectChatsByProjectId: vi.fn().mockResolvedValue([]),
  createProjectChat: vi.fn().mockResolvedValue({}),
  getProjectFilesByProjectId: vi.fn().mockResolvedValue([]),
  createProjectFile: vi.fn().mockResolvedValue({}),
  deleteProjectFile: vi.fn().mockResolvedValue(undefined),
  getOnboardingsByUserId: vi.fn().mockResolvedValue([]),
  getOnboardingsByCompanyId: vi.fn().mockResolvedValue([]),
  getOnboardingByAgentId: vi.fn().mockResolvedValue(null),
  createOnboarding: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateOnboarding: vi.fn().mockResolvedValue(undefined),
  getStrategyProposalsByUserId: vi.fn().mockResolvedValue([]),
  getStrategyProposalsByCompanyId: vi.fn().mockResolvedValue([]),
  createStrategyProposal: vi.fn().mockResolvedValue({}),
  updateStrategyProposalStatus: vi.fn().mockResolvedValue(undefined),
  getWaitlistEntries: vi.fn().mockResolvedValue([]),
  createWaitlistEntry: vi.fn().mockResolvedValue({}),
  getHeartbeatLogByAgentId: vi.fn().mockResolvedValue([]),
  createHeartbeatLogEntry: vi.fn().mockResolvedValue({}),
  getAbstractionMappingsByUserId: vi.fn().mockResolvedValue([]),
  createAbstractionMapping: vi.fn().mockResolvedValue({}),
  updateAbstractionMapping: vi.fn().mockResolvedValue(undefined),
  deleteAbstractionMapping: vi.fn().mockResolvedValue(undefined),
  getAgentRequiredCategoriesByAgentId: vi.fn().mockResolvedValue([]),
  createAgentRequiredCategory: vi.fn().mockResolvedValue({}),
  deleteAgentRequiredCategory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./server/_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Mock strategy content" } }],
  }),
}));

vi.mock("./_core/websocket", () => ({
  emitToUser: vi.fn(),
}));

const mockCtx: TrpcContext = {
  user: { id: 1, openId: "test-open-id", name: "Test User", email: "test@example.com", role: "user", loginMethod: "oauth", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as any,
  res: {} as any,
};

describe("companies router - briefingFrequency feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("companies.create accepts briefingFrequency parameter", async () => {
    const { createCompany } = await import("./db");
    const caller = appRouter.createCaller(mockCtx);

    await caller.companies.create({
      name: "Test Corp",
      mission: "Test mission",
      industry: "AI",
      briefingFrequency: "weekly",
    });

    expect(createCompany).toHaveBeenCalledWith(
      expect.objectContaining({ briefingFrequency: "weekly" })
    );
  });

  it("companies.create works without briefingFrequency (defaults to undefined)", async () => {
    const { createCompany } = await import("./db");
    const caller = appRouter.createCaller(mockCtx);

    await caller.companies.create({ name: "Test Corp" });

    expect(createCompany).toHaveBeenCalled();
  });

  it("companies.update accepts briefingFrequency parameter", async () => {
    const { updateCompany } = await import("./db");
    const caller = appRouter.createCaller(mockCtx);

    await caller.companies.update({ id: 1, briefingFrequency: "monthly" });

    expect(updateCompany).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ briefingFrequency: "monthly" })
    );
  });

  it("companies.update accepts all valid briefingFrequency values", async () => {
    const { updateCompany } = await import("./db");
    const caller = appRouter.createCaller(mockCtx);
    const validValues = ["daily", "weekly", "monthly", "quarterly"] as const;

    for (const freq of validValues) {
      await caller.companies.update({ id: 1, briefingFrequency: freq });
      expect(updateCompany).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ briefingFrequency: freq })
      );
    }
  });

  it("companies.update does not set briefingFrequency when not provided", async () => {
    const { updateCompany } = await import("./db");
    const caller = appRouter.createCaller(mockCtx);

    await caller.companies.update({ id: 1, name: "New Name" });

    expect(updateCompany).toHaveBeenCalledWith(
      1,
      expect.not.objectContaining({ briefingFrequency: expect.anything() })
    );
  });
});
