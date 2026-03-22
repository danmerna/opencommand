import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import {
  getAgentsByUserId, getAgentsByCompanyId, getAgentById, createAgent, updateAgentStatus, updateAgent, deleteAgent,
  getOkrsByUserId, getOkrsByCompanyId, createOkr, updateOkrProgress, deleteOkr,
  getTasksByUserId, getTasksByCompanyId, getTaskById, createTask, updateTask,
  getPooReceiptsByUserId, createPooReceipt, getPooSummaryByUserId,
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
} from "./db";
import { nanoid } from "nanoid";
import { PRODUCTS, type ProductKey } from "./stripe/products";

// ─── Companies Router ────────────────────────────────────────────────────────
const companiesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCompaniesByUserId(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCompanyById(input.id)),
  pnl: protectedProcedure.input(z.object({ companyId: z.number() })).query(({ input }) => getCompanyPnL(input.companyId)),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), mission: z.string().optional(), industry: z.string().optional(), monthlyBudget: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await createCompany({ userId: ctx.user.id, name: input.name, mission: input.mission, industry: input.industry, monthlyBudget: input.monthlyBudget ? String(input.monthlyBudget) : "0" });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), mission: z.string().optional(), industry: z.string().optional(), status: z.enum(["active", "paused", "archived"]).optional(), monthlyBudget: z.number().optional() }))
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.mission !== undefined) data.mission = input.mission;
      if (input.industry !== undefined) data.industry = input.industry;
      if (input.status) data.status = input.status;
      if (input.monthlyBudget !== undefined) data.monthlyBudget = String(input.monthlyBudget);
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
    .mutation(async ({ input }) => { await updateAgentStatus(input.id, input.status); return { success: true }; }),

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
      return { success: true, tasksChecked: pendingTasks.length, tasksActedOn, duration };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getAgentsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "Agents already exist" };
    const comps = await getCompaniesByUserId(ctx.user.id);
    const companyId = comps[0]?.id ?? null;
    const defaults = [
      { name: "ARIA — AI CEO", type: "ceo" as const, roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"] },
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
    .mutation(async ({ input }) => { await updateOkrProgress(input.id, String(input.currentValue), input.status); return { success: true }; }),

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
      return { success: true, receiptNumber, outcome: result.outcome, laborHoursSaved: result.laborHoursSaved, dollarValueCreated: result.dollarValueCreated, costIncurred: result.costIncurred };
    }),
});

// ─── PoO Receipts Router ─────────────────────────────────────────────────────
const pooRouter = router({
  list: protectedProcedure.query(({ ctx }) => getPooReceiptsByUserId(ctx.user.id)),
  summary: protectedProcedure.query(({ ctx }) => getPooSummaryByUserId(ctx.user.id)),
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
    await createAgent({ userId: ctx.user.id, name: "ARIA — AI CEO (Marketplace)", type: "ceo", status: "idle", description: "Flagship AI CEO agent", isMarketplaceListing: true } as any);
    const agentsData = await getAgentsByUserId(ctx.user.id);
    const ceoAgent = agentsData.find(a => a.type === "ceo" && a.isMarketplaceListing);
    const agentId = ceoAgent?.id ?? 1;
    const listings = [
      { agentId, listingType: "agent" as const, tier: "solo_founder" as const, name: "ARIA Solo-Founder CEO", tagline: "Your first autonomous executive hire.", description: "ARIA orchestrates up to 3 subordinate agents, tracks your OKRs in real-time, and generates Proof of Outcome receipts for every task completed.", price: "199.00", pricingModel: "monthly" as const, features: JSON.stringify(["OKR Dashboard", "3 Subordinate Agents", "PoO Receipt Generation", "Human-in-the-Loop Inbox", "Socratic Intent Engine"]), endorsedBy: "Alex Chen", endorserHandle: "@alexbuilds", endorserNiche: "Indie Hacking", totalPurchases: 247, avgRating: "4.80" },
      { agentId, listingType: "agent" as const, tier: "enterprise" as const, name: "ARIA Enterprise CEO", tagline: "Full Agentic Operating Model for scaling teams.", description: "Unlimited subordinate agent orchestration, custom API integrations, advanced PoO analytics with ROI tracking, and a 5% value capture model.", price: null, pricingModel: "value_capture" as const, features: JSON.stringify(["Unlimited Agents", "Custom API Integrations", "Advanced PoO Analytics", "5% Value Capture Model", "White-label Mission Control"]), endorsedBy: "Sarah Martinez", endorserHandle: "@sarahscales", endorserNiche: "Agency Growth", totalPurchases: 43, avgRating: "4.95" },
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
          { role: "system" as const, content: "You are ARIA, the OpenCommand AI CEO. Analyze the user's goal in context of their current OKRs and agent fleet, then produce a strategic action plan. Be specific, actionable, and assign tasks to appropriate agents. Respond in 3-5 sentences followed by a numbered action list." },
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
});

export type AppRouter = typeof appRouter;
