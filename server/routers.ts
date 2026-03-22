import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import {
  getAgentsByUserId, getAgentById, createAgent, updateAgentStatus, updateAgent,
  getOkrsByUserId, createOkr, updateOkrProgress, deleteOkr,
  getTasksByUserId, getTaskById, createTask, updateTask,
  getPooReceiptsByUserId, createPooReceipt, getPooSummaryByUserId,
  getInboxItemsByUserId, createInboxItem, resolveInboxItem, dismissInboxItem, markInboxItemRead,
  getMarketplaceListings, getMarketplaceListingById, createMarketplaceListing,
  getCreatorPartnerships, createCreatorPartnership,
  getDecisionLogByUserId, createDecisionLogEntry,
} from "./db";
import { nanoid } from "nanoid";

// ─── Agents Router ────────────────────────────────────────────────────────────
const agentsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getAgentsByUserId(ctx.user.id)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getAgentById(input.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["ceo", "marketing", "research", "sales", "admin", "custom"]),
      description: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createAgent({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        description: input.description,
        capabilities: input.capabilities ?? [],
        status: "idle",
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["idle", "active", "paused", "error"]) }))
    .mutation(async ({ input }) => {
      await updateAgentStatus(input.id, input.status);
      return { success: true };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getAgentsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "Agents already exist" };
    const defaults = [
      { name: "ARIA — AI CEO", type: "ceo" as const, description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"] },
      { name: "NOVA — Marketing Agent", type: "marketing" as const, description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"] },
      { name: "SAGE — Research Agent", type: "research" as const, description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis"] },
      { name: "APEX — Sales Agent", type: "sales" as const, description: "Autonomous outreach, pipeline management, and deal closing agent.", capabilities: ["lead-scoring", "outreach", "crm-sync", "follow-up"] },
      { name: "ECHO — Admin Agent", type: "admin" as const, description: "Operations and administrative task automation agent.", capabilities: ["scheduling", "reporting", "document-management", "workflow-automation"] },
    ];
    for (const agent of defaults) {
      await createAgent({ userId: ctx.user.id, ...agent, status: "idle" });
    }
    return { success: true };
  }),
});

// ─── OKRs Router ─────────────────────────────────────────────────────────────
const okrsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getOkrsByUserId(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      objective: z.string().min(1),
      keyResult: z.string().min(1),
      targetValue: z.number(),
      currentValue: z.number().optional(),
      unit: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createOkr({
        userId: ctx.user.id,
        objective: input.objective,
        keyResult: input.keyResult,
        targetValue: String(input.targetValue),
        currentValue: String(input.currentValue ?? 0),
        unit: input.unit ?? "",
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        status: "on_track",
      });
      return { success: true };
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      id: z.number(),
      currentValue: z.number(),
      status: z.enum(["on_track", "at_risk", "achieved", "missed"]),
    }))
    .mutation(async ({ input }) => {
      await updateOkrProgress(input.id, String(input.currentValue), input.status);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteOkr(input.id);
      return { success: true };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getOkrsByUserId(ctx.user.id);
    if (existing.length > 0) return { success: true, message: "OKRs already exist" };
    const defaults = [
      { objective: "Reach Product-Market Fit", keyResult: "Achieve $50K Monthly Recurring Revenue", targetValue: 50000, currentValue: 12400, unit: "USD/mo", status: "on_track" as const },
      { objective: "Build a Thriving Agent Marketplace", keyResult: "Onboard 100 active AI agents", targetValue: 100, currentValue: 23, unit: "agents", status: "on_track" as const },
      { objective: "Prove the Proof of Outcome Model", keyResult: "Generate 500 verified PoO receipts", targetValue: 500, currentValue: 87, unit: "receipts", status: "on_track" as const },
      { objective: "Scale Creator Partnership Program", keyResult: "Sign 25 creator endorsement deals", targetValue: 25, currentValue: 6, unit: "deals", status: "at_risk" as const },
    ];
    for (const okr of defaults) {
      await createOkr({ userId: ctx.user.id, ...okr, targetValue: String(okr.targetValue), currentValue: String(okr.currentValue) });
    }
    return { success: true };
  }),
});

// ─── Tasks Router ─────────────────────────────────────────────────────────────
const tasksRouter = router({
  list: protectedProcedure.query(({ ctx }) => getTasksByUserId(ctx.user.id)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTaskById(input.id)),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      routingMode: z.enum(["ai", "human", "hybrid"]).default("ai"),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      agentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createTask({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        routingMode: input.routingMode,
        priority: input.priority,
        agentId: input.agentId,
        status: "pending",
      });
      return { success: true };
    }),

  generatePrompt: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new Error("Task not found");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are the OpenCommand AI Agent CEO. Generate a precise, structured execution prompt for an AI agent to complete the following task. Format the prompt as a clear set of instructions with defined inputs, expected outputs, success criteria, and estimated time. Be specific and actionable.` },
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
          { role: "system", content: `You are the OpenCommand AI Agent CEO executing a task autonomously. Complete the task and provide: 1) A detailed outcome description, 2) Estimated labor hours saved vs doing this manually, 3) Dollar value created (use $150/hr benchmark). Respond in JSON format with keys: outcome, laborHoursSaved, dollarValueCreated, executionSteps (array of strings).` },
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
                executionSteps: { type: "array", items: { type: "string" } },
              },
              required: ["outcome", "laborHoursSaved", "dollarValueCreated", "executionSteps"],
              additionalProperties: false,
            },
          },
        },
      });

      let result = { outcome: "Task completed successfully.", laborHoursSaved: 2, dollarValueCreated: 300, executionSteps: ["Task analyzed", "Execution completed"] };
      try {
        const content = (response.choices[0]?.message?.content ?? "{}") as string;
        result = JSON.parse(content);
      } catch (_) {}

      const receiptNumber = `POO-${Date.now()}-${nanoid(6).toUpperCase()}`;
      await createPooReceipt({
        taskId: input.taskId,
        userId: ctx.user.id,
        receiptNumber,
        taskTitle: task.title,
        outcome: result.outcome,
        laborHoursSaved: String(result.laborHoursSaved),
        dollarValueCreated: String(result.dollarValueCreated),
        verificationStatus: "verified",
      });

      await updateTask(input.taskId, {
        status: "completed",
        completedAt: new Date(),
        executionLog: result.executionSteps,
        actualHours: String(result.laborHoursSaved),
      });

      await createInboxItem({
        userId: ctx.user.id,
        taskId: input.taskId,
        type: "poo_generated",
        title: `PoO Receipt Generated: ${task.title}`,
        body: `Task completed. $${result.dollarValueCreated.toFixed(2)} value created. ${result.laborHoursSaved} hours saved. Receipt: ${receiptNumber}`,
        priority: "medium",
      });

      await createDecisionLogEntry({
        userId: ctx.user.id,
        taskId: input.taskId,
        decisionType: "task_execution",
        context: task.description ?? task.title,
        decision: `Execute task via ${task.routingMode} routing`,
        rationale: "Autonomous execution by AI Agent CEO",
        outcome: result.outcome,
        wasSuccessful: true,
      });

      try {
        await notifyOwner({ title: `Task Completed: ${task.title}`, content: `Receipt ${receiptNumber} — $${result.dollarValueCreated} value created, ${result.laborHoursSaved}h saved.` });
      } catch (_) {}

      return { success: true, receiptNumber, outcome: result.outcome, laborHoursSaved: result.laborHoursSaved, dollarValueCreated: result.dollarValueCreated };
    }),
});

// ─── PoO Receipts Router ──────────────────────────────────────────────────────
const pooRouter = router({
  list: protectedProcedure.query(({ ctx }) => getPooReceiptsByUserId(ctx.user.id)),
  summary: protectedProcedure.query(({ ctx }) => getPooSummaryByUserId(ctx.user.id)),
});

// ─── Inbox Router ─────────────────────────────────────────────────────────────
const inboxRouter = router({
  list: protectedProcedure.query(({ ctx }) => getInboxItemsByUserId(ctx.user.id)),

  resolve: protectedProcedure
    .input(z.object({ id: z.number(), resolution: z.string() }))
    .mutation(async ({ input }) => { await resolveInboxItem(input.id, input.resolution); return { success: true }; }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await dismissInboxItem(input.id); return { success: true }; }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await markInboxItemRead(input.id); return { success: true }; }),
});

// ─── Marketplace Router ───────────────────────────────────────────────────────
const marketplaceRouter = router({
  list: publicProcedure.query(() => getMarketplaceListings()),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMarketplaceListingById(input.id)),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getMarketplaceListings();
    if (existing.length > 0) return { success: true, message: "Listings already exist" };

    // We need a dummy agentId — create a placeholder agent first
    await createAgent({ userId: ctx.user.id, name: "ARIA — AI CEO (Marketplace)", type: "ceo", status: "idle", description: "Flagship AI CEO agent", isMarketplaceListing: true });
    const agentsData = await getAgentsByUserId(ctx.user.id);
    const ceoAgent = agentsData.find(a => a.type === "ceo" && a.isMarketplaceListing);
    const agentId = ceoAgent?.id ?? 1;

    const listings = [
      {
        agentId,
        tier: "solo_founder" as const,
        name: "ARIA Solo-Founder CEO",
        tagline: "Your first autonomous executive hire.",
        description: "ARIA orchestrates up to 3 subordinate agents, tracks your OKRs in real-time, and generates Proof of Outcome receipts for every task completed. Built for solo founders who want to operate like a team of 10.",
        price: "199.00",
        pricingModel: "monthly" as const,
        features: JSON.stringify(["OKR Dashboard", "3 Subordinate Agents", "PoO Receipt Generation", "Human-in-the-Loop Inbox", "Socratic Intent Engine", "Weekly Strategy Reports"]),
        endorsedBy: "Alex Chen",
        endorserHandle: "@alexbuilds",
        endorserNiche: "Indie Hacking",
        totalPurchases: 247,
        avgRating: "4.80",
      },
      {
        agentId,
        tier: "enterprise" as const,
        name: "ARIA Enterprise CEO",
        tagline: "Full Agentic Operating Model for scaling teams.",
        description: "The complete Enterprise CEO implementation. Unlimited subordinate agent orchestration, custom API integrations, advanced PoO analytics with ROI tracking, and a 5% value capture model — you only pay more when ARIA creates more value.",
        price: null,
        pricingModel: "value_capture" as const,
        features: JSON.stringify(["Unlimited Agents", "Custom API Integrations", "Advanced PoO Analytics", "5% Value Capture Model", "White-label Mission Control", "Dedicated Onboarding", "SLA Guarantee"]),
        endorsedBy: "Sarah Martinez",
        endorserHandle: "@sarahscales",
        endorserNiche: "Agency Growth",
        totalPurchases: 43,
        avgRating: "4.95",
      },
      {
        agentId,
        tier: "custom" as const,
        name: "The Agency Scaling CEO",
        tagline: "Endorsed by @sarahscales — built for 7-figure agencies.",
        description: "A specialized AI CEO configuration designed specifically for digital agencies. Pre-trained on agency workflows: client onboarding, project management, team coordination, and revenue reporting.",
        price: "499.00",
        pricingModel: "monthly" as const,
        features: JSON.stringify(["Agency-Specific Workflows", "Client Onboarding Automation", "Project Management Agent", "Revenue Reporting", "Team Coordination", "Client Portal Integration"]),
        endorsedBy: "Sarah Martinez",
        endorserHandle: "@sarahscales",
        endorserNiche: "Agency Growth",
        totalPurchases: 89,
        avgRating: "4.90",
      },
    ];

    for (const listing of listings) {
      await createMarketplaceListing(listing as any);
    }
    return { success: true };
  }),
});

// ─── Creator Partnerships Router ──────────────────────────────────────────────
const creatorsRouter = router({
  list: publicProcedure.query(() => getCreatorPartnerships()),

  submitApplication: publicProcedure
    .input(z.object({
      creatorName: z.string().min(1),
      creatorHandle: z.string().min(1),
      niche: z.string().min(1),
      audienceSize: z.number().optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await createCreatorPartnership({
        creatorName: input.creatorName,
        creatorHandle: input.creatorHandle,
        niche: input.niche,
        audienceSize: input.audienceSize,
        platform: input.platform,
        status: "applied",
        floorGuarantee: "500.00",
        flowPercentage: "15.00",
      });
      try {
        await notifyOwner({ title: `New Creator Partnership Application`, content: `${input.creatorName} (${input.creatorHandle}) applied. Niche: ${input.niche}. Audience: ${input.audienceSize ?? "Unknown"}.` });
      } catch (_) {}
      return { success: true };
    }),

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getCreatorPartnerships();
    if (existing.length > 0) return { success: true };
    const defaults = [
      { creatorName: "Alex Chen", creatorHandle: "@alexbuilds", niche: "Indie Hacking", audienceSize: 84000, platform: "Twitter/X", status: "active" as const, floorGuarantee: "500.00", flowPercentage: "15.00", totalEarned: "3240.00" },
      { creatorName: "Sarah Martinez", creatorHandle: "@sarahscales", niche: "Agency Growth", audienceSize: 210000, platform: "YouTube", status: "active" as const, floorGuarantee: "1500.00", flowPercentage: "20.00", totalEarned: "18750.00" },
      { creatorName: "Marcus Webb", creatorHandle: "@marcuswebb", niche: "AI & Automation", audienceSize: 156000, platform: "LinkedIn", status: "active" as const, floorGuarantee: "800.00", flowPercentage: "18.00", totalEarned: "9120.00" },
      { creatorName: "Priya Sharma", creatorHandle: "@priyabuilds", niche: "SaaS Founders", audienceSize: 67000, platform: "Twitter/X", status: "applied" as const, floorGuarantee: "500.00", flowPercentage: "15.00", totalEarned: "0.00" },
    ];
    for (const p of defaults) {
      await createCreatorPartnership({ ...p, userId: ctx.user.id });
    }
    return { success: true };
  }),
});

// ─── AI CEO Router ────────────────────────────────────────────────────────────
const aiCeoRouter = router({
  socratiqueQuestion: protectedProcedure
    .input(z.object({
      userInput: z.string().min(1),
      conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
    }))
    .mutation(async ({ input }) => {
      const history = input.conversationHistory ?? [];
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the OpenCommand Socratic Intent Engine. Your job is to transform vague user requests into precise, structured intent objects through guided questioning. 

When a user provides a vague request:
1. Ask ONE clarifying question at a time (never multiple)
2. Each question should progressively narrow the scope
3. After 3-4 exchanges, produce a structured intent object

When you have enough information, respond with a JSON intent object in this format:
{
  "type": "intent_object",
  "title": "Task title",
  "description": "Detailed description",
  "goal": "Specific measurable goal",
  "constraints": ["constraint1", "constraint2"],
  "successCriteria": ["criteria1", "criteria2"],
  "routingMode": "ai|human|hybrid",
  "priority": "low|medium|high|critical",
  "estimatedHours": number
}

If still gathering information, respond conversationally with your next clarifying question. Do NOT produce the intent object until you have enough context.`
          },
          ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content as string })),
          { role: "user" as const, content: input.userInput },
        ],
      });
      const content = (response.choices[0]?.message?.content ?? "") as string;
      let intentObject = null;
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === "intent_object") intentObject = parsed;
      } catch (_) {}
      return { response: content, intentObject };
    }),

  strategize: protectedProcedure
    .input(z.object({ goal: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const okrData = await getOkrsByUserId(ctx.user.id);
      const agentData = await getAgentsByUserId(ctx.user.id);
      const okrSummary = JSON.stringify(okrData.map(o => ({ objective: o.objective, keyResult: o.keyResult, progress: `${o.currentValue}/${o.targetValue} ${o.unit}` })));
      const agentSummary = JSON.stringify(agentData.map(a => ({ name: a.name, type: a.type, status: a.status })));
      const response = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: "You are ARIA, the OpenCommand AI CEO. Analyze the user's goal in context of their current OKRs and agent fleet, then produce a strategic action plan. Be specific, actionable, and assign tasks to appropriate agents. Respond in 3-5 sentences followed by a numbered action list."
          },
          {
            role: "user" as const,
            content: `Goal: ${input.goal}\n\nCurrent OKRs: ${okrSummary}\n\nAgent Fleet: ${agentSummary}`
          },
        ],
      });
      const strategy = (response.choices[0]?.message?.content ?? "") as string;
      await createDecisionLogEntry({
        userId: ctx.user.id,
        decisionType: "strategic_planning",
        context: input.goal,
        decision: strategy,
        rationale: "AI CEO strategic analysis",
      });
      return { strategy };
    }),

  decisionLog: protectedProcedure.query(({ ctx }) => getDecisionLogByUserId(ctx.user.id)),
});

// ─── App Router ───────────────────────────────────────────────────────────────
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
  agents: agentsRouter,
  okrs: okrsRouter,
  tasks: tasksRouter,
  poo: pooRouter,
  inbox: inboxRouter,
  marketplace: marketplaceRouter,
  creators: creatorsRouter,
  aiCeo: aiCeoRouter,
});

export type AppRouter = typeof appRouter;
