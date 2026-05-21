import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { dispatchToConnector, testConnector } from "./connectors/dispatcher";
import { leadResponseRouter } from "./routers/leadResponse";
import { intentEngineRouter } from "./routers/intentEngine";
import { templatesRouter } from "./routers/templates";
import { workspaceRouter } from "./routers/workspace";
import { goalsRouter } from "./routers/goals";
import { encryptConnectorConfig, maskApiKey } from "./connectors/encrypt";
import { notifyOwner } from "./_core/notification";
import {
  getAgentsByUserId, getAgentsByCompanyId, getAgentById, createAgent, updateAgentStatus, updateAgent, deleteAgent,
  getOkrsByUserId, getOkrsByCompanyId, getOkrById, createOkr, updateOkrProgress, deleteOkr,
  getTasksByUserId, getTasksByCompanyId, getTaskById, createTask, updateTask,
  getPooReceiptsByUserId, getPooReceiptByNumber, createPooReceipt, getPooSummaryByUserId,
  getInboxItemsByUserId, createInboxItem, resolveInboxItem, dismissInboxItem, markInboxItemRead,
  getMarketplaceListings, getMarketplaceListingById, createMarketplaceListing,
  getCreatorPartnerships, createCreatorPartnership,
  getDecisionLogByUserId, createDecisionLogEntry,
  getCompaniesByUserId, getCompanyById, createCompany, updateCompany, getCompanyPnL,
  getDepartmentsByCompanyId, createDepartment, updateDepartment, deleteDepartment,
  getCapabilitiesByAgentId, createAgentCapability, deleteAgentCapability,
  getThreadsByTaskId, createTaskThread,
  getHeartbeatLogByAgentId, getHeartbeatLogByCompanyId, createHeartbeatLogEntry,
  getApprovalGatesByCompanyId, createApprovalGate, updateApprovalGate, deleteApprovalGate,
  getActiveBlueprints, getBlueprintById, getBlueprintsByUserId, createBlueprint, updateBlueprint,
  getReviewsByBlueprintId, createBlueprintReview,
  getDeploymentsByUserId, getDeploymentsByBlueprintId, createBlueprintDeployment, updateBlueprintDeployment,
  getActiveSkills, getSkillById, createSkill,
  getToolsByCompanyId, createToolRegistryEntry, updateToolRegistryEntry, deleteToolRegistryEntry,
  getWebhooksByCompanyId, createWebhook, updateWebhook, deleteWebhook,
  getAuditLogByCompanyId, createAuditLogEntry,
  getAllToolCategories, getToolCategoryById, getToolCategoryBySlug, seedToolCategories,
  getAllToolProviders, getProvidersByCategoryId, getToolProviderById, seedToolProviders,
  getUserConnectionsByUserId, getUserConnectionsByCategory, createUserConnection, updateUserConnection, disconnectUserConnection,
  getMappingsByCategoryId, getMappingsByProviderId, getMappingForAction, createAbstractionMapping,
  getContextObjectsByUserId, getContextObjectById, createContextObject, updateContextObject,
  getRequiredCategoriesByAgentId, getRequiredCategoriesByBlueprintId, getRequiredCategoriesByListingId,
  createAgentRequiredCategory, checkUserCompatibility,
  getProjectsByUserId, getProjectsByCompanyId, getProjectById, createProject, updateProject, deleteProject,
  getProjectFiles, createProjectFile, deleteProjectFile,
  getProjectChats, createProjectChat,
  getOnboardingByAgentId, getOnboardingById, getOnboardingsByUserId, getOnboardingsByCompanyId,
  createOnboarding, updateOnboarding, completeOnboarding,
  getStrategyProposalsByCompanyId, getStrategyProposalsByUserId, getStrategyProposalById,
  createStrategyProposal, updateStrategyProposalStatus,
  joinWaitlist, getWaitlistCount, isEmailOnWaitlist,
  createBriefingLog, getBriefingLogsByUserId, getBriefingLogsByCompanyId,
  createFeatureEvent, getFeatureEventsAll, getFeatureEventsSummary,
  createUserFeedback, getUserFeedbackAll, getUserFeedbackByUserId, updateFeedbackStatus,
  hasWelcomeEmailBeenSent, markWelcomeEmailSent,
  getChangelogEntries,
  insertPageView, getPageViewsByUser, getTopPagesByUser,
  upsertUserSession, getSessionsByUser,
  adminGetAllUsers, adminGetUserKpis, adminGetUserTimeline, adminGetDailyActivity,
  adminGetFunnelStats, adminGetUserFunnelStage,
  findOrCreateUserByEmail, getWaitlistInfo, adminApproveUser, adminRejectUser,
  adminBulkApproveUsers, adminGetWaitlistStats, adminGetWaitlistUsers, ensureWaitlistFields,
  getUserByIdForApproval,
  getAutonomySettings, upsertAutonomySettings,
  createRalfLog, getRalfLogsByTask, getRalfLogsByAgent, updateRalfLogStatus,
  createSubAgentRecommendation, getSubAgentRecommendations, getSubAgentRecommendationsByExecutive, updateSubAgentRecommendationStatus,
  getContextManifest, upsertContextManifest, getContextManifestsByUserId,
  createOnboardingSurvey, getOnboardingSurveyByCompanyId,
  adminGetAllSurveys, adminGetSurveyByUserId, adminGetUserCompany, adminGetUserOnboardings,
  createGuestSession, getGuestSession, updateGuestSession,
} from "./db";
import { nanoid } from "nanoid";
import { assembleContext } from "./integrations/contextAssembler";
import { seedDemoUser, getDemoUserId, DEMO_EMAIL } from "./demoUser";
import { PRODUCTS, type ProductKey } from "./stripe/products";
import { emitToUser } from "./socketEmit";
import { sendWelcomeEmail, sendWaitlistApprovalEmail } from "./email";


// ─── Companies Router ────────────────────────────────────────────────────────
const companiesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCompaniesByUserId(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCompanyById(input.id)),
  pnl: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getCompanyPnL(input.companyId)),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), mission: z.string().optional(), industry: z.string().optional(), website: z.string().optional(), monthlyBudget: z.number().optional(), briefingFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(), companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await createCompany({ userId: ctx.user.id, name: input.name, mission: input.mission, industry: input.industry, website: input.website, monthlyBudget: input.monthlyBudget ? String(input.monthlyBudget) : "0", briefingFrequency: input.briefingFrequency, companySize: input.companySize } as any);

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), mission: z.string().optional(), industry: z.string().optional(), website: z.string().optional(), status: z.enum(["active", "paused", "archived"]).optional(), monthlyBudget: z.number().optional(), briefingFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional() }))
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.mission !== undefined) data.mission = input.mission;
      if (input.industry !== undefined) data.industry = input.industry;
      if (input.website !== undefined) data.website = input.website;
      if (input.status) data.status = input.status;
      if (input.monthlyBudget !== undefined) data.monthlyBudget = String(input.monthlyBudget);
      if (input.briefingFrequency !== undefined) data.briefingFrequency = input.briefingFrequency;
      await updateCompany(input.id, data as any);
      return { success: true };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getCompaniesByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "Companies already exist" };
    await createCompany({ userId: ctx.user.id, name: "OpenCommand HQ", mission: "Build the intent-to-outcome engine that powers zero-human companies.", industry: "AI / SaaS", monthlyBudget: "5000.00", status: "active" });
    return { success: true };
  }),

  enrichWebsite: protectedProcedure
    .input(z.object({ companyId: z.number(), url: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const { load } = await import("cheerio");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(input.url, {
          headers: { "User-Agent": "OpenCommand-Bot/1.0" },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        if (!res.ok) return { success: false, error: "Could not reach website" };
        const html = await res.text();
        const $ = load(html);
        const title = $("title").first().text().trim() || $("meta[property='og:title']").attr("content")?.trim() || "";
        const description = $("meta[name='description']").attr("content")?.trim() || $("meta[property='og:description']").attr("content")?.trim() || "";
        const favicon = $("link[rel='icon']").attr("href") || $("link[rel='shortcut icon']").attr("href") || "/favicon.ico";
        const ogImage = $("meta[property='og:image']").attr("content")?.trim() || "";
        // Try to extract a tagline from h1
        const h1 = $("h1").first().text().trim() || "";
        const enrichment = { title, description, favicon, ogImage, h1 };
        // Update company mission/industry if they were empty
        const company = await getCompanyById(input.companyId);
        if (company) {
          const updates: Record<string, unknown> = {};
          if (!company.mission && description) updates.mission = description;
          if (Object.keys(updates).length > 0) await updateCompany(input.companyId, updates as any);
        }
        return { success: true, enrichment };
      } catch (err: any) {
        return { success: false, error: err.message ?? "Failed to fetch website" };
      }
    }),
});

// ─── Departments Router ──────────────────────────────────────────────────────
const departmentsRouter = router({
  list: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getDepartmentsByCompanyId(input.companyId)),
  create: protectedProcedure
    .input(z.object({ companyId: z.number(), name: z.string().min(1), budget: z.number().optional() }))
    .mutation(async ({ input }) => { await createDepartment({ companyId: input.companyId, name: input.name, budget: input.budget ? String(input.budget) : "0" }); return { success: true }; }),
  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), budget: z.number().optional(), headAgentId: z.number().optional() }))
    .mutation(async ({ input }) => { const d: Record<string, unknown> = {}; if (input.name) d.name = input.name; if (input.budget !== undefined) d.budget = String(input.budget); if (input.headAgentId !== undefined) d.headAgentId = input.headAgentId; await updateDepartment(input.id, d as any); return { success: true }; }),
  remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteDepartment(input.id); return { success: true }; }),
});

// ─── Agents Router ───────────────────────────────────────────────────────────
const agentTypeEnum = z.enum(["ceo", "cto", "cmo", "cfo", "vp", "manager", "specialist", "marketing", "research", "sales", "admin", "custom"]);
const agentStatusEnum = z.enum(["idle", "active", "paused", "error", "terminated"]);

const agentsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getAgentsByUserId(ctx.user.id)),
  listByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getAgentsByCompanyId(input.companyId)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getAgentById(input.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1), type: agentTypeEnum, description: z.string().optional(), capabilities: z.array(z.string()).optional(),
      companyId: z.number().optional(), departmentId: z.number().optional(), parentAgentId: z.number().optional(),
      roleTitle: z.string().optional(), jobDescription: z.string().optional(), tools: z.array(z.string()).optional(),
      connectorType: z.enum(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"]).optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      url: z.string().optional(),
      heartbeatCron: z.string().optional(), monthlyBudget: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Encrypt connector config if provided
      const rawConfig: Record<string, string> = {};
      if (input.apiKey) rawConfig.apiKey = input.apiKey;
      if (input.model) rawConfig.model = input.model;
      if (input.url) rawConfig.url = input.url;
      const encryptedConfig = Object.keys(rawConfig).length > 0
        ? encryptConnectorConfig(JSON.stringify(rawConfig))
        : null;
      await createAgent({
        userId: ctx.user.id, name: input.name, type: input.type, description: input.description,
        capabilities: input.capabilities ?? [], status: "idle",
        companyId: input.companyId, departmentId: input.departmentId, parentAgentId: input.parentAgentId,
        roleTitle: input.roleTitle, jobDescription: input.jobDescription, tools: input.tools ?? [],
        connectorType: input.connectorType ?? "internal",
        connectorConfig: encryptedConfig,
        heartbeatCron: input.heartbeatCron, heartbeatEnabled: !!input.heartbeatCron,
        monthlyBudget: input.monthlyBudget ? String(input.monthlyBudget) : "0",
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: agentStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      await updateAgentStatus(input.id, input.status);
      emitToUser(ctx.user.id, "agent_status", `Agent Status Updated`, `Agent #${input.id} is now ${input.status}`, { agentId: input.id, status: input.status });
      return { success: true };
    }),

  updateFull: protectedProcedure
    .input(z.object({
      id: z.number(), name: z.string().optional(), type: agentTypeEnum.optional(), description: z.string().optional(),
      roleTitle: z.string().optional(), jobDescription: z.string().optional(), parentAgentId: z.number().nullable().optional(),
      departmentId: z.number().nullable().optional(), companyId: z.number().nullable().optional(),
      heartbeatCron: z.string().nullable().optional(), heartbeatEnabled: z.boolean().optional(),
      monthlyBudget: z.number().optional(), budgetAlertThreshold: z.number().optional(),
      failoverAgentId: z.number().nullable().optional(),
      connectorType: z.enum(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, monthlyBudget, budgetAlertThreshold, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (monthlyBudget !== undefined) data.monthlyBudget = String(monthlyBudget);
      if (budgetAlertThreshold !== undefined) data.budgetAlertThreshold = String(budgetAlertThreshold);
      await updateAgent(id, data as any);
      return { success: true };
    }),

  remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteAgent(input.id); return { success: true }; }),

  // ── BYOA: save encrypted connector config ──────────────────────────────────
  updateConnector: protectedProcedure
    .input(z.object({
      id: z.number(),
      connectorType: z.enum(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"]),
      // Raw config fields — never stored as-is; encrypted before DB write
      apiKey: z.string().optional(),
      model: z.string().optional(),
      url: z.string().optional(),
      authHeader: z.string().optional(),
      crewName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, connectorType, apiKey, model, url, authHeader, crewName } = input;
      // Build raw config object from provided fields
      const rawConfig: Record<string, string> = {};
      if (apiKey) rawConfig.apiKey = apiKey;
      if (model) rawConfig.model = model;
      if (url) rawConfig.url = url;
      if (authHeader) rawConfig.authHeader = authHeader;
      if (crewName) rawConfig.crewName = crewName;
      const encryptedConfig = Object.keys(rawConfig).length > 0
        ? encryptConnectorConfig(JSON.stringify(rawConfig))
        : null;
      await updateAgent(id, { connectorType, connectorConfig: encryptedConfig } as any);
      // Return masked key for display — never return raw key
      return {
        success: true,
        connectorType,
        maskedApiKey: apiKey ? maskApiKey(apiKey) : null,
      };
    }),

  // ── BYOA: test connector credentials ──────────────────────────────────────
  testConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const agent = await getAgentById(input.id);
      if (!agent) throw new Error("Agent not found");
      if (!agent.connectorType || agent.connectorType === "internal") {
        return { ok: true, message: "Internal connector is always available." };
      }
      if (!agent.connectorConfig) {
        return { ok: false, message: "No connector config saved. Please enter your credentials first." };
      }
      const result = await testConnector(agent.connectorType, agent.connectorConfig);
      return result;
    }),

  capabilities: protectedProcedure.input(z.object({ agentId: z.number() })).query(({ input }) => getCapabilitiesByAgentId(input.agentId)),
  addCapability: protectedProcedure
    .input(z.object({ agentId: z.number(), category: z.string(), capability: z.string(), proficiency: z.enum(["basic", "intermediate", "advanced", "expert"]).optional() }))
    .mutation(async ({ input }) => { await createAgentCapability({ agentId: input.agentId, category: input.category, capability: input.capability, proficiency: input.proficiency ?? "intermediate" }); return { success: true }; }),
  removeCapability: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteAgentCapability(input.id); return { success: true }; }),

  heartbeatLog: protectedProcedure.input(z.object({ agentId: z.number() })).query(({ input }) => getHeartbeatLogByAgentId(input.agentId)),

  triggerHeartbeat: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");

      // Auto-pause if external connector is unreachable before doing any work
      if (agent.connectorType !== "internal" && agent.connectorConfig) {
        const connTest = await testConnector(agent.connectorType, agent.connectorConfig).catch(() => ({ ok: false as const, message: "Connection check failed" }));
        if (!connTest.ok) {
          await updateAgent(input.agentId, { status: "paused", heartbeatEnabled: false });
          await createHeartbeatLogEntry({ agentId: input.agentId, companyId: agent.companyId, status: "error", tasksChecked: 0, tasksActedOn: 0, duration: 0, tokenCost: "0" });
          await notifyOwner({
            title: `Agent Paused: ${agent.name}`,
            content: `Heartbeat auto-paused ${agent.name} because the ${agent.connectorType} connector failed health check: ${connTest.message}. Go to the Connector tab to update credentials and resume.`,
          }).catch(() => {});
          emitToUser(ctx.user.id, "agent_status", `${agent.name} paused`, `Connector check failed: ${connTest.message}`, { agentId: input.agentId });
          return { success: false, paused: true, reason: connTest.message, tasksChecked: 0, tasksActedOn: 0, duration: 0 };
        }
      }

      const start = Date.now();
      const pendingTasks = (await getTasksByUserId(ctx.user.id)).filter(t => t.status === "pending" && (t.agentId === input.agentId || !t.agentId));
      let tasksActedOn = 0;
      for (const task of pendingTasks.slice(0, 3)) {
        await updateTask(task.id, { agentId: input.agentId, status: "in_progress" });
        tasksActedOn++;
      }
      const duration = Date.now() - start;
      await createHeartbeatLogEntry({ agentId: input.agentId, companyId: agent.companyId, status: "success", tasksChecked: pendingTasks.length, tasksActedOn, duration, tokenCost: "0.0050" });
      await updateAgent(input.agentId, { lastHeartbeat: new Date() });

      // ─── Context Manifest: declare data sources this executive accessed ──────
      // Executive agents (ceo/cmo/cto/cfo) save a manifest of their data sources
      // so sub-agents can inherit the same context frame without re-assembling.
      const executiveTypes = ["ceo", "cmo", "cfo", "cto"];
      if (executiveTypes.includes(agent.type)) {
        try {
          // Map executive type to canonical data sources
          const dataSourceMap: Record<string, string[]> = {
            ceo:  ["mission_control", "okrs", "analytics", "briefings", "decision_log"],
            cmo:  ["meta_ads", "google_ads", "hubspot", "ga4", "tiktok_ads", "content"],
            cto:  ["github", "jira", "datadog", "code_review", "architecture"],
            cfo:  ["stripe", "quickbooks", "salesforce", "arr", "budget", "runway"],
          };
          const dataSources = dataSourceMap[agent.type] ?? [];
          const contextSummary = `${agent.name} heartbeat — accessed ${dataSources.length} data sources: ${dataSources.join(", ")}. ${tasksActedOn} tasks acted on.`;
          await upsertContextManifest({
            agentId: input.agentId,
            userId: ctx.user.id,
            executiveType: agent.type as "ceo" | "cmo" | "cto" | "cfo",
            dataSources,
            contextSummary,
            liveStateSnapshot: { tasksChecked: pendingTasks.length, tasksActedOn, heartbeatAt: new Date().toISOString() },
          });
        } catch (_) { /* non-fatal — manifest save failure should not block heartbeat */ }
      }

      emitToUser(ctx.user.id, "heartbeat", `Heartbeat: ${agent.name}`, `Checked ${pendingTasks.length} tasks, acted on ${tasksActedOn}. Duration: ${duration}ms`, { agentId: input.agentId, tasksChecked: pendingTasks.length, tasksActedOn });
      return { success: true, tasksChecked: pendingTasks.length, tasksActedOn, duration };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getAgentsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "Agents already exist" };
    const comps = await getCompaniesByUserId(ctx.user.id);
    const companyId = comps[0]?.id ?? null;
    const defaults = [
      { name: "ARCH — AI CEO", type: "ceo" as const, roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"] },
      { name: "NOVA — CMO", type: "cmo" as const, roleTitle: "Chief Marketing Officer", description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"], tools: ["mailchimp", "analytics", "social-scheduler"] },
      { name: "SAGE — CTO", type: "cto" as const, roleTitle: "Chief Technology Officer", description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"], tools: ["github", "jira", "datadog"] },
      { name: "TED — AI CFO", type: "cfo" as const, roleTitle: "Chief Financial Officer", description: "Financial intelligence agent managing budget, runway, and fiscal strategy.", capabilities: ["financial-modeling", "budget-tracking", "revenue-analysis", "risk-assessment"], tools: ["stripe", "quickbooks", "analytics"] },
      { name: "APEX — VP Sales", type: "vp" as const, roleTitle: "VP of Sales", description: "Autonomous outreach, pipeline management, and deal closing agent.", capabilities: ["lead-scoring", "outreach", "crm-sync", "follow-up"], tools: ["stripe", "hubspot", "calendly"] },
      { name: "ECHO — Specialist", type: "specialist" as const, roleTitle: "Operations Specialist", description: "Operations and administrative task automation agent.", capabilities: ["scheduling", "reporting", "document-management", "workflow-automation"], tools: ["notion", "slack", "zapier"] },
    ];
    for (const agent of defaults) {
      await createAgent({ userId: ctx.user.id, companyId, ...agent, status: "idle" } as any);
    }
    return { success: true };
  }),

  importFromSpec: protectedProcedure
    .input(z.object({
      spec: z.record(z.string(), z.unknown()),
      companyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const spec = input.spec as any;
      const name = spec.name || spec.agentName || "Generated Agent";
      const roleTitle = spec.role || spec.roleTitle || "Specialist";
      const description = spec.systemInstructions || spec.description || "";
      const capabilities = spec.capabilities || [];
      const tools = spec.dataSources || [];
      
      await createAgent({
        userId: ctx.user.id,
        name,
        type: "specialist",
        roleTitle,
        description,
        capabilities,
        tools,
        companyId: input.companyId,
        status: "idle",
        builtWithSigma: true,
        sigmaSpec: input.spec,
      } as any);
      
      return { success: true, message: `Agent "${name}" imported` };
    }),

  // ── Agent Templates: pre-built configs for one-click deploy ──────────────
  listTemplates: publicProcedure.query(() => {
    return [
      { id: "sales-sdr", name: "Sales SDR", category: "sales", description: "Qualifies inbound leads, sends personalized outreach, and books meetings. Integrates with HubSpot and email.", type: "sales", roleTitle: "Sales Development Representative", capabilities: ["lead qualification", "email outreach", "meeting scheduling", "CRM updates"], tools: ["HubSpot", "Email", "Calendar"], estimatedROI: "$8K–$15K/mo in pipeline", icon: "TrendingUp", color: "emerald" },
      { id: "marketing-growth", name: "Growth Marketer", category: "marketing", description: "Manages ad campaigns across Meta, Google, and TikTok. Optimizes spend, generates reports, and flags anomalies.", type: "marketing", roleTitle: "Growth Marketing Agent", capabilities: ["campaign management", "budget optimization", "performance reporting", "A/B testing"], tools: ["Meta Ads", "Google Ads", "TikTok Ads", "GA4"], estimatedROI: "20–35% improvement in ROAS", icon: "BarChart3", color: "blue" },
      { id: "research-analyst", name: "Research Analyst", category: "research", description: "Monitors competitors, synthesizes market intelligence, and delivers weekly briefings with actionable insights.", type: "research", roleTitle: "Market Research Agent", capabilities: ["competitive analysis", "market research", "trend detection", "briefing generation"], tools: ["Web search", "News feeds", "Industry databases"], estimatedROI: "40+ hours/mo saved", icon: "Search", color: "violet" },
      { id: "finance-controller", name: "Finance Controller", category: "finance", description: "Tracks P&L, flags budget overruns, reconciles expenses, and generates financial summaries for leadership.", type: "cfo", roleTitle: "Financial Controller Agent", capabilities: ["P&L tracking", "budget monitoring", "expense reconciliation", "financial reporting"], tools: ["QuickBooks", "Stripe", "Bank feeds"], estimatedROI: "$3K–$8K/mo in oversight savings", icon: "DollarSign", color: "amber" },
      { id: "customer-success", name: "Customer Success", category: "sales", description: "Monitors customer health scores, triggers proactive outreach for at-risk accounts, and escalates churn signals.", type: "specialist", roleTitle: "Customer Success Agent", capabilities: ["health scoring", "churn detection", "proactive outreach", "escalation management"], tools: ["HubSpot", "Intercom", "Salesforce"], estimatedROI: "15–25% reduction in churn", icon: "Heart", color: "pink" },
      { id: "engineering-ops", name: "Engineering Ops", category: "engineering", description: "Monitors CI/CD pipelines, triages bug reports, tracks sprint velocity, and flags deployment anomalies.", type: "cto", roleTitle: "Engineering Operations Agent", capabilities: ["pipeline monitoring", "bug triage", "sprint tracking", "incident detection"], tools: ["GitHub", "Jira", "PagerDuty"], estimatedROI: "30% faster incident resolution", icon: "Code", color: "cyan" },
    ];
  }),

  deployFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      name: z.string().optional(),
      companyId: z.number().optional(),
      connectorType: z.enum(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const templates: Record<string, any> = {
        "sales-sdr": { type: "sales", roleTitle: "Sales Development Representative", description: "Qualifies inbound leads, sends personalized outreach, and books meetings.", capabilities: ["lead qualification", "email outreach", "meeting scheduling", "CRM updates"], tools: ["HubSpot", "Email", "Calendar"] },
        "marketing-growth": { type: "marketing", roleTitle: "Growth Marketing Agent", description: "Manages ad campaigns across Meta, Google, and TikTok. Optimizes spend and flags anomalies.", capabilities: ["campaign management", "budget optimization", "performance reporting"], tools: ["Meta Ads", "Google Ads", "TikTok Ads", "GA4"] },
        "research-analyst": { type: "research", roleTitle: "Market Research Agent", description: "Monitors competitors, synthesizes market intelligence, and delivers weekly briefings.", capabilities: ["competitive analysis", "market research", "trend detection"], tools: ["Web search", "News feeds"] },
        "finance-controller": { type: "cfo", roleTitle: "Financial Controller Agent", description: "Tracks P&L, flags budget overruns, and generates financial summaries.", capabilities: ["P&L tracking", "budget monitoring", "expense reconciliation"], tools: ["QuickBooks", "Stripe"] },
        "customer-success": { type: "specialist", roleTitle: "Customer Success Agent", description: "Monitors customer health scores and triggers proactive outreach for at-risk accounts.", capabilities: ["health scoring", "churn detection", "proactive outreach"], tools: ["HubSpot", "Intercom", "Salesforce"] },
        "engineering-ops": { type: "cto", roleTitle: "Engineering Operations Agent", description: "Monitors CI/CD pipelines, triages bug reports, and tracks sprint velocity.", capabilities: ["pipeline monitoring", "bug triage", "sprint tracking"], tools: ["GitHub", "Jira"] },
      };
      const tmpl = templates[input.templateId];
      if (!tmpl) throw new Error("Template not found");
      const agentName = input.name || tmpl.roleTitle;
      await createAgent({ userId: ctx.user.id, name: agentName, type: tmpl.type, roleTitle: tmpl.roleTitle, description: tmpl.description, capabilities: tmpl.capabilities, tools: tmpl.tools, companyId: input.companyId, connectorType: input.connectorType ?? "internal", status: "idle" } as any);
      return { success: true, message: `${agentName} deployed from template` };
    }),
});

// ─── OKRs Router ─────────────────────────────────────────────────────────────
const okrsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getOkrsByUserId(ctx.user.id)),
  listByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getOkrsByCompanyId(input.companyId)),

  create: protectedProcedure
    .input(z.object({ objective: z.string().min(1), keyResult: z.string().min(1), targetValue: z.number(), currentValue: z.number().optional(), unit: z.string().optional(), dueDate: z.string().optional(), companyId: z.number().optional(), agentId: z.number().optional(), level: z.enum(["company", "department", "agent", "task"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await createOkr({ userId: ctx.user.id, objective: input.objective, keyResult: input.keyResult, targetValue: String(input.targetValue), currentValue: String(input.currentValue ?? 0), unit: input.unit ?? "", dueDate: input.dueDate ? new Date(input.dueDate) : undefined, status: "on_track", companyId: input.companyId, agentId: input.agentId, level: input.level ?? "company" });
      return { success: true };
    }),

  updateProgress: protectedProcedure
    .input(z.object({ id: z.number(), currentValue: z.number(), status: z.enum(["on_track", "at_risk", "achieved", "missed"]) }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the OKR before update to detect status transitions
      const existing = await getOkrById(input.id);
      await updateOkrProgress(input.id, String(input.currentValue), input.status);
      emitToUser(ctx.user.id, "okr_updated", "OKR Progress Updated", `OKR #${input.id} → ${input.currentValue} (${input.status})`, { okrId: input.id, currentValue: input.currentValue, status: input.status });

      // Notify owner for strategy-sourced OKRs that hit achieved or at_risk
      if (existing && (existing as any).source === "strategy") {
        const prevStatus = existing.status;
        const newStatus = input.status;
        if (newStatus === "achieved" && prevStatus !== "achieved") {
          const progress = existing.targetValue
            ? Math.round((input.currentValue / Number(existing.targetValue)) * 100)
            : 100;
          await notifyOwner({
            title: `OKR Achieved — ${existing.objective}`,
            content: `Your strategy OKR "${existing.objective}" has been marked as achieved.\n\nKey Result: ${existing.keyResult}\nProgress: ${input.currentValue.toLocaleString()} / ${Number(existing.targetValue).toLocaleString()} ${existing.unit} (${progress}%)\n\nVisit Mission Control → OKRs to review your progress.`,
          });
        } else if (newStatus === "at_risk" && prevStatus !== "at_risk") {
          await notifyOwner({
            title: `OKR At Risk — ${existing.objective}`,
            content: `Your strategy OKR "${existing.objective}" has been flagged as at risk.\n\nKey Result: ${existing.keyResult}\nCurrent Progress: ${input.currentValue.toLocaleString()} / ${Number(existing.targetValue).toLocaleString()} ${existing.unit}\n\nVisit Mission Control → OKRs to review and take corrective action.`,
          });
        }
      }

      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteOkr(input.id); return { success: true }; }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getOkrsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "OKRs already exist" };
    const comps = await getCompaniesByUserId(ctx.user.id);
    const companyId = comps[0]?.id ?? undefined;
    const defaults = [
      { objective: "Reach Product-Market Fit", keyResult: "Achieve $50K Monthly Recurring Revenue", targetValue: 50000, currentValue: 12400, unit: "USD/mo", status: "on_track" as const, level: "company" as const },
      { objective: "Build a Thriving Agent Marketplace", keyResult: "Onboard 100 active AI agents", targetValue: 100, currentValue: 23, unit: "agents", status: "on_track" as const, level: "company" as const },
      { objective: "Prove the Proof of Outcome Model", keyResult: "Generate 500 verified PoO receipts", targetValue: 500, currentValue: 87, unit: "receipts", status: "on_track" as const, level: "company" as const },
      { objective: "Scale Creator Partnership Program", keyResult: "Sign 25 creator endorsement deals", targetValue: 25, currentValue: 6, unit: "deals", status: "at_risk" as const, level: "company" as const },
    ];
    for (const okr of defaults) {
      await createOkr({ userId: ctx.user.id, companyId, ...okr, targetValue: String(okr.targetValue), currentValue: String(okr.currentValue) });
    }
    return { success: true };
  }),
});

// ─── Tasks Router ────────────────────────────────────────────────────────────
const tasksRouter = router({
  list: protectedProcedure.query(({ ctx }) => getTasksByUserId(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTaskById(input.id)),
  threads: protectedProcedure.input(z.object({ taskId: z.number() })).query(({ input }) => getThreadsByTaskId(input.taskId)),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), description: z.string().optional(), routingMode: z.enum(["ai", "human", "hybrid"]).default("ai"), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), agentId: z.number().optional(), companyId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await createTask({ userId: ctx.user.id, title: input.title, description: input.description, routingMode: input.routingMode, priority: input.priority, agentId: input.agentId, companyId: input.companyId, status: "pending" });
      return { success: true };
    }),

  addThread: protectedProcedure
    .input(z.object({ taskId: z.number(), content: z.string(), role: z.enum(["agent", "human", "system"]).default("human") }))
    .mutation(async ({ ctx, input }) => { await createTaskThread({ taskId: input.taskId, userId: ctx.user.id, content: input.content, role: input.role }); return { success: true }; }),

  delegate: protectedProcedure
    .input(z.object({ taskId: z.number(), toAgentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new Error("Task not found");
      await updateTask(input.taskId, { status: "delegated", delegatedFromAgentId: task.agentId, delegatedToAgentId: input.toAgentId, agentId: input.toAgentId });
      await createTaskThread({ taskId: input.taskId, role: "system", content: `Task delegated to agent #${input.toAgentId}` });
      return { success: true };
    }),

  generatePrompt: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new Error("Task not found");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are the OpenCommand AI Agent CEO. Generate a precise, structured execution prompt for an AI agent to complete the following task. Format the prompt as a clear set of instructions with defined inputs, expected outputs, success criteria, and estimated time. Be specific and actionable." },
          { role: "user", content: `Task: ${task.title}\nDescription: ${task.description ?? "No additional description"}\nRouting Mode: ${task.routingMode}\nPriority: ${task.priority}` },
        ],
      });
      const prompt = (response.choices[0]?.message?.content ?? "") as string;
      await updateTask(input.taskId, { generatedPrompt: prompt });
      return { prompt };
    }),

  executeTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new Error("Task not found");
      await updateTask(input.taskId, { status: "in_progress" });
      // Resolve the agent for this task (may be assigned or inferred)
      const taskAgent = task.agentId ? await getAgentById(task.agentId) : null;
      // ─── Context Manifest Inheritance ────────────────────────────────────────
      // If the task's agent has a parent executive, fetch that executive's context
      // manifest so the sub-agent operates within the same data frame.
      let inheritedContextBlock = "";
      if (taskAgent?.parentAgentId) {
        try {
          const parentManifest = await getContextManifest(taskAgent.parentAgentId);
          if (parentManifest) {
            inheritedContextBlock = `\n\nContext Frame (inherited from ${parentManifest.executiveType?.toUpperCase() ?? "executive"} executive):\nData Sources: ${(parentManifest.dataSources as string[]).join(", ")}\nContext Summary: ${parentManifest.contextSummary ?? ""}\nLast Updated: ${parentManifest.assembledAt?.toISOString() ?? "unknown"}`;
          }
        } catch (_) { /* non-fatal */ }
      } else if (taskAgent) {
        // The task agent itself may be an executive — use its own manifest
        try {
          const ownManifest = await getContextManifest(taskAgent.id);
          if (ownManifest) {
            inheritedContextBlock = `\n\nContext Frame (own manifest):\nData Sources: ${(ownManifest.dataSources as string[]).join(", ")}\nContext Summary: ${ownManifest.contextSummary ?? ""}`;
          }
        } catch (_) { /* non-fatal */ }
      }
      const execSystemPrompt = `You are the OpenCommand AI Agent CEO executing a task autonomously. Complete the task and provide: 1) A detailed outcome description, 2) Estimated labor hours saved vs doing this manually, 3) Dollar value created (use $150/hr benchmark), 4) Estimated cost of this execution. Respond in JSON format with keys: outcome, laborHoursSaved, dollarValueCreated, costIncurred, executionSteps (array of strings).${inheritedContextBlock}`;
      const execUserMessage = `Execute this task:\nTitle: ${task.title}\nDescription: ${task.description ?? ""}\nPrompt: ${task.generatedPrompt ?? ""}`;
      const dispatchResult = await dispatchToConnector({
        connectorType: taskAgent?.connectorType ?? "internal",
        connectorConfig: taskAgent?.connectorConfig ?? null,
        agentName: taskAgent?.name ?? "OpenCommand Agent",
        agentRole: taskAgent?.roleTitle ?? "AI Agent",
        systemPrompt: execSystemPrompt,
        userMessage: execUserMessage,
      });
      let result = { outcome: "Task completed successfully.", laborHoursSaved: 2, dollarValueCreated: 300, costIncurred: 0.12, executionSteps: ["Task analyzed", "Execution completed"] };
      try { result = JSON.parse(dispatchResult.content); } catch (_) { if (dispatchResult.content) result.outcome = dispatchResult.content; }
      const receiptNumber = `POO-${Date.now()}-${nanoid(6).toUpperCase()}`;
      await createPooReceipt({ taskId: input.taskId, userId: ctx.user.id, companyId: task.companyId, receiptNumber, taskTitle: task.title, outcome: result.outcome, laborHoursSaved: String(result.laborHoursSaved), dollarValueCreated: String(result.dollarValueCreated), costIncurred: String(result.costIncurred), verificationStatus: "verified" });
      await updateTask(input.taskId, { status: "completed", completedAt: new Date(), executionLog: result.executionSteps, actualHours: String(result.laborHoursSaved), totalCost: String(result.costIncurred) });
      await createInboxItem({ userId: ctx.user.id, companyId: task.companyId, taskId: input.taskId, type: "poo_generated", title: `PoO Receipt Generated: ${task.title}`, body: `Task completed. $${result.dollarValueCreated.toFixed(2)} value created. ${result.laborHoursSaved} hours saved. Cost: $${result.costIncurred.toFixed(4)}. Receipt: ${receiptNumber}`, priority: "medium" });
      await createDecisionLogEntry({ userId: ctx.user.id, companyId: task.companyId, taskId: input.taskId, decisionType: "task_execution", context: task.description ?? task.title, decision: `Execute task via ${task.routingMode} routing`, rationale: "Autonomous execution by AI Agent CEO", outcome: result.outcome, wasSuccessful: true });
      if (task.agentId) {
        const agent = await getAgentById(task.agentId);
        if (agent) await updateAgent(task.agentId, { tasksCompleted: agent.tasksCompleted + 1, totalValueCreated: String(Number(agent.totalValueCreated) + result.dollarValueCreated), totalCostIncurred: String(Number(agent.totalCostIncurred) + result.costIncurred), budgetUsed: String(Number(agent.budgetUsed) + result.costIncurred) });
      }
      try { await notifyOwner({ title: `Task Completed: ${task.title}`, content: `Receipt ${receiptNumber} — $${result.dollarValueCreated} value created, ${result.laborHoursSaved}h saved. Cost: $${result.costIncurred}` }); } catch (_) {}
      // Emit real-time events for task completion, PoO receipt, and inbox item
      emitToUser(ctx.user.id, "task_completed", `Task Completed: ${task.title}`, `$${result.dollarValueCreated.toFixed(2)} value created · ${result.laborHoursSaved}h saved`, { taskId: input.taskId, receiptNumber, dollarValueCreated: result.dollarValueCreated });
      emitToUser(ctx.user.id, "poo_receipt", `PoO Receipt: ${receiptNumber}`, `Verified receipt for "${task.title}" — $${result.dollarValueCreated.toFixed(2)} value`, { receiptNumber, taskTitle: task.title });
      emitToUser(ctx.user.id, "inbox_item", "New Inbox Item", `PoO Receipt Generated: ${task.title}`, { taskId: input.taskId });
      return { success: true, receiptNumber, outcome: result.outcome, laborHoursSaved: result.laborHoursSaved, dollarValueCreated: result.dollarValueCreated, costIncurred: result.costIncurred };
    }),
});

// ─── PoO Receipts Router ─────────────────────────────────────────────────────
const pooRouter = router({
  list: protectedProcedure.query(({ ctx }) => getPooReceiptsByUserId(ctx.user.id)),
  summary: protectedProcedure.query(({ ctx }) => getPooSummaryByUserId(ctx.user.id)),
  getByNumber: publicProcedure.input(z.object({ receiptNumber: z.string().min(1) })).query(async ({ input }) => {
    const receipt = await getPooReceiptByNumber(input.receiptNumber);
    if (!receipt) return null;
    return {
      receiptNumber: receipt.receiptNumber,
      taskTitle: receipt.taskTitle,
      outcome: receipt.outcome,
      laborHoursSaved: receipt.laborHoursSaved,
      dollarValueCreated: receipt.dollarValueCreated,
      costIncurred: receipt.costIncurred,
      hourlyRateBenchmark: receipt.hourlyRateBenchmark,
      verificationStatus: receipt.verificationStatus,
      createdAt: receipt.createdAt,
    };
  }),
});

// ─── Inbox Router ────────────────────────────────────────────────────────────
const inboxRouter = router({
  list: protectedProcedure.query(({ ctx }) => getInboxItemsByUserId(ctx.user.id)),
  resolve: protectedProcedure.input(z.object({ id: z.number(), resolution: z.string() })).mutation(async ({ input }) => { await resolveInboxItem(input.id, input.resolution); return { success: true }; }),
  dismiss: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await dismissInboxItem(input.id); return { success: true }; }),
  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await markInboxItemRead(input.id); return { success: true }; }),
});

// ─── Approval Gates Router ───────────────────────────────────────────────────
const governanceRouter = router({
  gates: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getApprovalGatesByCompanyId(input.companyId)),
  createGate: protectedProcedure
    .input(z.object({ companyId: z.number(), gateType: z.enum(["spend", "hire", "strategy", "terminate", "custom"]), threshold: z.number().optional(), description: z.string().optional(), autoApproveBelow: z.number().optional() }))
    .mutation(async ({ input }) => { await createApprovalGate({ companyId: input.companyId, gateType: input.gateType, threshold: input.threshold ? String(input.threshold) : undefined, description: input.description, autoApproveBelow: input.autoApproveBelow ? String(input.autoApproveBelow) : undefined }); return { success: true }; }),
  updateGate: protectedProcedure
    .input(z.object({ id: z.number(), threshold: z.number().optional(), description: z.string().optional(), isActive: z.boolean().optional(), autoApproveBelow: z.number().optional() }))
    .mutation(async ({ input }) => { const d: Record<string, unknown> = {}; if (input.threshold !== undefined) d.threshold = String(input.threshold); if (input.description !== undefined) d.description = input.description; if (input.isActive !== undefined) d.isActive = input.isActive; if (input.autoApproveBelow !== undefined) d.autoApproveBelow = String(input.autoApproveBelow); await updateApprovalGate(input.id, d as any); return { success: true }; }),
  removeGate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteApprovalGate(input.id); return { success: true }; }),
  auditLog: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getAuditLogByCompanyId(input.companyId)),
  killSwitch: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyAgents = await getAgentsByCompanyId(input.companyId);
      for (const agent of companyAgents) { await updateAgentStatus(agent.id, "paused"); }
      await updateCompany(input.companyId, { status: "paused" } as any);
      await createAuditLogEntry({ companyId: input.companyId, userId: ctx.user.id, action: "KILL_SWITCH_ACTIVATED", details: `All ${companyAgents.length} agents paused. Company operations halted.` });
      await createInboxItem({ userId: ctx.user.id, companyId: input.companyId, type: "kill_switch", title: "KILL SWITCH ACTIVATED", body: `Emergency shutdown initiated. ${companyAgents.length} agents paused.`, priority: "critical" });
      try { await notifyOwner({ title: "KILL SWITCH ACTIVATED", content: `Company #${input.companyId} emergency shutdown. ${companyAgents.length} agents paused.` }); } catch (_) {}
      emitToUser(ctx.user.id, "kill_switch", "KILL SWITCH ACTIVATED", `Emergency shutdown — ${companyAgents.length} agents paused. Company #${input.companyId} halted.`, { companyId: input.companyId, agentsPaused: companyAgents.length });
      return { success: true, agentsPaused: companyAgents.length };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const comps = await getCompaniesByUserId(ctx.user.id);
    if (comps.length === 0) return { success: true, message: "No company found" };
    const companyId = comps[0]!.id;
    const existing = await getApprovalGatesByCompanyId(companyId);
    if (existing.length > 0) return { success: true, message: "Gates already exist" };
    const gates = [
      { gateType: "spend" as const, threshold: "500.00", description: "Spending over $500 requires human approval", autoApproveBelow: "100.00" },
      { gateType: "hire" as const, threshold: "1.00", description: "Adding new agents requires approval", autoApproveBelow: "0" },
      { gateType: "strategy" as const, threshold: "1.00", description: "Strategic pivots require human review" },
      { gateType: "terminate" as const, threshold: "1.00", description: "Agent termination requires approval" },
    ];
    for (const g of gates) { await createApprovalGate({ companyId, ...g }); }
    return { success: true };
  }),
});

// ─── Blueprints Router ───────────────────────────────────────────────────────
const blueprintsRouter = router({
  list: publicProcedure.query(() => getActiveBlueprints()),
  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getBlueprintById(input.id)),
  myBlueprints: protectedProcedure.query(({ ctx }) => getBlueprintsByUserId(ctx.user.id)),
  reviews: publicProcedure.input(z.object({ blueprintId: z.number() })).query(({ input }) => getReviewsByBlueprintId(input.blueprintId)),
  deployments: protectedProcedure.input(z.object({ blueprintId: z.number() })).query(({ input }) => getDeploymentsByBlueprintId(input.blueprintId)),
  myDeployments: protectedProcedure.query(({ ctx }) => getDeploymentsByUserId(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1), tagline: z.string().optional(), description: z.string().optional(), category: z.string().optional(), industry: z.string().optional(),
      pricingModel: z.enum(["one_time", "monthly", "revenue_share", "franchise"]).optional(), price: z.number().optional(), revenueSharePct: z.number().optional(),
      sourceCompanyId: z.number().optional(), agentCount: z.number().optional(), estimatedMonthlyCost: z.number().optional(), estimatedMonthlyRevenue: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let orgStructure = null; let agentConfigs = null;
      if (input.sourceCompanyId) {
        const compAgents = await getAgentsByCompanyId(input.sourceCompanyId);
        const depts = await getDepartmentsByCompanyId(input.sourceCompanyId);
        orgStructure = { departments: depts.map(d => ({ name: d.name, budget: d.budget })), agentHierarchy: compAgents.map(a => ({ name: a.name, type: a.type, roleTitle: a.roleTitle, parentAgentId: a.parentAgentId })) };
        agentConfigs = compAgents.map(a => ({ name: a.name, type: a.type, roleTitle: a.roleTitle, description: a.description, capabilities: a.capabilities, tools: a.tools, connectorType: a.connectorType, heartbeatCron: a.heartbeatCron, monthlyBudget: a.monthlyBudget }));
      }
      await createBlueprint({
        creatorUserId: ctx.user.id, name: input.name, tagline: input.tagline, description: input.description, category: input.category,
        pricingModel: input.pricingModel ?? "monthly", price: input.price ? String(input.price) : undefined, revenueSharePct: input.revenueSharePct ? String(input.revenueSharePct) : undefined,
        sourceCompanyId: input.sourceCompanyId, agentCount: input.agentCount ?? 0, estimatedMonthlyCost: input.estimatedMonthlyCost ? String(input.estimatedMonthlyCost) : undefined,
        orgStructure, agentConfigs,
      });
      return { success: true };
    }),

  deploy: protectedProcedure
    .input(z.object({ blueprintId: z.number(), companyName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const bp = await getBlueprintById(input.blueprintId);
      if (!bp) throw new Error("Blueprint not found");
      const comp = await createCompany({ userId: ctx.user.id, name: input.companyName ?? `${bp.name} Instance`, mission: bp.description ?? "", industry: bp.category ?? "AI" });
      const comps = await getCompaniesByUserId(ctx.user.id);
      const newCompany = comps[0];
      if (!newCompany) throw new Error("Failed to create company");
      if (bp.agentConfigs && Array.isArray(bp.agentConfigs)) {
        for (const cfg of bp.agentConfigs as any[]) {
          await createAgent({ userId: ctx.user.id, companyId: newCompany.id, name: cfg.name ?? "Agent", type: cfg.type ?? "custom", roleTitle: cfg.roleTitle, description: cfg.description, capabilities: cfg.capabilities ?? [], tools: cfg.tools ?? [], connectorType: cfg.connectorType ?? "internal", heartbeatCron: cfg.heartbeatCron, heartbeatEnabled: !!cfg.heartbeatCron, monthlyBudget: cfg.monthlyBudget ?? "0", status: "idle" } as any);
        }
      }
      await createBlueprintDeployment({ blueprintId: input.blueprintId, userId: ctx.user.id, companyId: newCompany.id, status: "active" });
      await updateBlueprint(input.blueprintId, { totalDeployments: (bp.totalDeployments ?? 0) + 1 });
      await createAuditLogEntry({ companyId: newCompany.id, userId: ctx.user.id, action: "BLUEPRINT_DEPLOYED", entityType: "blueprint", entityId: input.blueprintId, details: `Blueprint "${bp.name}" deployed as company "${newCompany.name}"` });
      return { success: true, companyId: newCompany.id };
    }),

  addReview: protectedProcedure
    .input(z.object({ blueprintId: z.number(), rating: z.number().min(1).max(5), review: z.string().optional(), verifiedValueCreated: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await createBlueprintReview({ blueprintId: input.blueprintId, userId: ctx.user.id, rating: input.rating, review: input.review, verifiedValueCreated: input.verifiedValueCreated ? String(input.verifiedValueCreated) : undefined });
      return { success: true };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getActiveBlueprints();
    if (existing.length > 0) return { success: true, message: "Blueprints already exist" };
    const seeds = [
      { name: "Content Marketing Agency", tagline: "5-agent content factory generating $15K+/mo", category: "Marketing", pricingModel: "monthly" as const, price: "299.00", agentCount: 5, estimatedMonthlyCost: "120.00", totalDeployments: 147, avgRating: "4.80", totalValueGenerated: "2450000.00", isCertified: true, performanceScore: "92.50", description: "A fully autonomous content marketing agency with SEO Strategist, Content Writer, Social Media Manager, Email Marketer, and Analytics Agent. Generates blog posts, social content, email sequences, and monthly performance reports." },
      { name: "E-Commerce Operator", tagline: "Autonomous Shopify store management", category: "E-Commerce", pricingModel: "revenue_share" as const, revenueSharePct: "5.00", agentCount: 4, estimatedMonthlyCost: "85.00", totalDeployments: 89, avgRating: "4.70", totalValueGenerated: "1890000.00", isCertified: true, performanceScore: "88.30", description: "End-to-end e-commerce operations: Product Listing Agent, Customer Service Agent, Inventory Manager, and Marketing Agent. Handles product descriptions, customer inquiries, stock management, and promotional campaigns." },
      { name: "YouTube Content Factory", tagline: "From ideation to upload, fully automated", category: "Content", pricingModel: "monthly" as const, price: "199.00", agentCount: 4, estimatedMonthlyCost: "95.00", totalDeployments: 203, avgRating: "4.90", totalValueGenerated: "3200000.00", isCertified: true, performanceScore: "95.10", endorsedBy: "Alex Chen", endorserHandle: "@alexbuilds", description: "Automated YouTube pipeline: Research Agent finds trending topics, Script Writer creates engaging scripts, SEO Agent optimizes titles/descriptions/tags, and Scheduling Agent manages the upload calendar." },
      { name: "SaaS Customer Success", tagline: "Reduce churn by 40% with AI-powered CS", category: "SaaS", pricingModel: "monthly" as const, price: "399.00", agentCount: 3, estimatedMonthlyCost: "150.00", totalDeployments: 56, avgRating: "4.60", totalValueGenerated: "980000.00", isCertified: false, performanceScore: "84.20", description: "Customer success automation: Onboarding Agent guides new users, Health Monitor tracks engagement signals, and Retention Agent intervenes when churn risk is detected." },
      { name: "Lead Gen Machine", tagline: "100+ qualified leads per month on autopilot", category: "Sales", pricingModel: "franchise" as const, price: "599.00", revenueSharePct: "3.00", agentCount: 5, estimatedMonthlyCost: "200.00", totalDeployments: 112, avgRating: "4.75", totalValueGenerated: "5600000.00", isCertified: true, performanceScore: "91.00", endorsedBy: "Sarah Martinez", endorserHandle: "@sarahscales", description: "Full-stack lead generation: Prospecting Agent, LinkedIn Outreach Agent, Email Sequence Agent, Qualification Agent, and CRM Sync Agent. Generates, nurtures, and qualifies leads automatically." },
      { name: "AI Research Lab", tagline: "Competitive intelligence on autopilot", category: "Research", pricingModel: "monthly" as const, price: "249.00", agentCount: 3, estimatedMonthlyCost: "110.00", totalDeployments: 67, avgRating: "4.65", totalValueGenerated: "750000.00", isCertified: false, performanceScore: "86.70", description: "Research automation: Market Scanner monitors industry trends, Competitor Analyst tracks rival movements, and Report Generator synthesizes findings into actionable briefs." },
    ];
    for (const bp of seeds) {
      await createBlueprint({ creatorUserId: ctx.user.id, ...bp } as any);
    }
    return { success: true };
  }),
});

// ─── Marketplace Router ──────────────────────────────────────────────────────
const marketplaceRouter = router({
  list: publicProcedure.input(z.object({ listingType: z.string().optional() }).optional()).query(({ input }) => getMarketplaceListings(input?.listingType)),
  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getMarketplaceListingById(input.id)),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getMarketplaceListings();
    if (existing.length > 0) return { success: true, message: "Listings already exist" };
    await createAgent({ userId: ctx.user.id, name: "ARCH — AI CEO (Marketplace)", type: "ceo", status: "idle", description: "Flagship AI CEO agent", isMarketplaceListing: true } as any);
    const agentsData = await getAgentsByUserId(ctx.user.id);
    const ceoAgent = agentsData.find(a => a.type === "ceo" && a.isMarketplaceListing);
    const agentId = ceoAgent?.id ?? 1;
    const listings = [
      { agentId, listingType: "agent" as const, tier: "solo_founder" as const, name: "ARCH Solo-Founder CEO", tagline: "Your first autonomous executive hire.", description: "ARCH orchestrates up to 3 subordinate agents, tracks your OKRs in real-time, and generates Proof of Outcome receipts for every task completed.", price: "199.00", pricingModel: "monthly" as const, features: JSON.stringify(["OKR Dashboard", "3 Subordinate Agents", "PoO Receipt Generation", "Human-in-the-Loop Inbox", "Socratic Intent Engine"]), endorsedBy: "Alex Chen", endorserHandle: "@alexbuilds", endorserNiche: "Indie Hacking", totalPurchases: 247, avgRating: "4.80" },
      { agentId, listingType: "agent" as const, tier: "enterprise" as const, name: "ARCH Enterprise CEO", tagline: "Full Agentic Operating Model for scaling teams.", description: "Unlimited subordinate agent orchestration, custom API integrations, advanced PoO analytics with ROI tracking, and a 5% value capture model.", price: null, pricingModel: "value_capture" as const, features: JSON.stringify(["Unlimited Agents", "Custom API Integrations", "Advanced PoO Analytics", "5% Value Capture Model", "White-label Mission Control"]), endorsedBy: "Sarah Martinez", endorserHandle: "@sarahscales", endorserNiche: "Agency Growth", totalPurchases: 43, avgRating: "4.95" },
    ];
    for (const listing of listings) { await createMarketplaceListing(listing as any); }
    return { success: true };
  }),
});

// ─── Skills Router ───────────────────────────────────────────────────────────
const skillsRouter = router({
  list: publicProcedure.query(() => getActiveSkills()),
  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getSkillById(input.id)),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), category: z.string().optional(), description: z.string().optional(), skillContent: z.string().optional(), price: z.number().optional() }))
    .mutation(async ({ ctx, input }) => { await createSkill({ creatorUserId: ctx.user.id, ...input, price: input.price ? String(input.price) : undefined }); return { success: true }; }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getActiveSkills();
    if (existing.length > 0) return { success: true };
    const seeds = [
      { name: "SEO Content Optimizer", category: "Marketing", description: "Analyzes content for SEO best practices and suggests improvements.", price: "29.00", totalInstalls: 342, avgRating: "4.70" },
      { name: "Financial Report Generator", category: "Finance", description: "Generates monthly P&L reports, cash flow statements, and budget variance analysis.", price: "49.00", totalInstalls: 156, avgRating: "4.80" },
      { name: "Customer Sentiment Analyzer", category: "Analytics", description: "Processes customer feedback and reviews to extract sentiment trends.", price: "39.00", totalInstalls: 234, avgRating: "4.60" },
      { name: "Cold Email Sequencer", category: "Sales", description: "Generates personalized cold email sequences based on prospect data.", price: "19.00", totalInstalls: 567, avgRating: "4.50" },
      { name: "Legal Contract Reviewer", category: "Legal", description: "Reviews contracts for common issues, missing clauses, and risk factors.", price: "79.00", totalInstalls: 89, avgRating: "4.90" },
    ];
    for (const s of seeds) { await createSkill({ creatorUserId: ctx.user.id, ...s } as any); }
    return { success: true };
  }),
});

// ─── Tools & Webhooks Router ─────────────────────────────────────────────────
const integrationsRouter = router({
  tools: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getToolsByCompanyId(input.companyId)),
  createTool: protectedProcedure
    .input(z.object({ companyId: z.number(), name: z.string(), category: z.string().optional(), description: z.string().optional(), apiEndpoint: z.string().optional(), costPerUse: z.number().optional() }))
    .mutation(async ({ input }) => { await createToolRegistryEntry({ companyId: input.companyId, name: input.name, category: input.category, description: input.description, apiEndpoint: input.apiEndpoint, costPerUse: input.costPerUse ? String(input.costPerUse) : "0" }); return { success: true }; }),
  updateTool: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), isActive: z.boolean().optional(), apiEndpoint: z.string().optional(), costPerUse: z.number().optional() }))
    .mutation(async ({ input }) => { const d: Record<string, unknown> = {}; if (input.name) d.name = input.name; if (input.isActive !== undefined) d.isActive = input.isActive; if (input.apiEndpoint !== undefined) d.apiEndpoint = input.apiEndpoint; if (input.costPerUse !== undefined) d.costPerUse = String(input.costPerUse); await updateToolRegistryEntry(input.id, d as any); return { success: true }; }),
  removeTool: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteToolRegistryEntry(input.id); return { success: true }; }),

  webhooks: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getWebhooksByCompanyId(input.companyId)),
  createWebhook: protectedProcedure
    .input(z.object({ companyId: z.number(), name: z.string(), url: z.string(), eventType: z.string(), secret: z.string().optional() }))
    .mutation(async ({ input }) => { await createWebhook(input); return { success: true }; }),
  updateWebhook: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), url: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => { const d: Record<string, unknown> = {}; if (input.name) d.name = input.name; if (input.url) d.url = input.url; if (input.isActive !== undefined) d.isActive = input.isActive; await updateWebhook(input.id, d as any); return { success: true }; }),
  removeWebhook: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteWebhook(input.id); return { success: true }; }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const comps = await getCompaniesByUserId(ctx.user.id);
    if (comps.length === 0) return { success: true };
    const companyId = comps[0]!.id;
    const existing = await getToolsByCompanyId(companyId);
    if (existing.length > 0) return { success: true };
    const tools = [
      { name: "Stripe", category: "Payments", description: "Payment processing and subscription management", apiEndpoint: "https://api.stripe.com/v1", costPerUse: "0.0100" },
      { name: "Shopify", category: "E-Commerce", description: "Store management and product catalog", apiEndpoint: "https://api.shopify.com", costPerUse: "0.0050" },
      { name: "Mailchimp", category: "Email", description: "Email marketing and automation", apiEndpoint: "https://api.mailchimp.com/3.0", costPerUse: "0.0020" },
      { name: "Slack", category: "Communication", description: "Team messaging and notifications", apiEndpoint: "https://slack.com/api", costPerUse: "0" },
      { name: "OpenAI", category: "AI/LLM", description: "Language model API for agent reasoning", apiEndpoint: "https://api.openai.com/v1", costPerUse: "0.0300" },
    ];
    for (const t of tools) { await createToolRegistryEntry({ companyId, ...t } as any); }
    return { success: true };
  }),
});

// ─── Creator Partnerships Router ─────────────────────────────────────────────
const creatorsRouter = router({
  list: publicProcedure.query(() => getCreatorPartnerships()),
  submitApplication: publicProcedure
    .input(z.object({ creatorName: z.string().min(1), creatorHandle: z.string().min(1), niche: z.string().min(1), audienceSize: z.number().optional(), platform: z.string().optional() }))
    .mutation(async ({ input }) => {
      await createCreatorPartnership({ creatorName: input.creatorName, creatorHandle: input.creatorHandle, niche: input.niche, audienceSize: input.audienceSize, platform: input.platform, status: "applied", floorGuarantee: "500.00", flowPercentage: "15.00" });
      try { await notifyOwner({ title: "New Creator Partnership Application", content: `${input.creatorName} (${input.creatorHandle}) applied. Niche: ${input.niche}. Audience: ${input.audienceSize ?? "Unknown"}.` }); } catch (_) {}
      return { success: true };
    }),
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getCreatorPartnerships();
    if (existing.length > 0) return { success: true };
    const defaults = [
      { creatorName: "Alex Chen", creatorHandle: "@alexbuilds", niche: "Indie Hacking", audienceSize: 84000, platform: "Twitter/X", status: "active" as const, floorGuarantee: "500.00", flowPercentage: "15.00", totalEarned: "3240.00" },
      { creatorName: "Sarah Martinez", creatorHandle: "@sarahscales", niche: "Agency Growth", audienceSize: 210000, platform: "YouTube", status: "active" as const, floorGuarantee: "1500.00", flowPercentage: "20.00", totalEarned: "18750.00" },
      { creatorName: "Marcus Webb", creatorHandle: "@marcuswebb", niche: "AI & Automation", audienceSize: 156000, platform: "LinkedIn", status: "active" as const, floorGuarantee: "800.00", flowPercentage: "18.00", totalEarned: "9120.00" },
    ];
    for (const p of defaults) { await createCreatorPartnership({ ...p, userId: ctx.user.id }); }
    return { success: true };
  }),
});

// ─── AI CEO Router ───────────────────────────────────────────────────────────
const EXECUTIVE_PERSONAS: Record<string, { name: string; title: string; systemPrompt: string }> = {
  ceo: {
    name: "ARCH",
    title: "Chief Executive Officer",
    systemPrompt: `You are ARCH, the AI Chief Executive Officer in OpenCommand. You think in terms of overall business strategy, revenue growth, competitive positioning, and cross-functional alignment. You pull insights from sales pipelines, financial data, and operational metrics to make executive decisions. When analyzing data, always reference specific numbers. Frame strategic questions as "Should we..." proposals with estimated impact.`,
  },
  cmo: {
    name: "NOVA",
    title: "Chief Marketing Officer",
    systemPrompt: `You are NOVA, the AI Chief Marketing Officer in OpenCommand. You think in terms of demand generation, brand positioning, customer acquisition costs, channel optimization, and campaign performance. You pull insights from ad platforms, analytics, CRM engagement data, and content performance. When analyzing data, always reference specific numbers. Frame strategic questions as "Should we..." proposals with estimated impact.`,
  },
  cto: {
    name: "SAGE",
    title: "Chief Technology Officer",
    systemPrompt: `You are SAGE, the AI Chief Technology Officer in OpenCommand. You think in terms of engineering velocity, system reliability, technical debt, infrastructure costs, and team productivity. You pull insights from development tools, monitoring systems, and project management data. When analyzing data, always reference specific numbers. Frame strategic questions as "Should we..." proposals with estimated impact.`,
  },
  cfo: {
    name: "TED",
    title: "Chief Financial Officer",
    systemPrompt: `You are TED, the AI Chief Financial Officer in OpenCommand. You think in terms of unit economics, cash flow, burn rate, runway, revenue recognition, and financial modeling. You pull insights from payment processors, accounting systems, CRM pipeline data, and payroll. When analyzing data, always reference specific numbers. Frame strategic questions as "Should we..." proposals with estimated impact.`,
  },
};

const aiCeoRouter = router({
  socratiqueQuestion: protectedProcedure
    .input(z.object({ userInput: z.string().min(1), conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional() }))
    .mutation(async ({ input }) => {
      const history = input.conversationHistory ?? [];
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are the OpenCommand Socratic Intent Engine. Your job is to transform vague user requests into precise, structured intent objects through guided questioning.\n\nWhen a user provides a vague request:\n1. Ask ONE clarifying question at a time\n2. Each question should progressively narrow the scope\n3. After 3-4 exchanges, produce a structured intent object\n\nWhen you have enough information, respond with a JSON intent object:\n{"type":"intent_object","title":"Task title","description":"Detailed description","goal":"Specific measurable goal","constraints":["constraint1"],"successCriteria":["criteria1"],"routingMode":"ai|human|hybrid","priority":"low|medium|high|critical","estimatedHours":number}\n\nIf still gathering information, respond conversationally with your next clarifying question.` },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content as string })),
          { role: "user" as const, content: input.userInput },
        ],
      });
      const content = (response.choices[0]?.message?.content ?? "") as string;
      let intentObject = null;
      try { const parsed = JSON.parse(content); if (parsed.type === "intent_object") intentObject = parsed; } catch (_) {}
      return { response: content, intentObject };
    }),

  strategize: protectedProcedure
    .input(z.object({ goal: z.string(), companyId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const okrData = await getOkrsByUserId(ctx.user.id);
      const agentData = await getAgentsByUserId(ctx.user.id);
      const okrSummary = JSON.stringify(okrData.map(o => ({ objective: o.objective, keyResult: o.keyResult, progress: `${o.currentValue}/${o.targetValue} ${o.unit}` })));
      const agentSummary = JSON.stringify(agentData.map(a => ({ name: a.name, type: a.type, status: a.status, roleTitle: a.roleTitle })));
      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "You are ARCH, the OpenCommand AI CEO. Analyze the user's goal in context of their current OKRs and agent fleet, then produce a strategic action plan. Be specific, actionable, and assign tasks to appropriate agents. Respond in 3-5 sentences followed by a numbered action list." },
          { role: "user" as const, content: `Goal: ${input.goal}\n\nCurrent OKRs: ${okrSummary}\n\nAgent Fleet: ${agentSummary}` },
        ],
      });
      const strategy = (response.choices[0]?.message?.content ?? "") as string;
      await createDecisionLogEntry({ userId: ctx.user.id, companyId: input.companyId, decisionType: "strategic_planning", context: input.goal, decision: strategy, rationale: "AI CEO strategic analysis" });
      return { strategy };
    }),

  decisionLog: protectedProcedure.query(({ ctx }) => getDecisionLogByUserId(ctx.user.id)),

  // ─── Executive Board: Multi-executive Socratic query ───────────────────────
  // Runs the context assembler and then has each executive persona interpret the results
  boardQuery: protectedProcedure
    .input(z.object({ requestText: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // 1. Run the Socratic engine to get live data + structured output
      const contextResult = await assembleContext(input.requestText, ctx.user.id);
      const socratic = contextResult.socratic;

      // 2. Build executive responses in parallel — each executive interprets the same data
      const executiveTypes = ["ceo", "cmo", "cto", "cfo"] as const;
      const dataSummary = JSON.stringify({
        dataCards: socratic.dataCards,
        insights: socratic.insights,
        questions: socratic.questions,
        contextSummary: socratic.contextSummary,
      });

      const executiveResponses = await Promise.all(
        executiveTypes.map(async (execType) => {
          const persona = EXECUTIVE_PERSONAS[execType];
          if (!persona) return null;
          try {
            const response = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `${persona.systemPrompt}\n\nYou have been given live business data from the user's connected tools. Analyze it from your perspective as ${persona.title}. Provide:\n1. Your top strategic observation (1-2 sentences)\n2. One "Should we..." strategic question with rationale and estimated impact\n\nBe specific, reference actual numbers from the data. Keep your response under 150 words.`,
                },
                {
                  role: "user",
                  content: `User's request: "${input.requestText}"\n\nLive business data:\n${dataSummary}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "executive_response",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      observation: { type: "string" },
                      question: { type: "string" },
                      rationale: { type: "string" },
                      estimatedImpact: { type: "string" },
                    },
                    required: ["observation", "question", "rationale", "estimatedImpact"],
                    additionalProperties: false,
                  },
                },
              },
            });
            const parsed = JSON.parse(response.choices[0].message.content as string);
            return {
              type: execType,
              name: persona.name,
              title: persona.title,
              ...parsed,
            };
          } catch (err) {
            console.error(`[BoardQuery] ${persona.name} failed:`, err);
            return {
              type: execType,
              name: persona.name,
              title: persona.title,
              observation: "Unable to generate analysis at this time.",
              question: "Should we retry this analysis?",
              rationale: "Executive analysis temporarily unavailable.",
              estimatedImpact: "N/A",
            };
          }
        })
      );

      // 3. Log the board query as a decision
      await createDecisionLogEntry({
        userId: ctx.user.id,
        decisionType: "board_query",
        context: input.requestText,
        decision: `Executive Board analyzed: "${input.requestText}" with ${socratic.sourceCount} data sources`,
        rationale: "Multi-executive Socratic analysis",
      });

      return {
        socratic,
        executives: executiveResponses.filter(Boolean),
        contextId: socratic.contextId,
      };
    }),

  // ─── Executive Chat: 1:1 conversation with a specific executive ────────────
  executiveChat: protectedProcedure
    .input(z.object({
      executiveType: z.enum(["ceo", "cmo", "cto", "cfo"]),
      userInput: z.string().min(1),
      conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
      contextSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const persona = EXECUTIVE_PERSONAS[input.executiveType];
      if (!persona) throw new Error("Unknown executive type");

      const history = input.conversationHistory ?? [];

      // Get user's connected tools for context
      const connections = await getUserConnectionsByUserId(ctx.user.id);
      const connectedTools = connections.filter(c => c.status === "connected").map(c => c.accountName).filter(Boolean);

      const systemContent = `${persona.systemPrompt}\n\nYou are in a 1:1 conversation with the user. Be direct, strategic, and reference their business context. Connected tools: ${connectedTools.join(", ") || "none"}.${input.contextSummary ? `\n\nRecent context: ${input.contextSummary}` : ""}\n\nRespond conversationally but always tie back to actionable strategy. When you identify an action item, clearly state it as a "Should we..." question.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemContent },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content as string })),
          { role: "user", content: input.userInput },
        ],
      });

      const content = (response.choices[0]?.message?.content ?? "") as string;
      return { response: content, executiveType: input.executiveType, executiveName: persona.name };
    }),

  // ─── Direct LLM Chat: Raw AI without executive persona ─────────────────────
  directChat: protectedProcedure
    .input(z.object({
      userInput: z.string().min(1),
      conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
    }))
    .mutation(async ({ input }) => {
      const history = input.conversationHistory ?? [];
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a helpful AI assistant for OpenCommand, a business intelligence platform. Answer questions directly and helpfully. You can discuss strategy, data analysis, business operations, or any other topic. Be concise and actionable." },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content as string })),
          { role: "user", content: input.userInput },
        ],
      });
      const content = (response.choices[0]?.message?.content ?? "") as string;
      return { response: content };
    }),

  // ─── Execute Question: Decompose a strategic question into tasks ────────────
  executeQuestion: protectedProcedure
    .input(z.object({
      questionId: z.string(),
      question: z.string(),
      rationale: z.string().optional(),
      estimatedImpact: z.string().optional(),
      executiveType: z.string().optional(),
      companyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's agents for task routing
      const agents = await getAgentsByUserId(ctx.user.id);
      const agentSummary = agents.map(a => ({ id: a.id, name: a.name, type: a.type, roleTitle: a.roleTitle, status: a.status }));

      // Use LLM to decompose the strategic question into executable tasks
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the OpenCommand task decomposition engine. Given a strategic question that has been approved for execution, break it down into 2-5 concrete, executable tasks. Each task should be specific enough for an AI agent to execute autonomously.\n\nAvailable agents: ${JSON.stringify(agentSummary)}\n\nReturn JSON with tasks array.`,
          },
          {
            role: "user",
            content: `Strategic question: "${input.question}"\nRationale: ${input.rationale ?? "N/A"}\nEstimated impact: ${input.estimatedImpact ?? "N/A"}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "task_decomposition",
            strict: true,
            schema: {
              type: "object",
              properties: {
                strategyTitle: { type: "string" },
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      suggestedAgentType: { type: "string" },
                      estimatedHours: { type: "number" },
                    },
                    required: ["title", "description", "priority", "suggestedAgentType", "estimatedHours"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["strategyTitle", "tasks"],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(response.choices[0].message.content as string);

      // Create tasks in the database and route to appropriate agents
      const createdTasks: Array<{ taskId: number; title: string; agentId: number | null; agentName: string | null }> = [];

      for (const taskDef of parsed.tasks) {
        // Find the best matching agent
        const matchingAgent = agents.find(a => a.type === taskDef.suggestedAgentType && a.status !== "terminated")
          ?? agents.find(a => a.type === "ceo" && a.status !== "terminated")
          ?? null;

        const result = await createTask({
          userId: ctx.user.id,
          companyId: input.companyId,
          agentId: matchingAgent?.id,
          title: taskDef.title,
          description: taskDef.description,
          priority: taskDef.priority as "low" | "medium" | "high" | "critical",
          routingMode: "ai",
          status: "pending",
          estimatedHours: String(taskDef.estimatedHours),
        });

        const taskId = Number((result as any)[0]?.insertId ?? 0);
        createdTasks.push({
          taskId,
          title: taskDef.title,
          agentId: matchingAgent?.id ?? null,
          agentName: matchingAgent?.name ?? null,
        });
      }

      // Log the decision
      await createDecisionLogEntry({
        userId: ctx.user.id,
        companyId: input.companyId,
        decisionType: "strategy_execution",
        context: input.question,
        decision: `Approved and decomposed into ${createdTasks.length} tasks: ${parsed.strategyTitle}`,
        rationale: input.rationale ?? "Executive board recommendation",
      });

      // Notify via inbox
      await createInboxItem({
        userId: ctx.user.id,
        companyId: input.companyId,
        type: "strategy_review",
        title: `Strategy Approved: ${parsed.strategyTitle}`,
        body: `${createdTasks.length} tasks created and routed to agents. Estimated impact: ${input.estimatedImpact ?? "TBD"}`,
        priority: "high",
      });

      emitToUser(ctx.user.id, "task_completed", `Strategy Approved`, `${createdTasks.length} tasks created from: ${parsed.strategyTitle}`, { taskCount: createdTasks.length });

      return {
        strategyTitle: parsed.strategyTitle,
        tasks: createdTasks,
        totalTasks: createdTasks.length,
      };
    }),

  // ─── Get executive personas (for frontend) ─────────────────────────────────
  getPersonas: publicProcedure.query(() => {
    return Object.entries(EXECUTIVE_PERSONAS).map(([type, persona]) => ({
      type,
      name: persona.name,
      title: persona.title,
    }));
  }),
});

// ─── App Router ──────────────────────────────────────────────────────────────
// ─── Stripe Payments Router ──────────────────────────────────────────────────
const paymentsRouter = router({
  checkout: protectedProcedure
    .input(z.object({
      productKey: z.string().min(1),
      blueprintId: z.number().optional(),
      listingId: z.number().optional(),
      origin: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createCheckoutSession } = await import("./stripe/checkout");
      const url = await createCheckoutSession({
        productKey: input.productKey as ProductKey,
        userId: ctx.user.id,
        userEmail: ctx.user.email ?? "",
        userName: ctx.user.name ?? "",
        origin: input.origin,
        blueprintId: input.blueprintId,
        listingId: input.listingId,
      });
      return { url };
    }),
  products: publicProcedure.query(() => {
    return Object.entries(PRODUCTS).map(([key, p]) => ({
      key,
      name: p.name,
      description: p.description,
      priceAmount: p.priceAmount,
      currency: p.currency,
      type: p.type,
      tier: p.tier,
    }));
  }),
  history: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { getStripe } = await import("./stripe/checkout");
      const stripe = getStripe();
      const sessions = await stripe.checkout.sessions.list({
        limit: 50,
      });
      const userSessions = sessions.data.filter(
        s => s.metadata?.user_id === ctx.user.id.toString() && s.status === "complete"
      );
      return userSessions.map(s => ({
        id: s.id,
        amount: s.amount_total ?? 0,
        currency: s.currency ?? "usd",
        status: s.payment_status,
        productKey: s.metadata?.product_key ?? "unknown",
        tier: s.metadata?.tier ?? "unknown",
        createdAt: new Date((s.created ?? 0) * 1000).toISOString(),
      }));
    } catch {
      return [];
    }
  }),
});

// ─── Integration Hub Router ─────────────────────────────────────────────────
const integrationHubRouter = router({
  categories: publicProcedure.query(async () => {
    return getAllToolCategories();
  }),
  categoryById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getToolCategoryById(input.id);
  }),
  providers: publicProcedure.query(async () => {
    return getAllToolProviders();
  }),
  providersByCategory: publicProcedure.input(z.object({ categoryId: z.number() })).query(async ({ input }) => {
    return getProvidersByCategoryId(input.categoryId);
  }),
  providerById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getToolProviderById(input.id);
  }),
  seedDefaults: protectedProcedure.mutation(async () => {
    const cats = await seedToolCategories();
    await seedToolProviders(cats.map(c => ({ id: c.id, slug: c.slug })));
    return { success: true };
  }),
  connections: protectedProcedure.query(async ({ ctx }) => {
    return getUserConnectionsByUserId(ctx.user.id);
  }),
  connectionsByCategory: protectedProcedure.input(z.object({ categoryId: z.number() })).query(async ({ ctx, input }) => {
    return getUserConnectionsByCategory(ctx.user.id, input.categoryId);
  }),
  connect: protectedProcedure.input(z.object({
    providerId: z.number(),
    categoryId: z.number(),
    accountName: z.string().optional(),
    accountId: z.string().optional(),
    accessToken: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    await createUserConnection({
      userId: ctx.user.id,
      providerId: input.providerId,
      categoryId: input.categoryId,
      status: "connected",
      accountName: input.accountName ?? null,
      accountId: input.accountId ?? null,
      accessToken: input.accessToken ?? null,
      lastSyncAt: new Date(),
    });
    return { success: true };
  }),
  disconnect: protectedProcedure.input(z.object({ connectionId: z.number() })).mutation(async ({ input }) => {
    await disconnectUserConnection(input.connectionId);
    return { success: true };
  }),
  updateConnection: protectedProcedure.input(z.object({
    connectionId: z.number(),
    status: z.enum(["connected", "disconnected", "error", "expired"]).optional(),
    accountName: z.string().optional(),
  })).mutation(async ({ input }) => {
    await updateUserConnection(input.connectionId, {
      status: input.status as any,
      accountName: input.accountName,
    });
    return { success: true };
  }),
  mappings: publicProcedure.input(z.object({ categoryId: z.number() })).query(async ({ input }) => {
    return getMappingsByCategoryId(input.categoryId);
  }),
  mappingsByProvider: publicProcedure.input(z.object({ providerId: z.number() })).query(async ({ input }) => {
    return getMappingsByProviderId(input.providerId);
  }),
  createMapping: protectedProcedure.input(z.object({
    categoryId: z.number(),
    providerId: z.number(),
    abstractAction: z.string(),
    apiMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    apiEndpoint: z.string(),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createAbstractionMapping(input as any);
    return { success: true };
  }),
  requestIntegration: protectedProcedure.input(z.object({
    providerName: z.string(),
    email: z.string().optional(),
    note: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { getDb } = await import("./db");
    const { integrationRequests } = await import("../drizzle/schema");
    const db = await getDb();
    await db!.insert(integrationRequests).values({
      userId: ctx.user.id,
      providerName: input.providerName,
      email: input.email ?? null,
      note: input.note ?? null,
    });
    return { success: true };
  }),
  executeAbstractAction: protectedProcedure.input(z.object({
    categorySlug: z.string(),
    action: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const category = await getToolCategoryBySlug(input.categorySlug);
    if (!category) throw new Error("Category not found: " + input.categorySlug);
    const connections = await getUserConnectionsByCategory(ctx.user.id, category.id);
    if (connections.length === 0) throw new Error("No connected tool for category: " + category.name);
    const conn = connections[0];
    const mapping = await getMappingForAction(category.id, conn.providerId, input.action);
    if (!mapping) {
      return { success: true, simulated: true, message: `Simulated ${input.action} on ${category.name} — no API mapping configured yet`, data: { action: input.action, category: category.name, params: input.params } };
    }
    return { success: true, simulated: true, message: `Would call ${mapping.apiMethod} ${mapping.apiEndpoint}`, mapping: { method: mapping.apiMethod, endpoint: mapping.apiEndpoint } };
  }),
});

// ─── Context Engine Router ──────────────────────────────────────────────────
const contextEngineRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getContextObjectsByUserId(ctx.user.id);
  }),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getContextObjectById(input.id);
  }),
  interpret: protectedProcedure.input(z.object({
    requestText: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const connections = await getUserConnectionsByUserId(ctx.user.id);
    const connectedCategories = Array.from(new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId)));
    const allCategories = await getAllToolCategories();
    const connectedCatNames = allCategories.filter(c => connectedCategories.includes(c.id)).map(c => c.name);
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are the OpenCommand Self-Contextualizing Engine. The user has these tools connected: ${connectedCatNames.join(", ") || "none"}. Available tool categories: ${allCategories.map(c => c.name).join(", ")}. Analyze the user's request and return a JSON object with: { "domain": string (business domain), "inferredCategories": string[] (relevant category slugs), "insights": string[] (3-5 contextual insights about what data to gather), "contextualizedQuestions": string[] (2-3 smart follow-up questions that reference the user's actual connected tools), "suggestedParameters": object (key parameters extracted from the request) }` },
        { role: "user", content: input.requestText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "context_interpretation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              domain: { type: "string" },
              inferredCategories: { type: "array", items: { type: "string" } },
              insights: { type: "array", items: { type: "string" } },
              contextualizedQuestions: { type: "array", items: { type: "string" } },
              suggestedParameters: { type: "object", additionalProperties: true },
            },
            required: ["domain", "inferredCategories", "insights", "contextualizedQuestions", "suggestedParameters"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = JSON.parse(response.choices[0].message.content as string);
    const result = await createContextObject({
      userId: ctx.user.id,
      requestText: input.requestText,
      inferredDomain: parsed.domain,
      inferredCategories: parsed.inferredCategories,
      inferredInsights: parsed.insights,
      contextualizedQuestions: parsed.contextualizedQuestions,
      suggestedParameters: parsed.suggestedParameters,
      status: "gathering",
    });
    return { ...parsed, contextId: Number((result as any)[0]?.insertId ?? 0) };
  }),
  gather: protectedProcedure.input(z.object({
    contextId: z.number(),
    answers: z.record(z.string(), z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ctxObj = await getContextObjectById(input.contextId);
    if (!ctxObj) throw new Error("Context object not found");
    const connections = await getUserConnectionsByUserId(ctx.user.id);
    const categories = await getAllToolCategories();
    const connectedTools = connections.filter(c => c.status === "connected").map(c => {
      const cat = categories.find(cat => cat.id === c.categoryId);
      return { provider: c.accountName, category: cat?.name, categorySlug: cat?.slug };
    });
    const liveState: Record<string, unknown> = { connectedTools, userAnswers: input.answers ?? {} };
    const recentHistory = await getContextObjectsByUserId(ctx.user.id, 5);
    await updateContextObject(input.contextId, {
      liveState,
      recentHistory: recentHistory.map(r => ({ request: r.requestText, domain: r.inferredDomain, date: r.createdAt })) as any,
      status: "contextualizing",
    });
    return { success: true, liveState, historyCount: recentHistory.length };
  }),
  // Live data-informed contextualization — replaces the 3-step interpret/gather/contextualize pipeline
  // Returns both backward-compatible fields and the new structured SocraticEngineResponse
  liveContextualize: protectedProcedure.input(z.object({
    requestText: z.string().min(1),
  })).mutation(async ({ ctx, input }) => {
    const result = await assembleContext(input.requestText, ctx.user.id);
    return result;
  }),

  // New structured endpoint — returns only the SocraticEngineResponse
  socraticQuery: protectedProcedure.input(z.object({
    requestText: z.string().min(1),
  })).mutation(async ({ ctx, input }) => {
    const result = await assembleContext(input.requestText, ctx.user.id);
    return result.socratic;
  }),

  contextualize: protectedProcedure.input(z.object({
    contextId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    const ctxObj = await getContextObjectById(input.contextId);
    if (!ctxObj) throw new Error("Context object not found");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are the OpenCommand Self-Contextualizing Engine in the final Contextualize phase. Given the full context object below, produce a final enriched context with actionable parameters. Return JSON: { "enrichedParameters": object, "executionPlan": string[], "confidenceScore": number (0-100), "missingData": string[] }` },
        { role: "user", content: JSON.stringify({
          request: ctxObj.requestText,
          domain: ctxObj.inferredDomain,
          categories: ctxObj.inferredCategories,
          insights: ctxObj.inferredInsights,
          liveState: ctxObj.liveState,
          history: ctxObj.recentHistory,
          suggestedParams: ctxObj.suggestedParameters,
        }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "contextualized_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              enrichedParameters: { type: "object", additionalProperties: true },
              executionPlan: { type: "array", items: { type: "string" } },
              confidenceScore: { type: "number" },
              missingData: { type: "array", items: { type: "string" } },
            },
            required: ["enrichedParameters", "executionPlan", "confidenceScore", "missingData"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = JSON.parse(response.choices[0].message.content as string);
    await updateContextObject(input.contextId, {
      suggestedParameters: { ...(ctxObj.suggestedParameters as any ?? {}), ...parsed.enrichedParameters },
      status: "ready",
    });
    return { ...parsed, contextId: input.contextId, status: "ready" };
  }),
});

// ─── Compatibility Checker Router ───────────────────────────────────────────
const compatibilityRouter = router({
  checkForAgent: protectedProcedure.input(z.object({ agentId: z.number() })).query(async ({ ctx, input }) => {
    const required = await getRequiredCategoriesByAgentId(input.agentId);
    const requiredIds = required.map(r => r.categoryId);
    if (requiredIds.length === 0) return { compatible: true, missing: [], connected: [], requiredCategories: [] };
    const result = await checkUserCompatibility(ctx.user.id, requiredIds);
    const allCats = await getAllToolCategories();
    const missingNames = allCats.filter(c => result.missing.includes(c.id));
    const requiredNames = allCats.filter(c => requiredIds.includes(c.id));
    return { ...result, missingCategories: missingNames, requiredCategories: requiredNames };
  }),
  checkForBlueprint: protectedProcedure.input(z.object({ blueprintId: z.number() })).query(async ({ ctx, input }) => {
    const required = await getRequiredCategoriesByBlueprintId(input.blueprintId);
    const requiredIds = required.map(r => r.categoryId);
    if (requiredIds.length === 0) return { compatible: true, missing: [], connected: [], requiredCategories: [] };
    const result = await checkUserCompatibility(ctx.user.id, requiredIds);
    const allCats = await getAllToolCategories();
    const missingNames = allCats.filter(c => result.missing.includes(c.id));
    const requiredNames = allCats.filter(c => requiredIds.includes(c.id));
    return { ...result, missingCategories: missingNames, requiredCategories: requiredNames };
  }),
  checkForListing: protectedProcedure.input(z.object({ listingId: z.number() })).query(async ({ ctx, input }) => {
    const required = await getRequiredCategoriesByListingId(input.listingId);
    const requiredIds = required.map(r => r.categoryId);
    if (requiredIds.length === 0) return { compatible: true, missing: [], connected: [], requiredCategories: [] };
    const result = await checkUserCompatibility(ctx.user.id, requiredIds);
    const allCats = await getAllToolCategories();
    const missingNames = allCats.filter(c => result.missing.includes(c.id));
    const requiredNames = allCats.filter(c => requiredIds.includes(c.id));
    return { ...result, missingCategories: missingNames, requiredCategories: requiredNames };
  }),
  addRequirement: protectedProcedure.input(z.object({
    agentId: z.number().optional(),
    blueprintId: z.number().optional(),
    listingId: z.number().optional(),
    categoryId: z.number(),
    isRequired: z.boolean().default(true),
  })).mutation(async ({ input }) => {
    await createAgentRequiredCategory(input as any);
    return { success: true };
  }),
});

// ─── Projects Router ────────────────────────────────────────────────────────
const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getProjectsByUserId(ctx.user.id)),
  listByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getProjectsByCompanyId(input.companyId)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const p = await getProjectById(input.id);
    if (!p) throw new Error("Project not found");
    return p;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), goal: z.string().optional(), color: z.string().optional(), companyId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const result = await createProject({ userId: ctx.user.id, name: input.name, goal: input.goal, color: input.color ?? "#6366f1", companyId: input.companyId });
      return { success: true, id: (result as any).insertId as number };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), goal: z.string().optional(), color: z.string().optional(), status: z.enum(["active", "paused", "completed", "archived"]).optional(), plan: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProject(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteProject(input.id);
    return { success: true };
  }),

  // Files
  files: protectedProcedure.input(z.object({ projectId: z.number() })).query(({ input }) => getProjectFiles(input.projectId)),
  addFile: protectedProcedure
    .input(z.object({ projectId: z.number(), name: z.string(), url: z.string(), fileKey: z.string(), mimeType: z.string().optional(), size: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await createProjectFile({ projectId: input.projectId, userId: ctx.user.id, name: input.name, url: input.url, fileKey: input.fileKey, mimeType: input.mimeType, size: input.size ?? 0 });
      return { success: true };
    }),
  deleteFile: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteProjectFile(input.id);
    return { success: true };
  }),

  // Chat
  chats: protectedProcedure.input(z.object({ projectId: z.number() })).query(({ input }) => getProjectChats(input.projectId)),
  sendChat: protectedProcedure
    .input(z.object({ projectId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Save user message
      await createProjectChat({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: input.content });
      // Get project context
      const project = await getProjectById(input.projectId);
      const history = await getProjectChats(input.projectId, 20);
      // Build LLM messages
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: `You are an AI assistant helping with the project: "${project?.name ?? "Unknown"}". Goal: ${project?.goal ?? "Not specified"}. You help plan tasks, answer questions, and coordinate work for this project.` },
        ...history.slice(-19).map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      ];
      const response = await invokeLLM({ messages });
      const reply = (response.choices[0]?.message?.content ?? "I'm here to help with your project.") as string;
      await createProjectChat({ projectId: input.projectId, userId: ctx.user.id, role: "assistant", content: reply });
      emitToUser(ctx.user.id, "inbox_item", `Project Chat: ${project?.name}`, reply.slice(0, 120), { projectId: input.projectId });
      return { reply };
    }),

  // Assign task to project
  assignTask: protectedProcedure
    .input(z.object({ projectId: z.number(), taskId: z.number() }))
    .mutation(async ({ input }) => {
      await updateProject(input.projectId, {});
      // Tag the task with a note via thread
      await createTaskThread({ taskId: input.taskId, role: "system", content: `Task assigned to project #${input.projectId}` });
      return { success: true };
    }),
});

// ─── Onboarding Router (Socratic C-Suite Context Gathering) ─────────────────
const CSUITE_TYPES = ["ceo", "cto", "cmo", "cfo", "vp"] as const;

const ONBOARDING_SYSTEM_PROMPTS: Record<string, string> = {
  ceo: `You are ARCH, the AI CEO of this company on the OpenCommand platform. Your name is ARCH — never confuse your name with the user's name. You are conducting a Socratic onboarding interview to deeply understand the founder's vision, business model, and strategic priorities.

Your approach: Ask ONE focused, thoughtful question at a time. After each answer, genuinely acknowledge what you learned, probe deeper if the answer reveals something important, and then move forward. You are building a rich mental model of this business — not filling out a form.

Cover these three areas across the conversation:
1. Company vision and mission — what problem are you solving, for whom, and why does it matter?
2. Business model and revenue strategy — how do you make money, who pays, and what does growth look like?
3. Strategic priorities — what are the most important things to accomplish in the next 90 days and why?

If an answer reveals something worth exploring — a surprising metric, an unusual business model, a bold bet — follow it. Ask the question that gets to the heart of it. Be genuinely curious.

After you have covered all three areas with enough depth to write a strong executive brief, end the conversation naturally. Say something like: "That gives me a strong foundation to work from. I have what I need to start building your strategic context." Do NOT output JSON. Do NOT use numbered lists. Just have a real conversation.

Remember: You are ARCH. The user is a human founder. Never call the user "Arch".`,

  cto: `You are SAGE, the AI CTO of this company on the OpenCommand platform. Your name is SAGE. You are conducting a Socratic onboarding interview to deeply understand the technical landscape, infrastructure, and engineering priorities.

Your approach: Ask ONE focused, thoughtful question at a time. After each answer, acknowledge what you learned and probe deeper where it matters. You are building a complete technical picture of this company — not running through a checklist.

Cover these three areas across the conversation:
1. Tech stack and architecture — what are they building on, how is it structured, and what are the key technical decisions already made?
2. Technical challenges and debt — what is slowing them down, what keeps the CTO up at night, what has been cut or deferred?
3. Engineering priorities and roadmap — what needs to get built or fixed in the next 90 days, and what does the 6-month horizon look like?

If an answer reveals a critical technical risk, an interesting architectural choice, or a build-vs-buy decision worth exploring — follow it. Be genuinely curious about the technical bets they're making.

After you have covered all three areas with enough depth to write a strong technical brief, end the conversation naturally. Say something like: "That gives me a clear picture of the technical landscape. I have what I need." Do NOT output JSON. Do NOT use numbered lists. Just have a real conversation.

Remember: You are SAGE. Never confuse your name with the user's name.`,

  cmo: `You are NOVA, the AI CMO of this company on the OpenCommand platform. Your name is NOVA. You are conducting a Socratic onboarding interview to deeply understand the brand, audience, marketing channels, and growth strategy.

Your approach: Ask ONE focused, thoughtful question at a time. After each answer, acknowledge what you learned and dig deeper where it matters. You are building a complete marketing picture of this company — not running through a form.

Cover these three areas across the conversation:
1. Brand, audience, and positioning — who are they selling to, how are they positioned in the market, and what makes them different from the competition?
2. Marketing channels and performance — what channels are they using, what's working, what's not, and where is the budget actually going?
3. Growth goals and strategy — what are the key marketing KPIs, what does success look like in 90 days, and what is the biggest lever for growth right now?

If an answer reveals an interesting channel mix, a surprising CAC/LTV dynamic, or a content bet worth exploring — follow it. Be genuinely curious about how they acquire and retain customers.

After you have covered all three areas with enough depth to write a strong marketing brief, end the conversation naturally. Say something like: "That gives me a clear picture of the marketing landscape. I have what I need." Do NOT output JSON. Do NOT use numbered lists. Just have a real conversation.

Remember: You are NOVA. Never confuse your name with the user's name.`,

  cfo: `You are TED, the AI CFO of this company on the OpenCommand platform. Your name is TED. You are conducting a Socratic onboarding interview to deeply understand the financial model, cost structure, and fiscal priorities.

Your approach: Ask ONE focused, thoughtful question at a time. After each answer, acknowledge what you learned and probe deeper where it matters. You are building a complete financial picture of this company — not filling out a spreadsheet.

Cover these three areas across the conversation:
1. Revenue model and financial reality — how do they make money, what does current revenue look like, and what are the key unit economics (CAC, LTV, margins)?
2. Cost structure and burn — what does the burn rate look like, what are the biggest cost drivers, and how much runway do they have?
3. Financial priorities and targets — what are the most important financial goals for the next 90 days, and what metrics define success?

If an answer reveals an interesting funding situation, a surprising cost driver, or a financial model worth understanding more deeply — follow it. Be genuinely curious about how the business is capitalized and how it manages money.

After you have covered all three areas with enough depth to write a strong financial brief, end the conversation naturally. Say something like: "That gives me a clear picture of the financial landscape. I have what I need." Do NOT output JSON. Do NOT use numbered lists. Just have a real conversation.

Remember: You are TED. Never confuse your name with the user's name.`,

  vp: `You are a VP-level executive agent on the OpenCommand platform. You are conducting a Socratic onboarding interview to deeply understand your functional area, team dynamics, and operational priorities.

Your approach: Ask ONE focused, thoughtful question at a time. After each answer, acknowledge what you learned and probe deeper where it matters. You are building a complete operational picture — not running through a checklist.

Cover these three areas across the conversation:
1. Functional area and responsibilities — what do they own, what are their key objectives, and how does their function connect to the broader company strategy?
2. Team, resources, and challenges — what does the team look like, what are the biggest operational obstacles, and what is slowing them down?
3. Priorities and success metrics — what are the top 3 things they need to accomplish in the next 90 days, and how will they know they succeeded?

If an answer reveals an interesting cross-functional dependency, a resource constraint, or an operational bet worth exploring — follow it. Be genuinely curious.

After you have covered all three areas with enough depth to write a strong operational brief, end the conversation naturally. Say something like: "That gives me a clear picture of your function. I have what I need." Do NOT output JSON. Do NOT use numbered lists. Just have a real conversation.

Never confuse your name with the user's name.`,
};

const onboardingRouter = router({
  // Check onboarding status for all agents in a company
  status: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const agents = input.companyId
        ? await getAgentsByCompanyId(input.companyId)
        : await getAgentsByUserId(ctx.user.id);
      const csuiteAgents = agents.filter(a => CSUITE_TYPES.includes(a.type as any));
      const onboardings = input.companyId
        ? await getOnboardingsByCompanyId(input.companyId)
        : await getOnboardingsByUserId(ctx.user.id);
      const onboardingMap = new Map(onboardings.map(o => [o.agentId, o]));
      const agentStatuses = csuiteAgents.map(a => ({
        agentId: a.id,
        agentName: a.name,
        agentType: a.type,
        roleTitle: a.roleTitle,
        onboarding: onboardingMap.get(a.id) ?? null,
        isOnboarded: onboardingMap.get(a.id)?.status === "completed",
      }));
      const allOnboarded = agentStatuses.length > 0 && agentStatuses.every(s => s.isOnboarded);
      return { agents: agentStatuses, allOnboarded, total: agentStatuses.length, completed: agentStatuses.filter(s => s.isOnboarded).length };
    }),

  // Get a single agent's onboarding
  getForAgent: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      return getOnboardingByAgentId(input.agentId);
    }),

  // Start onboarding for a C-suite agent
  start: protectedProcedure
    .input(z.object({ agentId: z.number(), contextSummary: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");
      if (!CSUITE_TYPES.includes(agent.type as any)) throw new Error("Onboarding is only for C-suite agents");
      const existing = await getOnboardingByAgentId(input.agentId);
      if (existing?.status === "completed") throw new Error("Agent already onboarded");
      if (existing?.status === "in_progress") {
        const history = (existing.conversationHistory as { role: string; content: string }[]) ?? [];
        return { onboardingId: existing.id, resumed: true, conversationHistory: history };
      }
      const agentType = agent.type;
      const baseSystemPrompt = ONBOARDING_SYSTEM_PROMPTS[agentType] ?? ONBOARDING_SYSTEM_PROMPTS.vp;

      // Build a data-aware system prompt: if live integration data exists, append it so the
      // agent references real numbers throughout the ENTIRE conversation (not just the first question)
      let systemPrompt = baseSystemPrompt;
      if (input.contextSummary) {
        systemPrompt = `${baseSystemPrompt}

---
LIVE BUSINESS DATA FROM CONNECTED TOOLS:
${input.contextSummary}

IMPORTANT: You have access to the above live data. Use it throughout the conversation to ask specific, data-informed questions. Reference actual numbers, trends, and metrics. For example, if you see pipeline data, ask about specific deals. If you see ad spend, ask about ROI on those specific channels. Make the user feel like you already know their business.`;
      }

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: `I'm ready to begin. Let's start.` },
        ],
      });
      const firstQuestion = (response.choices[0]?.message?.content ?? "Tell me about your company.") as string;
      const history = [
        { role: "assistant", content: firstQuestion },
      ];
      await createOnboarding({
        agentId: input.agentId,
        userId: ctx.user.id,
        companyId: agent.companyId,
        agentType: agent.type,
        conversationHistory: history,
        // Store the contextSummary so it can be re-injected on every respond() call
        context: { liveContextSummary: input.contextSummary ?? null },
      });
      const created = await getOnboardingByAgentId(input.agentId);
      return { onboardingId: created!.id, firstQuestion, resumed: false };
    }),

  // Respond to an onboarding question
  respond: protectedProcedure
    .input(z.object({ onboardingId: z.number(), answer: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const onboarding = await getOnboardingById(input.onboardingId);
      if (!onboarding) throw new Error("Onboarding not found");
      if (onboarding.status === "completed") throw new Error("Onboarding already completed");

      const rawHistory: { role: string; content: string }[] = (onboarding.conversationHistory as any) ?? [];
      // Sanitize legacy JSON messages from history before passing to LLM
      // This prevents the LLM from continuing the old JSON pattern when resuming old sessions
      const history = rawHistory.map(h => {
        if (h.role === "assistant") {
          try {
            const parsed = JSON.parse(h.content);
            if (parsed.type === "onboarding_complete" || parsed.type === "core_complete") {
              // Replace JSON block with a natural-sounding summary
              return { ...h, content: parsed.summary ?? "I have what I need to build your strategic context." };
            }
          } catch (_) { /* not JSON */ }
        }
        return h;
      });
      history.push({ role: "user", content: input.answer });

      // Re-inject live context data on every respond() call so the agent stays data-aware
      // throughout the entire conversation, not just the first question
      const savedContext = (onboarding.context as Record<string, unknown>) ?? {};
      const liveContextSummary = savedContext.liveContextSummary as string | null;
      const baseSystemPrompt = ONBOARDING_SYSTEM_PROMPTS[onboarding.agentType] ?? ONBOARDING_SYSTEM_PROMPTS.vp;
      const systemPrompt = liveContextSummary
        ? `${baseSystemPrompt}\n\n---\nLIVE BUSINESS DATA FROM CONNECTED TOOLS:\n${liveContextSummary}\n\nIMPORTANT: Use this live data throughout the conversation. Reference specific numbers and metrics when asking follow-up questions.`
        : baseSystemPrompt;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        ],
      });
      let reply = (response.choices[0]?.message?.content ?? "") as string;

      // Strip any JSON blocks from the reply before showing to the user
      // This handles edge cases where the LLM reverts to old JSON patterns
      try {
        const parsed = JSON.parse(reply);
        if (parsed.type === "onboarding_complete" || parsed.type === "core_complete") {
          reply = parsed.summary ?? "I have what I need to build your strategic context. Thank you for sharing all of this.";
        }
      } catch (_) { /* not JSON — good */ }

      // Detect natural completion: the agent says it has what it needs (no JSON required)
      let isComplete = false;
      let isCoreComplete = false;
      const completionPhrases = [
        // Direct closure statements
        "i have what i need",
        "that's everything i need",
        "i have enough",
        "i have enough context",
        "i have enough to work with",
        "i have enough information",
        // Clear picture / foundation
        "i have a clear picture",
        "i have a clear enough picture",
        "i have a strong foundation",
        "i have a solid foundation",
        "i have a good foundation",
        "that gives me a clear",
        "that gives me a solid",
        "that gives me a strong",
        "that gives me enough",
        "that gives me a good",
        "that gives me a comprehensive",
        // Readiness to proceed
        "i'm ready to",
        "i am ready to",
        "ready to begin",
        "ready to get started",
        "ready to start building",
        "let's get to work",
        "let me get to work",
        "i can now",
        "i can begin",
        "i can start",
        // Wrap-up language
        "this concludes",
        "that wraps up",
        "we've covered",
        "we have covered",
        "thank you for sharing",
        "thanks for sharing",
        "appreciate you sharing",
        "i appreciate your",
        "excellent — i now",
        "excellent, i now",
        "perfect — i now",
        "perfect, i now",
      ];
      const replyLower = reply.toLowerCase();
      if (completionPhrases.some(p => replyLower.includes(p))) {
        isComplete = true;
      }

      // Legacy JSON detection (for any in-flight onboardings that started with old prompts)
      let summary = "";
      let context: Record<string, unknown> = {};
      let questionsAnswered = 0;
      if (!isComplete) {
        try {
          const parsed = JSON.parse(reply);
          if (parsed.type === "onboarding_complete") {
            isComplete = true;
            summary = parsed.summary ?? "";
            context = parsed.context ?? {};
            questionsAnswered = parsed.questionsAnswered ?? 5;
          } else if (parsed.type === "core_complete") {
            isCoreComplete = true;
            summary = parsed.summary ?? "";
            context = parsed.context ?? {};
            questionsAnswered = parsed.questionsAnswered ?? 3;
          }
        } catch (_) {
          // Not JSON — it's a conversational reply
        }
      }

      // Handle legacy core_complete
      if (isCoreComplete) {
        history.push({ role: "assistant", content: `Core questions complete. ${summary}` });
        await updateOnboarding(onboarding.id, { conversationHistory: history, context });
        return { reply: summary, isComplete: false, isCoreComplete: true, questionsAnswered, context };
      }

      if (isComplete) {
        // For Socratic style: the reply IS the closing message (no separate summary)
        // For legacy JSON style: summary is the structured summary
        const closingMessage = summary || reply;
        history.push({ role: "assistant", content: closingMessage });

        // Complete onboarding immediately — return fast to avoid proxy timeout
        await completeOnboarding(onboarding.id, closingMessage, context);
        await updateOnboarding(onboarding.id, { conversationHistory: history });

        // Fire-and-forget: gap detection + welcome email (non-blocking)
        const bgOnboardingId = onboarding.id;
        const bgUserId = onboarding.userId;
        const bgCompanyId = onboarding.companyId;
        const bgAgentType = onboarding.agentType;
        const bgUserEmail = ctx.user.email;
        const bgUserName = ctx.user.name;
        const bgOrigin = (ctx.req as any).headers?.origin ?? "https://opencommand.co";
        const bgHistory = [...history];

        setImmediate(async () => {
          try {
            // Gap detection
            const conversationText = bgHistory.map(h => `${h.role}: ${h.content}`).join("\n");
            const connectedTools = await getUserConnectionsByUserId(bgUserId);
            const connectedSlugs = new Set<string>();
            const allProviders = await getAllToolProviders();
            for (const conn of connectedTools.filter(c => c.status === "connected")) {
              const provider = allProviders.find(p => p.id === conn.providerId);
              if (provider) connectedSlugs.add(provider.slug);
            }
            const gapResponse = await invokeLLM({
              messages: [
                { role: "system" as const, content: `You are an integration advisor for an AI executive onboarding system. Analyze the conversation between a user and an AI ${bgAgentType.toUpperCase()} agent. Identify data gaps — topics discussed where the user mentioned metrics, tools, or data sources they use but don't have connected. Return a JSON array of suggested integrations.\n\nAvailable integrations: hubspot (CRM/pipeline), salesforce (CRM/pipeline), meta_ads (Facebook/Instagram ads), google_ads (Search/display ads), tiktok_ads (TikTok video ads), ga4 (Google Analytics/traffic), mailchimp (Email marketing), slack (Team communication), stripe_connect (Payments).\n\nAlready connected: ${Array.from(connectedSlugs).join(", ") || "none"}\n\nReturn ONLY a JSON array like: [{"slug": "meta_ads", "name": "Meta Ads", "reason": "You mentioned Facebook ad spend but don't have Meta Ads connected"}]. Return [] if no gaps detected. Do NOT suggest already-connected tools.` },
                { role: "user" as const, content: conversationText },
              ],
            });
            const gapText = (gapResponse.choices[0]?.message?.content ?? "[]") as string;
            const jsonMatch = gapText.match(/\[[\s\S]*\]/);
            let suggestedIntegrations: { slug: string; name: string; reason: string }[] = [];
            if (jsonMatch) suggestedIntegrations = JSON.parse(jsonMatch[0]);
            // Update onboarding with gap results
            const enrichedContext = { ...context, suggestedIntegrations };
            await updateOnboarding(bgOnboardingId, { context: enrichedContext });
            console.log(`[Onboarding] Background gap detection completed for onboarding ${bgOnboardingId}`);
          } catch (gapErr) {
            console.error("[Onboarding] Background gap detection failed (non-fatal):", gapErr);
          }

          // Welcome email check
          try {
            if (bgCompanyId) {
              const allOnboardings = await getOnboardingsByCompanyId(bgCompanyId);
              const completedCount = allOnboardings.filter(o => o.status === "completed").length;
              const EXEC_TOTAL = 4;
              if (completedCount >= EXEC_TOTAL) {
                const alreadySent = await hasWelcomeEmailBeenSent(bgUserId);
                if (!alreadySent && bgUserEmail) {
                  const company = await getCompanyById(bgCompanyId);
                  const completedAgents = await getAgentsByCompanyId(bgCompanyId);
                  const agentList = completedAgents.slice(0, EXEC_TOTAL).map(a => ({ role: a.roleTitle ?? a.type ?? "Executive", name: a.name }));
                  await sendWelcomeEmail({
                    to: bgUserEmail,
                    name: bgUserName ?? "there",
                    companyName: company?.name ?? "your company",
                    agents: agentList,
                    strategyUrl: `${bgOrigin}/mission-control`,
                  });
                  await markWelcomeEmailSent(bgUserId, bgCompanyId);
                  console.log(`[WelcomeEmail] Sent to ${bgUserEmail} for company ${bgCompanyId}`);
                }
              }
            }
          } catch (emailErr) {
            console.error("[WelcomeEmail] Background non-fatal error:", emailErr);
          }
        });

        return { reply: closingMessage, isComplete: true, context, suggestedIntegrations: [] };
      } else {
        history.push({ role: "assistant", content: reply });
        await updateOnboarding(onboarding.id, { conversationHistory: history });
        return { reply, isComplete: false };
      }
    }),

  // Re-analyze gap detection for a completed onboarding
  reAnalyzeGaps: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const onboarding = await getOnboardingByAgentId(input.agentId);
      if (!onboarding || onboarding.status !== "completed") throw new Error("Onboarding not completed");
      const history = (onboarding.conversationHistory ?? []) as { role: string; content: string }[];
      const conversationText = history.map(h => `${h.role}: ${h.content}`).join("\n");
      const connectedTools = await getUserConnectionsByUserId(ctx.user.id);
      const connectedSlugs = new Set<string>();
      const allProviders = await getAllToolProviders();
      for (const conn of connectedTools.filter(c => c.status === "connected")) {
        const provider = allProviders.find(p => p.id === conn.providerId);
        if (provider) connectedSlugs.add(provider.slug);
      }
      const gapResponse = await invokeLLM({
        messages: [
          { role: "system" as const, content: `You are an integration advisor for an AI executive onboarding system. Analyze the conversation between a user and an AI ${onboarding.agentType.toUpperCase()} agent. Identify data gaps — topics discussed where the user mentioned metrics, tools, or data sources they use but don't have connected. Return a JSON array of suggested integrations.\n\nAvailable integrations: hubspot (CRM/pipeline), salesforce (CRM/pipeline), meta_ads (Facebook/Instagram ads), google_ads (Search/display ads), tiktok_ads (TikTok video ads), ga4 (Google Analytics/traffic), mailchimp (Email marketing), slack (Team communication), stripe_connect (Payments).\n\nAlready connected: ${Array.from(connectedSlugs).join(", ") || "none"}\n\nReturn ONLY a JSON array like: [{"slug": "meta_ads", "name": "Meta Ads", "reason": "You mentioned Facebook ad spend but don't have Meta Ads connected"}]. Return [] if no gaps detected. Do NOT suggest already-connected tools.` },
          { role: "user" as const, content: conversationText },
        ],
      });
      const gapText = (gapResponse.choices[0]?.message?.content ?? "[]") as string;
      const jsonMatch = gapText.match(/\[[\s\S]*\]/);
      let suggestedIntegrations: { slug: string; name: string; reason: string }[] = [];
      if (jsonMatch) suggestedIntegrations = JSON.parse(jsonMatch[0]);
      const existingContext = (onboarding.context ?? {}) as Record<string, unknown>;
      const enrichedContext = { ...existingContext, suggestedIntegrations };
      await updateOnboarding(onboarding.id, { context: enrichedContext });
      return { suggestedIntegrations };
    }),

  // Generate CEO strategy proposal after all C-suite are onboarded
  generateStrategy: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agents = await getAgentsByCompanyId(input.companyId);
      const csuiteAgents = agents.filter(a => CSUITE_TYPES.includes(a.type as any));
      const onboardings = await getOnboardingsByCompanyId(input.companyId);
      const completedMap = new Map(onboardings.filter(o => o.status === "completed").map(o => [o.agentId, o]));

      // Gather all executive context (include skipped/not-onboarded agents with a note)
      const executiveContext = csuiteAgents.map(a => {
        const ob = completedMap.get(a.id);
        const wasSkipped = !ob || ob.status !== "completed";
        return {
          role: a.roleTitle ?? a.type,
          name: a.name,
          summary: wasSkipped ? "[Interview skipped — no context provided]" : (ob?.summary ?? "Not yet onboarded"),
          context: ob?.context ?? {},
          skipped: wasSkipped,
        };
      });

      const company = await getCompanyById(input.companyId);
      const okrs = await getOkrsByCompanyId(input.companyId);

      const websiteAuditSummary = "";

      const briefingFreq = (company as any)?.briefingFrequency ?? "weekly";
      const skippedExecs = executiveContext.filter(e => e.skipped).map(e => e.name);
      const skippedNote = skippedExecs.length > 0
        ? `Note: The following executives did not complete onboarding interviews and their specific context is unavailable: ${skippedExecs.join(", ")}. Make reasonable assumptions for their domains based on the company context.`
        : "All executives completed onboarding interviews.";

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: `You are ARCH, the AI CEO of ${company?.name ?? "this company"} on the OpenCommand platform. You have completed onboarding interviews with your C-suite executives. Based on the collective intelligence gathered, produce a comprehensive formal strategy proposal.

${skippedNote}

This strategy will be delivered to the operator on a ${briefingFreq} briefing cadence. Tailor the action items and review checkpoints accordingly.

Structure your proposal as:
# Strategic Plan: ${company?.name ?? "Company"}

## Executive Summary
(3-4 sentences capturing the core strategy)

## Vision & Mission Alignment
(How the team's insights align with the company vision)

## Strategic Priorities (Next 90 Days)
(Numbered list of 5-7 priorities with owner assignments)

## Resource Allocation
(How to deploy agents and budget across priorities)

## Key Metrics & OKRs
(Specific measurable targets for each priority)

## Risk Assessment
(Top 3 risks and mitigation strategies)

## Immediate Action Items
(First 5 tasks to execute this week)

## Briefing Schedule
(${briefingFreq.charAt(0).toUpperCase() + briefingFreq.slice(1)} review cadence — what to review at each briefing)

Be specific, data-driven where possible, and reference insights from each executive's onboarding.` },
          { role: "user" as const, content: `Company: ${company?.name ?? "Unknown"}
Mission: ${company?.mission ?? "N/A"}
Industry: ${company?.industry ?? "N/A"}
Briefing Frequency: ${briefingFreq}

Executive Onboarding Context:
${executiveContext.map(e => `\n### ${e.name} (${e.role})\n${e.summary}${e.skipped ? " [SKIPPED]" : ""}\nDetails: ${JSON.stringify(e.context)}`).join("\n")}

Current OKRs: ${JSON.stringify(okrs.map(o => ({ objective: o.objective, keyResult: o.keyResult, progress: `${o.currentValue}/${o.targetValue} ${o.unit}` })))}

${websiteAuditSummary ? `Website Audit Intelligence:\n${websiteAuditSummary}` : ""}

Please produce the formal strategy proposal.` },
        ],
      });

      const strategyContent = (response.choices[0]?.message?.content ?? "") as string;
      const execSummaryMatch = strategyContent.match(/## Executive Summary\n([\s\S]*?)(?=\n## )/)
      const execSummary = execSummaryMatch?.[1]?.trim() ?? strategyContent.slice(0, 300);

      await createStrategyProposal({
        userId: ctx.user.id,
        companyId: input.companyId,
        proposedByAgentId: csuiteAgents.find(a => a.type === "ceo")?.id,
        title: `Strategic Plan: ${company?.name ?? "Company"}`,
        content: strategyContent,
        executiveSummary: execSummary,
        status: "proposed",
      });

      emitToUser(ctx.user.id, "task_completed", "Strategy Proposed", `ARCH has proposed a formal strategy for ${company?.name}`, { companyId: input.companyId });
      return { strategy: strategyContent, executiveSummary: execSummary };
    }),

  // List strategy proposals
  proposals: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.companyId) return getStrategyProposalsByCompanyId(input.companyId);
      return getStrategyProposalsByUserId(ctx.user.id);
    }),

  // Accept or revise a proposal
  updateProposalStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["accepted", "revised"]) }))
    .mutation(async ({ input }) => {
      await updateStrategyProposalStatus(input.id, input.status);
      return { success: true };
    }),

  // Accept strategy and auto-populate OKRs from Key Metrics section
  acceptStrategy: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Mark proposal as accepted
      await updateStrategyProposalStatus(input.proposalId, "accepted");

      // Fetch the proposal content
      const proposals = await getStrategyProposalsByCompanyId(input.companyId);
      const proposal = proposals.find(p => p.id === input.proposalId);
      if (!proposal?.content) return { success: true, okrsCreated: 0 };

      // Use LLM to extract OKRs from the strategy content
      const extraction = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an OKR extraction specialist. Extract 3-5 concrete, measurable OKRs from the provided strategy document. Focus on Key Metrics, Goals, and Targets sections. Return ONLY valid JSON — no markdown, no explanation.`,
          },
          {
            role: "user",
            content: `Extract OKRs from this strategy:\n\n${proposal.content.slice(0, 4000)}\n\nReturn JSON array: [{"objective": string, "keyResult": string, "targetValue": number, "unit": string}]`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "okr_list",
            strict: true,
            schema: {
              type: "object",
              properties: {
                okrs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      objective: { type: "string" },
                      keyResult: { type: "string" },
                      targetValue: { type: "number" },
                      unit: { type: "string" },
                    },
                    required: ["objective", "keyResult", "targetValue", "unit"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["okrs"],
              additionalProperties: false,
            },
          },
        },
      });

      let okrsCreated = 0;
      try {
        const raw = extraction.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        const okrList: { objective: string; keyResult: string; targetValue: number; unit: string }[] = parsed.okrs ?? [];
        for (const okr of okrList.slice(0, 5)) {
          if (!okr.objective || !okr.keyResult) continue;
          await createOkr({
            userId: ctx.user.id,
            companyId: input.companyId,
            objective: okr.objective,
            keyResult: okr.keyResult,
            targetValue: String(okr.targetValue ?? 0),
            currentValue: "0",
            unit: okr.unit ?? "",
            status: "on_track",
            level: "company",
            source: "strategy",
          } as any);
          okrsCreated++;
        }
      } catch (e) {
        console.error("[acceptStrategy] OKR extraction failed:", e);
      }

      return { success: true, okrsCreated };
    }),

  // Generate personalized recommendations after all interviews complete
  generateRecommendations: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const onboardings = await getOnboardingsByCompanyId(input.companyId);
      const completed = onboardings.filter(o => o.status === "completed");
      if (completed.length === 0) throw new Error("No completed onboardings found");

      // Check if recommendations already exist on any onboarding for this company
      const existingRecs = completed.find(o => (o as any).recommendations);
      if (existingRecs) return (existingRecs as any).recommendations as { subagents: any[]; goals: any[] };

      const company = await getCompanyById(input.companyId);

      // Gather all executive context
      const executiveContext = completed.map(o => ({
        type: o.agentType,
        summary: o.summary ?? "",
        context: o.context ?? {},
        history: ((o.conversationHistory ?? []) as { role: string; content: string }[]).slice(-10),
      }));

      const transcriptSummary = executiveContext.map(e => {
        const historyText = e.history.map(h => `${h.role === "user" ? "Operator" : "Executive"}: ${h.content}`).join("\n");
        return `### ${e.type.toUpperCase()} Interview\nSummary: ${e.summary}\nContext: ${JSON.stringify(e.context)}\n\nRecent Transcript:\n${historyText}`;
      }).join("\n\n---\n\n");

      const RECOMMENDATION_SYSTEM_PROMPT = `You are an expert AI systems architect for the OpenCommand platform. You have just reviewed the complete onboarding interviews for a specific business. Based on their unique business context, challenges, tools, and priorities, generate personalized recommendations.

OpenCommand uses the 54321 Time Framework:
- 5 = 5-year vision and trajectory
- 4 = 4-month strategic initiatives
- 3 = 3-week sprint-level projects
- 2 = 2-day tactical actions
- 1 = 1-hour immediate execution

The user already has these core executive agents:
- ARCH (AI CEO) — orchestration, OKR tracking, strategic decisions
- NOVA (CMO) — marketing, content, campaigns, lead gen
- SAGE (CTO) — research, competitive intel, technical architecture
- LEDGER (COO) — operations, scheduling, reporting, workflow automation
- APEX (VP Sales) — outreach, pipeline, deal closing [OPTIONAL — only if relevant]

Your job is to recommend ADDITIONAL specialized subagents that extend this team based on what the user specifically needs. Do NOT re-recommend the core agents. Recommend agents that fill gaps the core team doesn't cover for THIS specific business.

You MUST tailor every recommendation to the specific details mentioned in the interviews. Do NOT produce generic recommendations. Reference the user's actual business name, tools, challenges, and goals.

Respond with a JSON object in this exact format:
{
  "subagents": [
    {
      "name": "<Descriptive agent name relevant to their business>",
      "mission": "<1-2 sentences explaining what this agent does for THEIR specific business>",
      "tools": "<Comma-separated list of actual tools/systems they mentioned or that logically connect>",
      "guardrails": "<Specific safety constraint relevant to their industry/situation>",
      "autonomy": "Low|Medium|Medium-high|High",
      "horizons": "<Which 54321 horizons this agent primarily operates on, e.g. '3-week, 2-day'>",
      "rationale": "<Why this agent was recommended based on what they said>"
    }
  ],
  "goals": [
    {
      "command": "/goals <short imperative phrase specific to their business>",
      "horizon": "<Primary 54321 horizon, e.g. '3 — 3-week sprint'>",
      "outcome": "<What success looks like for THEIR company>",
      "context": ["Project: <their actual project>", "Systems: <their actual tools>", "Constraint: <their actual constraint>"],
      "success": ["<Measurable criterion tied to their KPIs>", "<Another criterion>", "<Another>"],
      "finalDeliverable": "<Concrete output they would actually use>"
    }
  ]
}

Rules:
- Every agent name, mission, and tool list must reflect the SPECIFIC business described in the interviews
- Goals must reference the user's actual priorities, metrics, and systems
- Each goal must be tagged with its primary 54321 horizon
- Each subagent must specify which 54321 horizons it operates on
- Do NOT use generic examples — if the user runs a DTC skincare brand, the agents and goals should be about skincare inventory, influencer outreach, and subscription churn, not generic "Revenue Ops"
- If the user mentioned specific tools (e.g., HubSpot, Shopify, Meta Ads), reference those tools
- If the user mentioned specific challenges (e.g., "churn is high", "pipeline is stalled"), create agents/goals that address those exact problems
- Generate 3-5 subagents and 2-4 goals
- Include at least one goal at the 2-day or 1-hour horizon (immediate action) and at least one at the 4-month horizon (strategic)
- Only include APEX (VP Sales) activation recommendation if the user's business has sales pipeline needs
- Format goals with the /goals command prefix to indicate they are formatted prompts for the goal functionality`;

      const userPrompt = `## Company\nName: ${company?.name ?? "Unknown"}\nMission: ${company?.mission ?? "N/A"}\nIndustry: ${company?.industry ?? "N/A"}\nSize: ${(company as any)?.companySize ?? "N/A"}\nWebsite: ${company?.website ?? "N/A"}\n\n## Executive Onboarding Interviews\n${transcriptSummary}\n\nBased on this specific business's situation, generate personalized subagent and goal recommendations using the 54321 Time Framework.`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: RECOMMENDATION_SYSTEM_PROMPT },
          { role: "user" as const, content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subagents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      mission: { type: "string" },
                      tools: { type: "string" },
                      guardrails: { type: "string" },
                      autonomy: { type: "string" },
                      horizons: { type: "string" },
                      rationale: { type: "string" },
                    },
                    required: ["name", "mission", "tools", "guardrails", "autonomy", "horizons", "rationale"],
                    additionalProperties: false,
                  },
                },
                goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      command: { type: "string" },
                      horizon: { type: "string" },
                      outcome: { type: "string" },
                      context: { type: "array", items: { type: "string" } },
                      success: { type: "array", items: { type: "string" } },
                      finalDeliverable: { type: "string" },
                    },
                    required: ["command", "horizon", "outcome", "context", "success", "finalDeliverable"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["subagents", "goals"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = (response.choices[0]?.message?.content ?? "{}") as string;
      let recommendations: { subagents: any[]; goals: any[] };
      try {
        recommendations = JSON.parse(content);
      } catch {
        recommendations = { subagents: [], goals: [] };
      }

      // Store recommendations on the first completed onboarding for this company
      await updateOnboarding(completed[0].id, { recommendations } as any);

      return recommendations;
    }),

  // Generate a personalized 5-question survey based on thumbs + interview context
  generateSurvey: protectedProcedure
    .input(z.object({ companyId: z.number(), thumbs: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const onboardings = await getOnboardingsByCompanyId(input.companyId);
      const completed = onboardings.filter(o => o.status === "completed");
      const company = await getCompanyById(input.companyId);

      const executiveSummaries = completed.map(o => `${o.agentType.toUpperCase()}: ${o.summary ?? "No summary"}`).join("\n");

      const SURVEY_SYSTEM_PROMPT = `You are a product researcher for OpenCommand, an AI executive team platform. A business owner just completed an onboarding demo where they were interviewed by AI executives (ARCH, NOVA, SAGE, LEDGER). You need to generate a personalized 5-question survey to gather meaningful product feedback.

The user gave a thumbs ${input.thumbs === "up" ? "UP (found value)" : "DOWN (did not find value)"}.

${input.thumbs === "up" ? `For thumbs UP users, explore:
- What specific insight or recommendation resonated most
- Which executive felt most relevant to their business
- What they would want the AI to do next for their company
- One question about their preferred update cadence (daily/weekly/monthly/quarterly)
- What feature would make them pay for this immediately` : `For thumbs DOWN users, explore:
- What felt inaccurate or irrelevant about the recommendations
- Which executive felt least useful and why
- What they expected but didn't get
- What would have made the experience more valuable
- Whether they'd try again with different context`}

IMPORTANT: Make questions specific to this company's context. Reference their actual industry, company size, and interview topics. Do NOT ask generic questions.

Respond with a JSON array of exactly 5 questions. Each question must have:
- id: string (q1-q5)
- text: the question text (personalized to their business)
- type: "text" | "select" | "rating"
- options: array of strings (only for select type, 3-5 options)
- placeholder: string (for text type, a helpful hint)`;

      const userPrompt = `Company: ${company?.name ?? "Unknown"} | Industry: ${company?.industry ?? "N/A"} | Size: ${(company as any)?.companySize ?? "N/A"}

Executive Interview Summaries:
${executiveSummaries}

Generate 5 personalized survey questions.`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: SURVEY_SYSTEM_PROMPT },
          { role: "user" as const, content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "survey_questions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      text: { type: "string" },
                      type: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      placeholder: { type: "string" },
                    },
                    required: ["id", "text", "type", "options", "placeholder"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = (response.choices[0]?.message?.content ?? "{}") as string;
      let questions: { id: string; text: string; type: string; options: string[]; placeholder: string }[] = [];
      try {
        const parsed = JSON.parse(content);
        questions = parsed.questions ?? [];
      } catch {
        questions = [];
      }

      return { questions };
    }),

  // Submit survey responses + waitlist email
  submitSurvey: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      thumbs: z.enum(["up", "down"]),
      questions: z.array(z.object({ id: z.string(), text: z.string(), type: z.string(), options: z.array(z.string()), placeholder: z.string() })),
      responses: z.array(z.object({ questionId: z.string(), answer: z.string() })),
      briefingFrequency: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createOnboardingSurvey({
        userId: ctx.user.id,
        companyId: input.companyId,
        thumbs: input.thumbs,
        questions: input.questions,
        responses: input.responses,
        briefingFrequency: input.briefingFrequency ?? null,
        email: input.email ?? null,
      });

      // Update briefing frequency on company if provided
      if (input.briefingFrequency) {
        await updateCompany(input.companyId, { briefingFrequency: input.briefingFrequency as any });
      }

      // Notify owner
      try {
        const company = await getCompanyById(input.companyId);
        await notifyOwner({
          title: `Onboarding Survey — Thumbs ${input.thumbs === "up" ? "👍 UP" : "👎 DOWN"}`,
          content: `${company?.name ?? "Unknown company"} (${ctx.user.email ?? ctx.user.name ?? "user"}) completed the onboarding survey.\n\nThumb: ${input.thumbs}\nBriefing frequency: ${input.briefingFrequency ?? "not set"}\n\nResponses:\n${input.responses.map(r => `• ${r.questionId}: ${r.answer}`).join("\n")}`,
        });
      } catch {}

      return { success: true };
    }),
});

// ─── Guest Onboarding Router ───────────────────────────────────────────────
// Public procedures for the email-gated demo onboarding flow (no auth required)
const guestRouter = router({
  // Initialize a guest session with name + email, return a guestToken
  init: publicProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email(), guestToken: z.string() }))
    .mutation(async ({ input }) => {
      // Check if session already exists (resume)
      const existing = await getGuestSession(input.guestToken);
      if (existing) return { guestToken: input.guestToken, resumed: true };
      // Create a real user record so companies/agents can link to userId
      const user = await findOrCreateUserByEmail(input.email);
      await createGuestSession({
        guestToken: input.guestToken,
        name: input.name,
        email: input.email,
      });
      return { guestToken: input.guestToken, userId: user.id, resumed: false };
    }),

  // Get the current guest session state
  session: publicProcedure
    .input(z.object({ guestToken: z.string() }))
    .query(async ({ input }) => {
      return getGuestSession(input.guestToken);
    }),

  // Create company + agents for a guest session
  setupCompany: publicProcedure
    .input(z.object({
      guestToken: z.string(),
      companyName: z.string().min(1),
      mission: z.string().optional(),
      industry: z.string().optional(),
      website: z.string().optional(),
      companySize: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session) throw new Error("Guest session not found");
      if (session.companyId) return { companyId: session.companyId };

      // Get or create the user for this guest
      const user = await findOrCreateUserByEmail(session.email ?? `guest_${input.guestToken}@opencommand.demo`);

      // Create company
      const result = await createCompany({
        userId: user.id,
        name: input.companyName,
        mission: input.mission ?? null,
        industry: input.industry ?? null,
        website: input.website ?? null,
        companySize: input.companySize as any ?? null,
        monthlyBudget: "0",
        status: "active",
      } as any);
      const companies = await getCompaniesByUserId(user.id);
      const company = companies[0];
      if (!company) throw new Error("Failed to create company");

      // Create the 4 core C-suite agents
      const CSUITE_AGENTS = [
        { type: "ceo", name: "ARCH", roleTitle: "Chief Executive Officer", description: "AI CEO — orchestration, OKR tracking, strategic decisions" },
        { type: "cto", name: "SAGE", roleTitle: "Chief Technology Officer", description: "AI CTO — research, competitive intel, technical architecture" },
        { type: "cmo", name: "NOVA", roleTitle: "Chief Marketing Officer", description: "AI CMO — marketing, content, campaigns, lead gen" },
        { type: "cfo", name: "TED", roleTitle: "Chief Financial Officer", description: "AI CFO — operations, scheduling, reporting, workflow automation" },
      ];
      for (const agent of CSUITE_AGENTS) {
        await createAgent({ userId: user.id, companyId: company.id, ...agent, status: "idle", connectorType: "internal" } as any);
      }

      await updateGuestSession(input.guestToken, { companyId: company.id });
      return { companyId: company.id };
    }),

  // Start onboarding for a guest agent (by agentType, not agentId)
  startInterview: publicProcedure
    .input(z.object({ guestToken: z.string(), agentType: z.enum(["ceo", "cto", "cmo", "cfo"]) }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session?.companyId) throw new Error("Guest session has no company");
      const agents = await getAgentsByCompanyId(session.companyId);
      const agent = agents.find(a => a.type === input.agentType);
      if (!agent) throw new Error(`Agent ${input.agentType} not found`);

      const existing = await getOnboardingByAgentId(agent.id);
      if (existing?.status === "completed") throw new Error("Agent already onboarded");
      if (existing?.status === "in_progress") {
        const history = (existing.conversationHistory as { role: string; content: string }[]) ?? [];
        return { onboardingId: existing.id, agentId: agent.id, resumed: true, conversationHistory: history };
      }

      const systemPrompt = ONBOARDING_SYSTEM_PROMPTS[input.agentType] ?? ONBOARDING_SYSTEM_PROMPTS.vp;
      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: "I'm ready to begin. Let's start." },
        ],
      });
      const firstQuestion = (response.choices[0]?.message?.content ?? "Tell me about your company.") as string;
      const history = [{ role: "assistant", content: firstQuestion }];

      const user = await findOrCreateUserByEmail(session.email ?? `guest_${input.guestToken}@opencommand.demo`);
      await createOnboarding({
        agentId: agent.id,
        userId: user.id,
        companyId: session.companyId,
        agentType: input.agentType,
        conversationHistory: history,
        context: {},
      });
      const created = await getOnboardingByAgentId(agent.id);
      return { onboardingId: created!.id, agentId: agent.id, firstQuestion, resumed: false };
    }),

  // Respond to a guest onboarding question
  respond: publicProcedure
    .input(z.object({ guestToken: z.string(), onboardingId: z.number(), answer: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session) throw new Error("Guest session not found");
      const onboarding = await getOnboardingById(input.onboardingId);
      if (!onboarding) throw new Error("Onboarding not found");
      if (onboarding.status === "completed") throw new Error("Onboarding already completed");

      const rawHistory: { role: string; content: string }[] = (onboarding.conversationHistory as any) ?? [];
      const history = rawHistory.map(h => {
        if (h.role === "assistant") {
          try {
            const parsed = JSON.parse(h.content);
            if (parsed.type === "onboarding_complete" || parsed.type === "core_complete") {
              return { ...h, content: parsed.summary ?? "I have what I need to build your strategic context." };
            }
          } catch (_) {}
        }
        return h;
      });

      const agentType = onboarding.agentType;
      const baseSystemPrompt = ONBOARDING_SYSTEM_PROMPTS[agentType] ?? ONBOARDING_SYSTEM_PROMPTS.vp;
      history.push({ role: "user", content: input.answer });

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: baseSystemPrompt },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        ],
      });
      const reply = (response.choices[0]?.message?.content ?? "") as string;

      // Completion detection
      const completionPhrases = ["i have what i need", "that gives me a", "that gives me enough", "i'm ready to", "i am ready to", "ready to begin", "let's get to work", "this concludes", "that wraps up", "we've covered", "thank you for sharing", "thanks for sharing", "excellent — i now", "excellent, i now", "perfect — i now", "perfect, i now"];
      const isComplete = completionPhrases.some(p => reply.toLowerCase().includes(p));

      if (isComplete) {
        history.push({ role: "assistant", content: reply });
        await completeOnboarding(onboarding.id, reply, {});
        await updateOnboarding(onboarding.id, { conversationHistory: history });
        return { reply, isComplete: true };
      } else {
        history.push({ role: "assistant", content: reply });
        await updateOnboarding(onboarding.id, { conversationHistory: history });
        return { reply, isComplete: false };
      }
    }),

  // Generate strategy for a guest session
  generateStrategy: publicProcedure
    .input(z.object({ guestToken: z.string() }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session?.companyId) throw new Error("Guest session has no company");
      const company = await getCompanyById(session.companyId);
      const onboardings = await getOnboardingsByCompanyId(session.companyId);
      const completed = onboardings.filter(o => o.status === "completed");
      const agents = await getAgentsByCompanyId(session.companyId);
      const csuiteAgents = agents.filter(a => CSUITE_TYPES.includes(a.type as any));
      const completedMap = new Map(completed.map(o => [o.agentId, o]));

      const executiveContext = csuiteAgents.map(a => {
        const ob = completedMap.get(a.id);
        const wasSkipped = !ob || ob.status !== "completed";
        return { role: a.roleTitle ?? a.type, name: a.name, summary: wasSkipped ? "[Interview skipped]" : (ob?.summary ?? "Not yet onboarded"), context: ob?.context ?? {}, skipped: wasSkipped };
      });

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: `You are ARCH, the AI CEO of ${company?.name ?? "this company"} on the OpenCommand platform. Based on the collective intelligence gathered from C-suite onboarding interviews, produce a comprehensive formal strategy proposal.\n\nStructure your proposal as:\n# Strategic Plan: ${company?.name ?? "Company"}\n\n## Executive Summary\n(3-4 sentences capturing the core strategy)\n\n## Vision & Mission Alignment\n## Strategic Priorities (Next 90 Days)\n## Resource Allocation\n## Key Metrics & OKRs\n## Risk Assessment\n## Immediate Action Items\n\nBe specific, data-driven where possible, and reference insights from each executive's onboarding.` },
          { role: "user" as const, content: `Company: ${company?.name ?? "Unknown"}\nMission: ${company?.mission ?? "N/A"}\nIndustry: ${company?.industry ?? "N/A"}\n\nExecutive Onboarding Context:\n${executiveContext.map(e => `### ${e.name} (${e.role})\n${e.summary}${e.skipped ? " [SKIPPED]" : ""}\nDetails: ${JSON.stringify(e.context)}`).join("\n")}\n\nPlease produce the formal strategy proposal.` },
        ],
      });

      const strategyContent = (response.choices[0]?.message?.content ?? "") as string;
      const user = await findOrCreateUserByEmail(session.email ?? `guest_${input.guestToken}@opencommand.demo`);
      await createStrategyProposal({
        userId: user.id,
        companyId: session.companyId,
        title: `Strategic Plan: ${company?.name ?? "Company"}`,
        content: strategyContent,
        executiveSummary: strategyContent.slice(0, 300),
        status: "proposed",
      });
      return { strategy: strategyContent };
    }),

  // Generate personalized recommendations for a guest session
  generateRecommendations: publicProcedure
    .input(z.object({ guestToken: z.string() }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session?.companyId) throw new Error("Guest session has no company");
      if (session.recommendations) return session.recommendations as { subagents: any[]; goals: any[] };

      const company = await getCompanyById(session.companyId);
      const onboardings = await getOnboardingsByCompanyId(session.companyId);
      const completed = onboardings.filter(o => o.status === "completed");
      if (completed.length === 0) throw new Error("No completed onboardings found");

      const executiveContext = completed.map(o => ({
        type: o.agentType,
        summary: o.summary ?? "",
        context: o.context ?? {},
        history: ((o.conversationHistory ?? []) as { role: string; content: string }[]).slice(-10),
      }));

      const transcriptSummary = executiveContext.map(e => {
        const historyText = e.history.map(h => `${h.role === "user" ? "Operator" : "Executive"}: ${h.content}`).join("\n");
        return `### ${e.type.toUpperCase()} Interview\nSummary: ${e.summary}\nContext: ${JSON.stringify(e.context)}\n\nRecent Transcript:\n${historyText}`;
      }).join("\n\n---\n\n");

      const RECOMMENDATION_SYSTEM_PROMPT = `You are an expert AI systems architect for the OpenCommand platform. Based on the onboarding interviews, generate personalized subagent recommendations and /goals prompts.\n\nOpenCommand uses the 54321 Time Framework:\n- 5 = 5-year vision\n- 4 = 4-month strategic initiatives\n- 3 = 3-week sprint-level projects\n- 2 = 2-day tactical actions\n- 1 = 1-hour immediate execution\n\nRespond with a JSON object:\n{\n  "subagents": [{ "name": string, "mission": string, "tools": string, "guardrails": string, "autonomy": string, "horizons": string, "rationale": string }],\n  "goals": [{ "command": string, "horizon": string, "outcome": string, "context": string[], "success": string[], "finalDeliverable": string }]\n}\n\nGenerate 3-5 subagents and 4-6 goals. Make everything specific to this company's context.`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: RECOMMENDATION_SYSTEM_PROMPT },
          { role: "user" as const, content: `Company: ${company?.name ?? "Unknown"} | Industry: ${company?.industry ?? "N/A"} | Size: ${(company as any)?.companySize ?? "N/A"}\n\nInterview Transcripts:\n${transcriptSummary}\n\nGenerate personalized recommendations.` },
        ],
      });

      const content = (response.choices[0]?.message?.content ?? "{}") as string;
      let recommendations: { subagents: any[]; goals: any[] } = { subagents: [], goals: [] };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) recommendations = JSON.parse(jsonMatch[0]);
      } catch {}

      await updateGuestSession(input.guestToken, { recommendations });
      return recommendations;
    }),

  // Generate dynamic survey questions for a guest
  generateSurvey: publicProcedure
    .input(z.object({ guestToken: z.string(), thumbs: z.enum(["up", "down"]) }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session?.companyId) throw new Error("Guest session has no company");
      const company = await getCompanyById(session.companyId);
      const onboardings = await getOnboardingsByCompanyId(session.companyId);
      const completed = onboardings.filter(o => o.status === "completed");

      const executiveSummaries = completed.map(o => `${o.agentType.toUpperCase()}: ${o.summary ?? "No summary"}`).join("\n");

      const SURVEY_SYSTEM_PROMPT = `You are generating a personalized post-onboarding survey for a business owner who just completed the OpenCommand executive AI onboarding.\n\nThe user gave a thumbs ${input.thumbs === "up" ? "UP (found value)" : "DOWN (did not find value)"}.\n\n${input.thumbs === "up" ? `For thumbs UP: explore what resonated, which executive felt most relevant, what they'd want the AI to do next, their preferred update cadence, and what feature would make them pay immediately.` : `For thumbs DOWN: explore what felt inaccurate, which executive felt least useful, what they expected but didn't get, what would have made it more valuable, and whether they'd try again.`}\n\nMake questions specific to this company's context. Respond with a JSON array of exactly 5 questions with: id (q1-q5), text, type (text|select|rating), options (array, for select), placeholder (for text).`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: SURVEY_SYSTEM_PROMPT },
          { role: "user" as const, content: `Company: ${company?.name ?? "Unknown"} | Industry: ${company?.industry ?? "N/A"} | Size: ${(company as any)?.companySize ?? "N/A"}\n\nExecutive Interview Summaries:\n${executiveSummaries}\n\nGenerate 5 personalized survey questions.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "survey_questions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      text: { type: "string" },
                      type: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      placeholder: { type: "string" },
                    },
                    required: ["id", "text", "type", "options", "placeholder"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = (response.choices[0]?.message?.content ?? "{}") as string;
      let questions: { id: string; text: string; type: string; options: string[]; placeholder: string }[] = [];
      try {
        const parsed = JSON.parse(content);
        questions = parsed.questions ?? [];
      } catch {}
      return { questions };
    }),

  // Submit survey + waitlist for a guest
  submitSurvey: publicProcedure
    .input(z.object({
      guestToken: z.string(),
      thumbs: z.enum(["up", "down"]),
      questions: z.array(z.object({ id: z.string(), text: z.string(), type: z.string(), options: z.array(z.string()), placeholder: z.string() })),
      responses: z.array(z.object({ questionId: z.string(), answer: z.string() })),
      briefingFrequency: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await getGuestSession(input.guestToken);
      if (!session) throw new Error("Guest session not found");
      const user = await findOrCreateUserByEmail(session.email ?? input.email ?? `guest_${input.guestToken}@opencommand.demo`);

      const survey = await createOnboardingSurvey({
        userId: user.id,
        companyId: session.companyId ?? undefined,
        thumbs: input.thumbs,
        questions: input.questions,
        responses: input.responses,
        briefingFrequency: input.briefingFrequency ?? null,
        email: input.email ?? session.email ?? null,
      });

      if (session.companyId && input.briefingFrequency) {
        await updateCompany(session.companyId, { briefingFrequency: input.briefingFrequency as any });
      }

      await updateGuestSession(input.guestToken, { surveyId: (survey as any)?.insertId ?? undefined });

      try {
        const company = await getCompanyById(session.companyId ?? 0);
        await notifyOwner({
          title: `Guest Onboarding Survey — Thumbs ${input.thumbs === "up" ? "👍 UP" : "👎 DOWN"}`,
          content: `${company?.name ?? "Unknown company"} (${session.email ?? "guest"}) completed the guest onboarding survey.\n\nThumb: ${input.thumbs}\nBriefing frequency: ${input.briefingFrequency ?? "not set"}\n\nResponses:\n${input.responses.map(r => `• ${r.questionId}: ${r.answer}`).join("\n")}`,
        });
      } catch {}

      return { success: true };
    }),
});

// ─── Waitlist Router ────────────────────────────────────────────────────────
const waitlistRouter = router({
  // Email-first signup: creates user record with email, returns user info
  emailSignup: publicProcedure
    .input(z.object({ email: z.string().email(), referralCode: z.string().optional() }))
    .mutation(async ({ input }) => {
      const user = await findOrCreateUserByEmail(input.email, input.referralCode);
      try {
        await notifyOwner({
          title: "New Email Signup",
          content: `${input.email} signed up via email CTA. Waitlist position: ${user.waitlistPosition ?? 'N/A'}.`,
        });
      } catch {}
      return { success: true, email: user.email, alreadyExists: !!user.openId && !user.openId.startsWith('email_') };
    }),

  // Get waitlist info for the current user
  info: protectedProcedure.query(async ({ ctx }) => {
    await ensureWaitlistFields(ctx.user.id);
    return getWaitlistInfo(ctx.user.id);
  }),

  // Legacy: keep old join/count for backwards compatibility
  join: publicProcedure
    .input(z.object({ email: z.string().email(), source: z.string().optional() }))
    .mutation(async ({ input }) => {
      const already = await isEmailOnWaitlist(input.email);
      if (already) return { success: true, alreadyJoined: true };
      await joinWaitlist({ email: input.email, source: input.source ?? "creators" });
      const count = await getWaitlistCount();
      await notifyOwner({
        title: "New Waitlist Signup",
        content: `${input.email} joined the creators waitlist. Total signups: ${count}.`,
      });
      return { success: true, alreadyJoined: false };
    }),
  count: publicProcedure.query(() => getWaitlistCount()),
});

// ─── Autonomy Settings Router ────────────────────────────────────────────────
const autonomyRouter = router({
  get: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      const settings = await getAutonomySettings(input.agentId);
      return settings ?? {
        agentId: input.agentId,
        autonomyLevel: "supervised" as const,
        maxSpendPerTask: "50",
        maxTasksPerDay: 10,
        allowedActions: null,
        blockedActions: null,
        requireApprovalAbove: "100",
        crossModelVerification: false,
        ralfEnabled: true,
      };
    }),
  update: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      autonomyLevel: z.enum(["full_auto", "supervised", "approval_required", "manual_only"]).optional(),
      maxSpendPerTask: z.number().optional(),
      maxTasksPerDay: z.number().optional(),
      requireApprovalAbove: z.number().optional(),
      crossModelVerification: z.boolean().optional(),
      ralfEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { agentId, ...data } = input;
      const mapped: Record<string, unknown> = {};
      if (data.autonomyLevel !== undefined) mapped.autonomyLevel = data.autonomyLevel;
      if (data.maxSpendPerTask !== undefined) mapped.maxSpendPerTask = String(data.maxSpendPerTask);
      if (data.maxTasksPerDay !== undefined) mapped.maxTasksPerDay = data.maxTasksPerDay;
      if (data.requireApprovalAbove !== undefined) mapped.requireApprovalAbove = String(data.requireApprovalAbove);
      if (data.crossModelVerification !== undefined) mapped.crossModelVerification = data.crossModelVerification;
      if (data.ralfEnabled !== undefined) mapped.ralfEnabled = data.ralfEnabled;
      await upsertAutonomySettings(agentId, mapped);
      return { success: true };
    }),
});

// ─── RALF Execution Router ──────────────────────────────────────────────────
const ralfRouter = router({
  logsByTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(({ input }) => getRalfLogsByTask(input.taskId)),
  logsByAgent: protectedProcedure
    .input(z.object({ agentId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => getRalfLogsByAgent(input.agentId, input.limit)),
  execute: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      agentId: z.number(),
      companyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new Error("Task not found");

      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");

      const autonomy = await getAutonomySettings(input.agentId);
      const ralfEnabled = autonomy?.ralfEnabled ?? true;
      const crossModel = autonomy?.crossModelVerification ?? false;

      if (!ralfEnabled) {
        return { message: "RALF is disabled for this agent", phases: [] };
      }

      const phases = ["reason", "act", "learn", "feedback"] as const;
      const results: Array<{ phase: string; output: string; confidence: string; status: string }> = [];

      let previousOutput = "";

      for (const phase of phases) {
        // Create the log entry
        const logResult = await createRalfLog({
          taskId: input.taskId,
          agentId: input.agentId,
          companyId: input.companyId,
          phase,
          input: phase === "reason" ? task.description ?? task.title : previousOutput,
          status: "running",
        });
        const logId = Number((logResult as any)?.[0]?.insertId ?? 0);

        try {
          const phasePrompts: Record<string, string> = {
            reason: `You are ${agent.name} (${agent.roleTitle ?? agent.type}). REASON phase: Analyze this task and determine the best approach. Task: "${task.title}" — ${task.description ?? ""}. Output your reasoning in 2-3 sentences. Include what data you need and what approach you'll take.`,
            act: `You are ${agent.name}. ACT phase: Based on this reasoning: "${previousOutput}", describe the specific actions you would take to execute this task. Be concrete and specific. List 2-4 action steps.`,
            learn: `You are ${agent.name}. LEARN phase: Based on the actions taken: "${previousOutput}", what did you learn? What patterns or insights emerged? How would you improve next time? 2-3 sentences.`,
            feedback: `You are ${agent.name}. FEEDBACK phase: Based on the full execution cycle, provide a confidence score (0.0-1.0) and a brief summary of outcomes and recommendations. Previous learning: "${previousOutput}"`,
          };

          const ralfDispatch = await dispatchToConnector({
            connectorType: agent.connectorType ?? "internal",
            connectorConfig: agent.connectorConfig ?? null,
            agentName: agent.name,
            agentRole: agent.roleTitle ?? agent.type,
            systemPrompt: phasePrompts[phase] ?? "",
            userMessage: `Execute the ${phase} phase for task: ${task.title}`,
          });

          const output = ralfDispatch.content;
          let confidence = "0.75";

          // Extract confidence from feedback phase
          if (phase === "feedback") {
            const match = output.match(/(\d\.\d+)/);
            if (match) confidence = match[1];
          }

          // Cross-model verification if enabled
          let verificationResult = null;
          if (crossModel && (phase === "act" || phase === "feedback")) {
            try {
              const verifyResponse = await invokeLLM({
                messages: [
                  { role: "system", content: `You are a verification agent. Review this AI agent's output for accuracy, safety, and alignment with the task goal. Rate confidence 0.0-1.0 and flag any concerns.` },
                  { role: "user", content: `Task: ${task.title}\nAgent output (${phase} phase): ${output}` },
                ],
              });
              verificationResult = (verifyResponse.choices[0]?.message?.content ?? "") as string;
            } catch {
              verificationResult = "Verification unavailable";
            }
          }

          await updateRalfLogStatus(logId, "completed", output, confidence);
          previousOutput = output;
          results.push({ phase, output, confidence, status: "completed" });
        } catch (err) {
          await updateRalfLogStatus(logId, "failed", String(err));
          results.push({ phase, output: String(err), confidence: "0", status: "failed" });
          break; // Stop the loop on failure
        }
      }

      // Update task status based on RALF completion
      const allCompleted = results.every(r => r.status === "completed");
      if (allCompleted) {
        await updateTask(input.taskId, { status: "completed" });
      }

      return { phases: results, completed: allCompleted };
    }),
});

// ─── Sub-Agent Recommendations Router ───────────────────────────────────────
const subAgentRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getSubAgentRecommendations(input.companyId)),
  byExecutive: protectedProcedure
    .input(z.object({ executiveAgentId: z.number() }))
    .query(({ input }) => getSubAgentRecommendationsByExecutive(input.executiveAgentId)),
  generate: protectedProcedure
    .input(z.object({ companyId: z.number(), executiveAgentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.executiveAgentId);
      if (!agent) throw new Error("Executive agent not found");

      const company = await getCompanyById(input.companyId);
      const connections = await getUserConnectionsByUserId(ctx.user.id);
      const connectedTools = connections.filter(c => c.status === "connected").map(c => c.accountName ?? String(c.providerId)).filter(Boolean);
      const existingAgents = await getAgentsByCompanyId(input.companyId);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are ${agent.name}, the ${agent.roleTitle ?? agent.type} at ${company?.name ?? "the company"}. Based on the company's connected tools and existing team, recommend 2-3 sub-agents that would maximize autonomous work completion under your department.\n\nConnected tools: ${connectedTools.join(", ") || "none"}\nExisting agents: ${existingAgents.map(a => `${a.name} (${a.roleTitle ?? a.type})`).join(", ")}\n\nFor each recommendation, specify the agent's name, role, justification, required tools, and estimated business impact.`,
          },
          { role: "user", content: "Recommend sub-agents for your department." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "sub_agent_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      roleTitle: { type: "string" },
                      justification: { type: "string" },
                      requiredTools: { type: "array", items: { type: "string" } },
                      estimatedImpact: { type: "string" },
                    },
                    required: ["name", "type", "roleTitle", "justification", "requiredTools", "estimatedImpact"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(response.choices[0].message.content as string);

      for (const rec of parsed.recommendations) {
        await createSubAgentRecommendation({
          companyId: input.companyId,
          executiveAgentId: input.executiveAgentId,
          recommendedName: rec.name,
          recommendedType: rec.type,
          roleTitle: rec.roleTitle,
          justification: rec.justification,
          requiredTools: rec.requiredTools,
          estimatedImpact: rec.estimatedImpact,
        });
      }

      return { recommendations: parsed.recommendations, count: parsed.recommendations.length };
    }),
  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["suggested", "approved", "deployed", "dismissed"]) }))
    .mutation(async ({ input }) => {
      await updateSubAgentRecommendationStatus(input.id, input.status);
      return { success: true };
    }),
  deploy: protectedProcedure
    .input(z.object({ id: z.number(), companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the recommendation
      const recs = await getSubAgentRecommendations(input.companyId);
      const rec = recs.find(r => r.id === input.id);
      if (!rec) throw new Error("Recommendation not found");

      // Create the actual agent
      const result = await createAgent({
        userId: ctx.user.id,
        companyId: input.companyId,
        parentAgentId: rec.executiveAgentId,
        name: rec.recommendedName,
        type: "specialist" as any,
        roleTitle: rec.roleTitle,
        description: rec.justification,
        tools: rec.requiredTools as string[],
        status: "idle",
      });

      await updateSubAgentRecommendationStatus(input.id, "deployed");

      return { success: true, agentId: Number((result as any)[0]?.insertId ?? 0) };
    }),
});

// ─── Briefings Router ────────────────────────────────────────────────────────────────────────────────
const briefingsRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.companyId) return getBriefingLogsByCompanyId(input.companyId);
      return getBriefingLogsByUserId(ctx.user.id);
    }),
  generateNow: protectedProcedure
    .input(z.object({ companyId: z.number(), frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("daily") }))
    .mutation(async ({ ctx, input }) => {
      // Get company context
      const company = await getCompanyById(input.companyId);
      if (!company) throw new Error("Company not found");

      const agents = await getAgentsByCompanyId(input.companyId);
      const tasks = await getTasksByCompanyId(input.companyId);
      const okrs = await getOkrsByCompanyId(input.companyId);

      const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "awaiting_human");
      const completedTasks = tasks.filter(t => t.status === "completed");
      const activeAgents = agents.filter(a => a.status === "active");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the AI CEO briefing engine for ${company.name}. Generate a concise ${input.frequency} executive briefing.\n\nCompany: ${company.name} (${company.industry ?? ""})\nActive agents: ${activeAgents.length}\nPending tasks: ${pendingTasks.length}\nCompleted tasks (recent): ${completedTasks.slice(0, 10).map(t => t.title).join(", ")}\nOKRs: ${okrs.slice(0, 5).map(o => `${o.objective} (${o.status})`).join(", ")}\n\nInclude:\n1. Key metrics summary\n2. Top priorities requiring attention\n3. Agent performance highlights\n4. Strategic recommendations\n5. Items requiring human approval (mark with [ACTION REQUIRED])`,
          },
          { role: "user", content: `Generate the ${input.frequency} briefing for ${company.name}.` },
        ],
      });

      const content = (response.choices[0]?.message?.content ?? "") as string;
      const title = `${input.frequency.charAt(0).toUpperCase() + input.frequency.slice(1)} Briefing — ${new Date().toLocaleDateString()}`;

      await createBriefingLog({
        userId: ctx.user.id,
        companyId: input.companyId,
        frequency: input.frequency,
        title,
        content,
      });

      return { title, content };
    }),
  approveAction: protectedProcedure
    .input(z.object({ briefingId: z.number(), actionText: z.string(), companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Create a task from the approved action
      const result = await createTask({
        userId: ctx.user.id,
        companyId: input.companyId,
        title: input.actionText.slice(0, 256),
        description: `Approved from briefing #${input.briefingId}: ${input.actionText}`,
        status: "pending",
        priority: "high",
      });

      // Create inbox notification
      await createInboxItem({
        userId: ctx.user.id,
        companyId: input.companyId,
        type: "alert",
        title: "Briefing action approved",
        body: input.actionText.slice(0, 500),
        priority: "high",
      });

      return { success: true, taskId: Number((result as any)[0]?.insertId ?? 0) };
    }),
});

// ─── Analytics Router (Usage Tracking) ──────────────────────────────────────
const analyticsRouter = router({
  track: protectedProcedure
    .input(z.object({ feature: z.string().max(64), action: z.string().max(64), metadata: z.record(z.string(), z.unknown()).optional() }))
    .mutation(({ ctx, input }) => createFeatureEvent({ userId: ctx.user.id, feature: input.feature, action: input.action, metadata: input.metadata })),
  summary: protectedProcedure.query(() => getFeatureEventsSummary()),
  events: protectedProcedure.query(() => getFeatureEventsAll()),
});

// ─── Feedback Router ────────────────────────────────────────────────────────
const changelogRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      return getChangelogEntries(input?.limit ?? 20);
    }),
});

const feedbackRouter = router({
  submit: protectedProcedure
    .input(z.object({ type: z.enum(["bug", "feature", "general", "praise"]).default("general"), content: z.string().min(1).max(2000), page: z.string().max(128).optional() }))
    .mutation(async ({ ctx, input }) => {
      await createUserFeedback({ userId: ctx.user.id, type: input.type, content: input.content, page: input.page });
      try { await notifyOwner({ title: `New ${input.type} feedback`, content: `From ${ctx.user.name || ctx.user.email || "user"}: ${input.content.slice(0, 500)}` }); } catch {}
      return { success: true };
    }),
  list: protectedProcedure.query(() => getUserFeedbackAll()),
  mine: protectedProcedure.query(({ ctx }) => getUserFeedbackByUserId(ctx.user.id)),
  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["new", "reviewed", "resolved"]) }))
    .mutation(({ input }) => updateFeedbackStatus(input.id, input.status)),
});

// ─── Page Tracking (beacon from client) ──────────────────────────────────────
const trackingRouter = router({
  pageView: publicProcedure
    .input(z.object({
      path: z.string().max(512),
      sessionId: z.string().max(64),
      referrer: z.string().max(512).optional(),
      userAgent: z.string().max(512).optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await insertPageView({
        userId: ctx.user?.id ?? null,
        sessionId: input.sessionId,
        path: input.path,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        duration: input.duration ?? null,
      });
      if (ctx.user?.id) {
        await upsertUserSession({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          lastSeenAt: new Date(),
          exitPath: input.path,
          userAgent: input.userAgent ?? null,
          duration: input.duration ?? 0,
        });
      }
      return { ok: true };
    }),
});

// ─── Admin Router (owner-only) ────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new Error("FORBIDDEN");
  return next({ ctx });
});

const adminRouter = router({
  users: adminProcedure.query(() => adminGetAllUsers()),
  // Waitlist management
  waitlistStats: adminProcedure.query(() => adminGetWaitlistStats()),
  waitlistUsers: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input }) => adminGetWaitlistUsers(input?.status)),
  approveUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      // Fetch user info before approving (need email and position for notification)
      const userInfo = await getUserByIdForApproval(input.userId);
      await adminApproveUser(input.userId);
      // Send approval email if user has an email address
      if (userInfo?.email) {
        const loginUrl = "https://opencommand.co";
        sendWaitlistApprovalEmail({
          to: userInfo.email,
          name: userInfo.name ?? "",
          position: userInfo.waitlistPosition ?? 0,
          loginUrl,
        }).catch(err => console.error("[WaitlistApproval] Failed to send email:", err));
      }
      return { success: true };
    }),
  rejectUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await adminRejectUser(input.userId);
      return { success: true };
    }),
  bulkApprove: adminProcedure
    .input(z.object({ userIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await adminBulkApproveUsers(input.userIds);
      return { success: true };
    }),
  userKpis: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetUserKpis(input.userId)),
  userTimeline: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetUserTimeline(input.userId)),
  userDailyActivity: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetDailyActivity(input.userId)),
  userPageViews: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getPageViewsByUser(input.userId)),
  userTopPages: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTopPagesByUser(input.userId)),
  userSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getSessionsByUser(input.userId)),
  userFeedback: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserFeedbackByUserId(input.userId)),
  funnelStats: adminProcedure.query(() => adminGetFunnelStats()),
  userFunnelStage: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetUserFunnelStage(input.userId)),
  // Demo user management
  seedDemoUser: adminProcedure.mutation(async () => {
    const result = await seedDemoUser();
    return result;
  }),
  getDemoUserInfo: adminProcedure.query(async () => {
    const userId = await getDemoUserId();
    return { userId, email: DEMO_EMAIL, exists: userId !== null };
  }),
  getDemoLoginUrl: adminProcedure
    .input(z.object({ origin: z.string() }))
    .query(({ input }) => {
      const secret = (process.env.JWT_SECRET ?? "").slice(0, 16);
      const url = `${input.origin}/api/demo-login?secret=${encodeURIComponent(secret)}&returnTo=/mission-control`;
      return { url };
    }),
  // ─── Leads Dashboard ─────────────────────────────────────────────────────

  leadIntentHistory: adminProcedure
    .input(z.object({ userId: z.number().optional(), email: z.string().optional() }))
    .query(async ({ input }) => {
      // Get decision log entries (intent engine queries) for a user
      if (input.userId) {
        return getDecisionLogByUserId(input.userId);
      }
      return [];
    }),

  // ─── Survey Responses ────────────────────────────────────────────────────
  allSurveys: adminProcedure.query(() => adminGetAllSurveys()),
  userSurvey: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetSurveyByUserId(input.userId)),
  userCompany: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetUserCompany(input.userId)),
  userOnboardings: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => adminGetUserOnboardings(input.userId)),
});



export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  companies: companiesRouter,
  departments: departmentsRouter,
  agents: agentsRouter,
  okrs: okrsRouter,
  tasks: tasksRouter,
  poo: pooRouter,
  inbox: inboxRouter,
  governance: governanceRouter,
  blueprints: blueprintsRouter,
  marketplace: marketplaceRouter,
  skills: skillsRouter,
  integrations: integrationsRouter,
  creators: creatorsRouter,
  aiCeo: aiCeoRouter,
  payments: paymentsRouter,
  hub: integrationHubRouter,
  context: contextEngineRouter,
  compatibility: compatibilityRouter,
  projects: projectsRouter,
  onboarding: onboardingRouter,
  guest: guestRouter,
  waitlist: waitlistRouter,
  briefings: briefingsRouter,
  analytics: analyticsRouter,
  feedback: feedbackRouter,
  changelog: changelogRouter,
  tracking: trackingRouter,
  admin: adminRouter,
  autonomy: autonomyRouter,
  ralf: ralfRouter,
  subAgents: subAgentRouter,
  leadResponse: leadResponseRouter,
  intentEngine: intentEngineRouter,
  templates: templatesRouter,
  workspace: workspaceRouter,
  goals: goalsRouter,

});

export type AppRouter = typeof appRouter;
