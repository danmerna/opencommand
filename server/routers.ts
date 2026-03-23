import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
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
} from "./db";
import { nanoid } from "nanoid";
import { assembleContext } from "./integrations/contextAssembler";
import { PRODUCTS, type ProductKey } from "./stripe/products";
import { emitToUser } from "./socketEmit";
import { sendWelcomeEmail } from "./email";

// ─── Companies Router ────────────────────────────────────────────────────────
const companiesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCompaniesByUserId(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCompanyById(input.id)),
  pnl: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getCompanyPnL(input.companyId)),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), mission: z.string().optional(), industry: z.string().optional(), monthlyBudget: z.number().optional(), briefingFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await createCompany({ userId: ctx.user.id, name: input.name, mission: input.mission, industry: input.industry, monthlyBudget: input.monthlyBudget ? String(input.monthlyBudget) : "0", briefingFrequency: input.briefingFrequency } as any);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), mission: z.string().optional(), industry: z.string().optional(), status: z.enum(["active", "paused", "archived"]).optional(), monthlyBudget: z.number().optional(), briefingFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional() }))
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.mission !== undefined) data.mission = input.mission;
      if (input.industry !== undefined) data.industry = input.industry;
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
      heartbeatCron: z.string().optional(), monthlyBudget: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createAgent({
        userId: ctx.user.id, name: input.name, type: input.type, description: input.description,
        capabilities: input.capabilities ?? [], status: "idle",
        companyId: input.companyId, departmentId: input.departmentId, parentAgentId: input.parentAgentId,
        roleTitle: input.roleTitle, jobDescription: input.jobDescription, tools: input.tools ?? [],
        connectorType: input.connectorType ?? "internal",
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
      emitToUser(ctx.user.id, "heartbeat", `Heartbeat: ${agent.name}`, `Checked ${pendingTasks.length} tasks, acted on ${tasksActedOn}. Duration: ${duration}ms`, { agentId: input.agentId, tasksChecked: pendingTasks.length, tasksActedOn });
      return { success: true, tasksChecked: pendingTasks.length, tasksActedOn, duration };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getAgentsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "Agents already exist" };
    const comps = await getCompaniesByUserId(ctx.user.id);
    const companyId = comps[0]?.id ?? null;
    const defaults = [
      { name: "Arch — AI CEO", type: "ceo" as const, roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"] },
      { name: "NOVA — CMO", type: "cmo" as const, roleTitle: "Chief Marketing Officer", description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"], tools: ["mailchimp", "analytics", "social-scheduler"] },
      { name: "SAGE — CTO", type: "cto" as const, roleTitle: "Chief Technology Officer", description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"], tools: ["github", "jira", "datadog"] },
      { name: "APEX — VP Sales", type: "vp" as const, roleTitle: "VP of Sales", description: "Autonomous outreach, pipeline management, and deal closing agent.", capabilities: ["lead-scoring", "outreach", "crm-sync", "follow-up"], tools: ["stripe", "hubspot", "calendly"] },
      { name: "ECHO — Specialist", type: "specialist" as const, roleTitle: "Operations Specialist", description: "Operations and administrative task automation agent.", capabilities: ["scheduling", "reporting", "document-management", "workflow-automation"], tools: ["notion", "slack", "zapier"] },
    ];
    for (const agent of defaults) {
      await createAgent({ userId: ctx.user.id, companyId, ...agent, status: "idle" } as any);
    }
    return { success: true };
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
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are the OpenCommand AI Agent CEO executing a task autonomously. Complete the task and provide: 1) A detailed outcome description, 2) Estimated labor hours saved vs doing this manually, 3) Dollar value created (use $150/hr benchmark), 4) Estimated cost of this execution. Respond in JSON format with keys: outcome, laborHoursSaved, dollarValueCreated, costIncurred, executionSteps (array of strings)." },
          { role: "user", content: `Execute this task:\nTitle: ${task.title}\nDescription: ${task.description ?? ""}\nPrompt: ${task.generatedPrompt ?? ""}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "task_execution_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                outcome: { type: "string" },
                laborHoursSaved: { type: "number" },
                dollarValueCreated: { type: "number" },
                costIncurred: { type: "number" },
                executionSteps: { type: "array", items: { type: "string" } },
              },
              required: ["outcome", "laborHoursSaved", "dollarValueCreated", "costIncurred", "executionSteps"],
              additionalProperties: false,
            },
          },
        },
      });
      let result = { outcome: "Task completed successfully.", laborHoursSaved: 2, dollarValueCreated: 300, costIncurred: 0.12, executionSteps: ["Task analyzed", "Execution completed"] };
      try { const content = (response.choices[0]?.message?.content ?? "{}") as string; result = JSON.parse(content); } catch (_) {}
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
    await createAgent({ userId: ctx.user.id, name: "Arch — AI CEO (Marketplace)", type: "ceo", status: "idle", description: "Flagship AI CEO agent", isMarketplaceListing: true } as any);
    const agentsData = await getAgentsByUserId(ctx.user.id);
    const ceoAgent = agentsData.find(a => a.type === "ceo" && a.isMarketplaceListing);
    const agentId = ceoAgent?.id ?? 1;
    const listings = [
      { agentId, listingType: "agent" as const, tier: "solo_founder" as const, name: "Arch Solo-Founder CEO", tagline: "Your first autonomous executive hire.", description: "Arch orchestrates up to 3 subordinate agents, tracks your OKRs in real-time, and generates Proof of Outcome receipts for every task completed.", price: "199.00", pricingModel: "monthly" as const, features: JSON.stringify(["OKR Dashboard", "3 Subordinate Agents", "PoO Receipt Generation", "Human-in-the-Loop Inbox", "Socratic Intent Engine"]), endorsedBy: "Alex Chen", endorserHandle: "@alexbuilds", endorserNiche: "Indie Hacking", totalPurchases: 247, avgRating: "4.80" },
      { agentId, listingType: "agent" as const, tier: "enterprise" as const, name: "Arch Enterprise CEO", tagline: "Full Agentic Operating Model for scaling teams.", description: "Unlimited subordinate agent orchestration, custom API integrations, advanced PoO analytics with ROI tracking, and a 5% value capture model.", price: null, pricingModel: "value_capture" as const, features: JSON.stringify(["Unlimited Agents", "Custom API Integrations", "Advanced PoO Analytics", "5% Value Capture Model", "White-label Mission Control"]), endorsedBy: "Sarah Martinez", endorserHandle: "@sarahscales", endorserNiche: "Agency Growth", totalPurchases: 43, avgRating: "4.95" },
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
          { role: "system" as const, content: "You are Arch, the OpenCommand AI CEO. Analyze the user's goal in context of their current OKRs and agent fleet, then produce a strategic action plan. Be specific, actionable, and assign tasks to appropriate agents. Respond in 3-5 sentences followed by a numbered action list." },
          { role: "user" as const, content: `Goal: ${input.goal}\n\nCurrent OKRs: ${okrSummary}\n\nAgent Fleet: ${agentSummary}` },
        ],
      });
      const strategy = (response.choices[0]?.message?.content ?? "") as string;
      await createDecisionLogEntry({ userId: ctx.user.id, companyId: input.companyId, decisionType: "strategic_planning", context: input.goal, decision: strategy, rationale: "AI CEO strategic analysis" });
      return { strategy };
    }),

  decisionLog: protectedProcedure.query(({ ctx }) => getDecisionLogByUserId(ctx.user.id)),
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
  liveContextualize: protectedProcedure.input(z.object({
    requestText: z.string().min(1),
  })).mutation(async ({ ctx, input }) => {
    const result = await assembleContext(input.requestText, ctx.user.id);
    return result;
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
  ceo: `You are conducting a Socratic onboarding interview for the CEO (Arch) of a new company on the OpenCommand platform. Your goal is to deeply understand the founder's vision, business model, company culture, competitive landscape, and strategic priorities.

Ask ONE focused question at a time. Be conversational but purposeful. After each answer, acknowledge what you learned and ask a deeper follow-up. Cover these areas across 6-8 questions:
1. Company vision and mission (what problem are you solving?)
2. Business model and revenue strategy
3. Target market and ideal customer
4. Competitive landscape and differentiation
5. Current team/resource situation
6. 90-day priorities and success metrics
7. Company culture and decision-making style
8. Risk tolerance and growth philosophy

When you have gathered enough context (after 6-8 exchanges), respond with a JSON object:
{"type": "onboarding_complete", "summary": "<2-3 paragraph executive summary of everything learned>", "context": {"vision": "...", "businessModel": "...", "targetMarket": "...", "competition": "...", "priorities": "...", "culture": "...", "risks": "..."}}

Do NOT complete early. Gather rich, specific context.`,

  cto: `You are conducting a Socratic onboarding interview for the CTO (SAGE) of a company on OpenCommand. Your goal is to understand the technical landscape, infrastructure, development priorities, and engineering culture.

Ask ONE focused question at a time. Cover these areas across 5-7 questions:
1. Current tech stack and infrastructure
2. Product/platform architecture
3. Development methodology and team structure
4. Technical debt and biggest challenges
5. Security and compliance requirements
6. Technology roadmap and priorities
7. Build vs buy philosophy

When complete (5-7 exchanges), respond with JSON:
{"type": "onboarding_complete", "summary": "<technical summary>", "context": {"techStack": "...", "architecture": "...", "methodology": "...", "challenges": "...", "security": "...", "roadmap": "..."}}

Do NOT complete early.`,

  cmo: `You are conducting a Socratic onboarding interview for the CMO (NOVA) of a company on OpenCommand. Your goal is to understand the brand, marketing channels, audience, and growth strategy.

Ask ONE focused question at a time. Cover these areas across 5-7 questions:
1. Brand identity and positioning
2. Target audience and buyer personas
3. Current marketing channels and performance
4. Content strategy and voice
5. Growth goals and KPIs
6. Budget allocation and priorities
7. Competitive marketing landscape

When complete (5-7 exchanges), respond with JSON:
{"type": "onboarding_complete", "summary": "<marketing summary>", "context": {"brand": "...", "audience": "...", "channels": "...", "content": "...", "goals": "...", "budget": "..."}}

Do NOT complete early.`,

  cfo: `You are conducting a Socratic onboarding interview for the CFO of a company on OpenCommand. Your goal is to understand the financial model, runway, revenue streams, and fiscal priorities.

Ask ONE focused question at a time. Cover these areas across 5-7 questions:
1. Revenue model and current revenue
2. Cost structure and burn rate
3. Funding status and runway
4. Financial goals and targets
5. Budget allocation philosophy
6. Key financial metrics tracked
7. Risk management approach

When complete (5-7 exchanges), respond with JSON:
{"type": "onboarding_complete", "summary": "<financial summary>", "context": {"revenue": "...", "costs": "...", "funding": "...", "goals": "...", "budget": "...", "metrics": "..."}}

Do NOT complete early.`,

  vp: `You are conducting a Socratic onboarding interview for a VP-level executive of a company on OpenCommand. Your goal is to understand their functional area, team dynamics, and operational priorities.

Ask ONE focused question at a time. Cover these areas across 5-7 questions:
1. Functional area and responsibilities
2. Current team and resources
3. Key processes and workflows
4. Biggest operational challenges
5. Success metrics and KPIs
6. Cross-functional dependencies
7. Short-term priorities

When complete (5-7 exchanges), respond with JSON:
{"type": "onboarding_complete", "summary": "<operational summary>", "context": {"function": "...", "team": "...", "processes": "...", "challenges": "...", "metrics": "...", "priorities": "..."}}

Do NOT complete early.`,
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
      if (existing?.status === "in_progress") return { onboardingId: existing.id, resumed: true };
      const systemPrompt = ONBOARDING_SYSTEM_PROMPTS[agent.type] ?? ONBOARDING_SYSTEM_PROMPTS.vp;

      // If live context was assembled from connected tools, inject it so the first question is data-informed
      let contextPreamble = `I'm ready to onboard ${agent.name} (${agent.roleTitle ?? agent.type}). Let's begin.`;
      if (input.contextSummary) {
        contextPreamble = `I'm ready to onboard ${agent.name} (${agent.roleTitle ?? agent.type}). Here is live data from our connected business tools that you should reference in your questions:\n\n${input.contextSummary}\n\nUse this data to ask specific, data-informed questions rather than generic ones. Reference actual numbers, trends, and metrics from the data above.`;
      }

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: contextPreamble },
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
        context: {},
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

      const history: { role: string; content: string }[] = (onboarding.conversationHistory as any) ?? [];
      history.push({ role: "user", content: input.answer });

      const systemPrompt = ONBOARDING_SYSTEM_PROMPTS[onboarding.agentType] ?? ONBOARDING_SYSTEM_PROMPTS.vp;
      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        ],
      });
      const reply = (response.choices[0]?.message?.content ?? "") as string;

      // Check if the LLM signaled completion
      let isComplete = false;
      let summary = "";
      let context: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(reply);
        if (parsed.type === "onboarding_complete") {
          isComplete = true;
          summary = parsed.summary ?? "";
          context = parsed.context ?? {};
        }
      } catch (_) {
        // Not JSON — it's another question
      }

      if (isComplete) {
        history.push({ role: "assistant", content: `Onboarding complete. ${summary}` });

        // Detect data gaps and suggest integrations based on the conversation
        let suggestedIntegrations: { slug: string; name: string; reason: string }[] = [];
        try {
          const conversationText = history.map(h => `${h.role}: ${h.content}`).join("\n");
          const connectedTools = await getUserConnectionsByUserId(onboarding.userId);
          const connectedSlugs = new Set<string>();
          // Get provider slugs for connected tools
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
          if (jsonMatch) {
            suggestedIntegrations = JSON.parse(jsonMatch[0]);
          }
        } catch (gapErr) {
          console.error("[Onboarding] Gap detection failed (non-fatal):", gapErr);
        }

        // Store suggested integrations in the context
        const enrichedContext = { ...context, suggestedIntegrations };
        await completeOnboarding(onboarding.id, summary, enrichedContext);
        await updateOnboarding(onboarding.id, { conversationHistory: history });

        // Check if all executives are now complete → send welcome email
        try {
          if (onboarding.companyId) {
            const allOnboardings = await getOnboardingsByCompanyId(onboarding.companyId);
            const completedCount = allOnboardings.filter(o => o.status === "completed").length;
            const EXEC_TOTAL = 4;
            if (completedCount >= EXEC_TOTAL) {
              const alreadySent = await hasWelcomeEmailBeenSent(ctx.user.id);
              if (!alreadySent && ctx.user.email) {
                const company = await getCompanyById(onboarding.companyId);
                const completedAgents = await getAgentsByCompanyId(onboarding.companyId);
                const agentList = completedAgents.slice(0, EXEC_TOTAL).map(a => ({ role: a.roleTitle ?? a.type ?? "Executive", name: a.name }));
                const origin = (ctx.req as any).headers?.origin ?? "https://opencommand.co";
                await sendWelcomeEmail({
                  to: ctx.user.email,
                  name: ctx.user.name ?? "there",
                  companyName: company?.name ?? "your company",
                  agents: agentList,
                  strategyUrl: `${origin}/mission-control`,
                });
                await markWelcomeEmailSent(ctx.user.id, onboarding.companyId);
                console.log(`[WelcomeEmail] Sent to ${ctx.user.email} for company ${onboarding.companyId}`);
              }
            }
          }
        } catch (emailErr) {
          console.error("[WelcomeEmail] Non-fatal error:", emailErr);
        }

        return { reply: summary, isComplete: true, context: enrichedContext, suggestedIntegrations };
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

      const briefingFreq = (company as any)?.briefingFrequency ?? "weekly";
      const skippedExecs = executiveContext.filter(e => e.skipped).map(e => e.name);
      const skippedNote = skippedExecs.length > 0
        ? `Note: The following executives did not complete onboarding interviews and their specific context is unavailable: ${skippedExecs.join(", ")}. Make reasonable assumptions for their domains based on the company context.`
        : "All executives completed onboarding interviews.";

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: `You are Arch, the AI CEO of ${company?.name ?? "this company"} on the OpenCommand platform. You have completed onboarding interviews with your C-suite executives. Based on the collective intelligence gathered, produce a comprehensive formal strategy proposal.

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

      emitToUser(ctx.user.id, "task_completed", "Strategy Proposed", `Arch has proposed a formal strategy for ${company?.name}`, { companyId: input.companyId });
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
});

// ─── Waitlist Router ────────────────────────────────────────────────────────
const waitlistRouter = router({
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

// ─── Briefings Router ────────────────────────────────────────────────────────────────────────────────
const briefingsRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.companyId) return getBriefingLogsByCompanyId(input.companyId);
      return getBriefingLogsByUserId(ctx.user.id);
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
  waitlist: waitlistRouter,
  briefings: briefingsRouter,
  analytics: analyticsRouter,
  feedback: feedbackRouter,
  changelog: changelogRouter,
  tracking: trackingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
