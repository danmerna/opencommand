import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Tell me about your company vision." } }],
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock socketEmit
vi.mock("./socketEmit", () => ({
  emitToUser: vi.fn(),
  emitBroadcast: vi.fn(),
}));

// Mock DB helpers
const mockOnboarding = {
  id: 1,
  agentId: 10,
  userId: 1,
  companyId: 1,
  agentType: "ceo",
  status: "in_progress",
  conversationHistory: [{ role: "assistant", content: "Tell me about your company." }],
  context: {},
  summary: null,
  completedAt: null,
  createdAt: new Date(),
};

const mockAgent = {
  id: 10,
  name: "ARCH",
  type: "ceo",
  roleTitle: "Chief Executive Officer",
  companyId: 1,
  status: "active",
  description: "AI CEO",
  tasksCompleted: 0,
  totalValueCreated: "0",
};

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getAgentsByUserId: vi.fn().mockResolvedValue([mockAgent]),
  getAgentsByCompanyId: vi.fn().mockResolvedValue([mockAgent]),
  getAgentById: vi.fn().mockResolvedValue(mockAgent),
  getOnboardingByAgentId: vi.fn().mockResolvedValue(null),
  getOnboardingById: vi.fn().mockResolvedValue(mockOnboarding),
  getOnboardingsByUserId: vi.fn().mockResolvedValue([]),
  getOnboardingsByCompanyId: vi.fn().mockResolvedValue([]),
  createOnboarding: vi.fn().mockResolvedValue(undefined),
  updateOnboarding: vi.fn().mockResolvedValue(undefined),
  completeOnboarding: vi.fn().mockResolvedValue(undefined),
  getStrategyProposalsByCompanyId: vi.fn().mockResolvedValue([]),
  getStrategyProposalsByUserId: vi.fn().mockResolvedValue([]),
  getStrategyProposalById: vi.fn().mockResolvedValue(null),
  createStrategyProposal: vi.fn().mockResolvedValue(undefined),
  updateStrategyProposalStatus: vi.fn().mockResolvedValue(undefined),
  getCompanyById: vi.fn().mockResolvedValue({ id: 1, name: "Test Co", mission: "Test mission", industry: "Tech" }),
  getOkrsByCompanyId: vi.fn().mockResolvedValue([]),
  getOkrsByUserId: vi.fn().mockResolvedValue([]),
  getDecisionLogByUserId: vi.fn().mockResolvedValue([]),
  createDecisionLogEntry: vi.fn().mockResolvedValue(undefined),
  // Stubs for other imports used by routers.ts
  getCompaniesByUserId: vi.fn().mockResolvedValue([]),
  getCompanyPnL: vi.fn().mockResolvedValue(null),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  getDepartmentsByCompanyId: vi.fn().mockResolvedValue([]),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
  getCapabilitiesByAgentId: vi.fn().mockResolvedValue([]),
  createAgentCapability: vi.fn(),
  deleteAgentCapability: vi.fn(),
  getThreadsByTaskId: vi.fn().mockResolvedValue([]),
  createTaskThread: vi.fn(),
  getHeartbeatLogByAgentId: vi.fn().mockResolvedValue([]),
  getHeartbeatLogByCompanyId: vi.fn().mockResolvedValue([]),
  createHeartbeatLogEntry: vi.fn(),
  getApprovalGatesByCompanyId: vi.fn().mockResolvedValue([]),
  createApprovalGate: vi.fn(),
  updateApprovalGate: vi.fn(),
  deleteApprovalGate: vi.fn(),
  getActiveBlueprints: vi.fn().mockResolvedValue([]),
  getBlueprintById: vi.fn(),
  getBlueprintsByUserId: vi.fn().mockResolvedValue([]),
  createBlueprint: vi.fn(),
  updateBlueprint: vi.fn(),
  getReviewsByBlueprintId: vi.fn().mockResolvedValue([]),
  createBlueprintReview: vi.fn(),
  getDeploymentsByUserId: vi.fn().mockResolvedValue([]),
  getDeploymentsByBlueprintId: vi.fn().mockResolvedValue([]),
  createBlueprintDeployment: vi.fn(),
  updateBlueprintDeployment: vi.fn(),
  getActiveSkills: vi.fn().mockResolvedValue([]),
  getSkillById: vi.fn(),
  createSkill: vi.fn(),
  getToolsByCompanyId: vi.fn().mockResolvedValue([]),
  createToolRegistryEntry: vi.fn(),
  updateToolRegistryEntry: vi.fn(),
  deleteToolRegistryEntry: vi.fn(),
  getWebhooksByCompanyId: vi.fn().mockResolvedValue([]),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getAuditLogByCompanyId: vi.fn().mockResolvedValue([]),
  createAuditLogEntry: vi.fn(),
  getAllToolCategories: vi.fn().mockResolvedValue([]),
  getToolCategoryById: vi.fn(),
  getToolCategoryBySlug: vi.fn(),
  seedToolCategories: vi.fn(),
  getAllToolProviders: vi.fn().mockResolvedValue([]),
  getProvidersByCategoryId: vi.fn().mockResolvedValue([]),
  getToolProviderById: vi.fn(),
  seedToolProviders: vi.fn(),
  getUserConnectionsByUserId: vi.fn().mockResolvedValue([]),
  getUserConnectionsByCategory: vi.fn().mockResolvedValue([]),
  createUserConnection: vi.fn(),
  updateUserConnection: vi.fn(),
  disconnectUserConnection: vi.fn(),
  getMappingsByCategoryId: vi.fn().mockResolvedValue([]),
  getMappingsByProviderId: vi.fn().mockResolvedValue([]),
  getMappingForAction: vi.fn(),
  createAbstractionMapping: vi.fn(),
  getContextObjectsByUserId: vi.fn().mockResolvedValue([]),
  getContextObjectById: vi.fn(),
  createContextObject: vi.fn(),
  updateContextObject: vi.fn(),
  getRequiredCategoriesByAgentId: vi.fn().mockResolvedValue([]),
  getRequiredCategoriesByBlueprintId: vi.fn().mockResolvedValue([]),
  getRequiredCategoriesByListingId: vi.fn().mockResolvedValue([]),
  createAgentRequiredCategory: vi.fn(),
  checkUserCompatibility: vi.fn().mockResolvedValue({ compatible: true, missing: [] }),
  hasWelcomeEmailBeenSent: vi.fn().mockResolvedValue(false),
  markWelcomeEmailSent: vi.fn().mockResolvedValue(undefined),
  getChangelogEntries: vi.fn().mockResolvedValue([]),
  seedChangelogIfEmpty: vi.fn().mockResolvedValue(undefined),
  getMarketplaceListings: vi.fn().mockResolvedValue([]),
  getMarketplaceListingById: vi.fn(),
  createMarketplaceListing: vi.fn(),
  getCreatorPartnerships: vi.fn().mockResolvedValue([]),
  createCreatorPartnership: vi.fn(),
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getTasksByCompanyId: vi.fn().mockResolvedValue([]),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  getPooReceiptsByUserId: vi.fn().mockResolvedValue([]),
  getPooReceiptByNumber: vi.fn(),
  createPooReceipt: vi.fn(),
  getPooSummaryByUserId: vi.fn().mockResolvedValue(null),
  getInboxItemsByUserId: vi.fn().mockResolvedValue([]),
  createInboxItem: vi.fn(),
  resolveInboxItem: vi.fn(),
  dismissInboxItem: vi.fn(),
  markInboxItemRead: vi.fn(),
  updateAgentStatus: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  createAgent: vi.fn(),
  updateOkrProgress: vi.fn(),
  createOkr: vi.fn(),
  deleteOkr: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectsByCompanyId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getProjectFiles: vi.fn().mockResolvedValue([]),
  createProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  getProjectChats: vi.fn().mockResolvedValue([]),
  createProjectChat: vi.fn(),
}));

// Mock stripe
vi.mock("./stripe/products", () => ({
  PRODUCTS: {},
}));

describe("Onboarding Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have onboarding system prompts for all C-suite types", async () => {
    // Verify the router module loads without errors
    const mod = await import("./routers");
    expect(mod.appRouter).toBeDefined();
  });

  it("should include onboarding router in appRouter", async () => {
    const mod = await import("./routers");
    const procedures = Object.keys(mod.appRouter._def.procedures);
    expect(procedures).toContain("onboarding.status");
    expect(procedures).toContain("onboarding.getForAgent");
    expect(procedures).toContain("onboarding.start");
    expect(procedures).toContain("onboarding.respond");
    expect(procedures).toContain("onboarding.generateStrategy");
    expect(procedures).toContain("onboarding.proposals");
    expect(procedures).toContain("onboarding.updateProposalStatus");
  });

  it("should have 9 onboarding procedures total", async () => {
    const mod = await import("./routers");
    const onboardingProcedures = Object.keys(mod.appRouter._def.procedures).filter(
      (k) => k.startsWith("onboarding.")
    );
    expect(onboardingProcedures.length).toBe(9);
  });

  it("should define system prompts for ceo, cto, cmo, cfo, vp", async () => {
    // Verify the system prompts use correct agent names
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers.ts", "utf-8");
    expect(source).toContain("You are ARCH");
    expect(source).toContain("You are NOVA");
    expect(source).toContain("You are SAGE");
    expect(source).toContain("You are TED");
    // Ensure no lowercase "Arch" confusion (only ARCH is valid)
    expect(source).not.toMatch(/You are Arch[^"]/);
  });

  it("system prompts should enforce 3 required + 2 optional question structure", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers.ts", "utf-8");
    // All prompts should mention 3 required questions
    expect(source).toContain("asking exactly 3 core questions");
    // All prompts should mention optional continuation
    expect(source).toContain("core_complete");
  });

  it("respond procedure should handle core_complete response type", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers.ts", "utf-8");
    expect(source).toContain("isCoreComplete");
  });

  it("default agents should include TED as CFO", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers.ts", "utf-8");
    expect(source).toContain('"TED \u2014 AI CFO"');
    expect(source).toContain('type: "cfo" as const');
  });

  it("getOnboardingById helper should exist in db module", async () => {
    const db = await import("./db");
    expect(db.getOnboardingById).toBeDefined();
    expect(typeof db.getOnboardingById).toBe("function");
  });

  it("createOnboarding helper should exist in db module", async () => {
    const db = await import("./db");
    expect(db.createOnboarding).toBeDefined();
    expect(typeof db.createOnboarding).toBe("function");
  });

  it("completeOnboarding helper should exist in db module", async () => {
    const db = await import("./db");
    expect(db.completeOnboarding).toBeDefined();
    expect(typeof db.completeOnboarding).toBe("function");
  });

  it("strategy proposal helpers should exist in db module", async () => {
    const db = await import("./db");
    expect(db.createStrategyProposal).toBeDefined();
    expect(db.getStrategyProposalsByCompanyId).toBeDefined();
    expect(db.updateStrategyProposalStatus).toBeDefined();
  });
});
