import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  blueprintTemplates,
  blueprintAgents,
  blueprintWorkflows,
  blueprintGoals,
  blueprintChatSessions,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

async function getDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Ticker Generation ───────────────────────────────────────────────────────
function generateTicker(title: string): string {
  const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const base = words.slice(0, 3).map(w => w.substring(0, 4).toUpperCase()).join("-");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

// ─── Σ System Prompt ─────────────────────────────────────────────────────────
const SIGMA_SYSTEM_PROMPT = `You are Σ (Sigma), the Intent Engine for OpenCommand. Your role is to interview the user about their goal and produce a complete Blueprint — a structured, autonomous execution plan that can be deployed to AI agents.

## Your Behavior
- Ask focused, clarifying questions one at a time
- Never ask more than 2 questions per message
- After each answer, acknowledge what you learned and ask the next most important question
- When you have enough information to build the blueprint, say so and ask for confirmation
- Be concise, direct, and professional

## Information You Need to Populate a Blueprint
1. **Objective**: What is the desired outcome? What does "done" look like?
2. **Agents**: What roles/capabilities are needed? (e.g., researcher, writer, analyst, developer)
3. **Workflows**: What is the execution sequence? What depends on what?
4. **Tools**: What tools/integrations are needed? (e.g., web search, CRM, email, code execution)
5. **Guardrails**: What are the boundaries? What must NOT happen?
6. **Data**: What inputs/context does the system need access to?
7. **Success Metrics**: How will completion be verified?
8. **Constraints**: Budget, timeline, scope limits?

## Conversation Strategy
- Start by understanding the high-level objective
- Then drill into the execution specifics (who does what, in what order)
- Then clarify boundaries and verification
- Aim to complete the interview in 4-8 exchanges

## When Ready
When you have sufficient information, respond with a message that includes the marker [READY_TO_GENERATE] at the end. This signals the system to generate the full blueprint from the conversation context.

## Special User Signals
- If the user sends [SKIP_QUESTION]: acknowledge briefly (one sentence) and immediately ask a completely different clarifying question — do not repeat or follow up on the previous topic.
- If the user sends [FINISH_INTERVIEW]: respond with one sentence confirming you have enough context to build the blueprint, then end your message with [READY_TO_GENERATE].`;

// ─── Blueprint Generation Prompt ─────────────────────────────────────────────
function buildGenerationPrompt(messages: { role: string; content: string }[]) {
  const conversation = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role === "user" ? "User" : "Σ"}: ${m.content}`)
    .join("\n\n");

  return `Based on the following conversation between a user and Σ (the Intent Engine), generate a complete Blueprint.

## Conversation
${conversation}

## Output Format
Return a JSON object with this exact structure:
{
  "title": "Short descriptive title for the blueprint",
  "description": "2-3 sentence description of what this blueprint accomplishes",
  "category": "one of: growth|brand|retention|launch|performance|operations|engineering|sales|support|custom",
  "objective": "The primary objective statement",
  "desiredFinalState": "What done looks like",
  "constraints": ["constraint1", "constraint2"],
  "nonGoals": ["explicitly out of scope item"],
  "successMetrics": [{"metric": "name", "target": "measurable target", "verificationMethod": "how to verify"}],
  "estimatedRuntime": "e.g. 2-3 weeks",
  "agents": [
    {
      "id": "agent-1",
      "name": "Agent Name",
      "role": "What this agent does",
      "mission": "One-sentence mission",
      "autonomyLevel": "L0|L1|L2|L3",
      "tools": [{"name": "tool_name", "source": "integration", "permission": "read|write|execute"}],
      "guardrails": [{"severity": "standard|warning|hard_stop", "title": "Rule name", "description": "What the rule means"}],
      "allowedActions": ["action1"],
      "forbiddenActions": ["action1"],
      "confirmationTriggers": ["when to pause and ask"],
      "invariants": ["things that must never change"]
    }
  ],
  "workflows": [
    {
      "id": "workflow-1",
      "name": "Workflow name",
      "description": "What this workflow does",
      "sourceAgentId": "agent-1",
      "targetAgentId": "agent-2",
      "triggerCondition": "When this fires",
      "sequenceOrder": 1
    }
  ],
  "goals": [
    {
      "agentId": "agent-1",
      "agentRole": "Role name",
      "objective": "What this agent must achieve",
      "desiredFinalState": "Done state for this goal",
      "context": {
        "background": "Relevant background",
        "resources": ["resource1"],
        "assumptions": ["assumption1"],
        "nonGoals": ["not this"]
      },
      "scope": {
        "allowed": ["can do this"],
        "forbidden": ["cannot do this"],
        "confirmationRequired": ["ask before this"],
        "invariants": ["must preserve this"]
      },
      "verification": {
        "criteria": ["criterion 1", "criterion 2"],
        "commands": ["verification command"],
        "evidence": ["required evidence"],
        "artifacts": ["deliverable"]
      },
      "iterationPolicy": "Work in checkpoints. At each checkpoint: inspect, decide, execute, validate, record.",
      "escalation": {
        "retryLimit": 3,
        "pauseTriggers": ["ambiguous requirements", "missing access"],
        "maxIterations": 10
      },
      "outputRequirements": {
        "format": "markdown|json|code|report",
        "includes": ["summary", "evidence", "artifacts"],
        "style": "concise and actionable"
      },
      "stopCondition": ["All success criteria verified", "Escalation triggered"]
    }
  ]
}

Generate a comprehensive blueprint with 2-5 agents, appropriate workflows connecting them, and one /goal contract per agent. Make it production-ready and specific to the user's stated intent.`;
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const blueprintEngineRouter = router({
  /**
   * Start a new Σ chat session for blueprint generation
   */
  startSession: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const initialMessages = [
        {
          role: "system" as const,
          content: SIGMA_SYSTEM_PROMPT,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant" as const,
          content: "I'm Σ, your Intent Engine. I'll help you design a complete autonomous blueprint — an execution plan with agents, workflows, tools, and guardrails.\n\nWhat would you like to accomplish? Describe your goal and I'll ask the right questions to build your blueprint.",
          timestamp: new Date().toISOString(),
        },
      ];

      const [session] = await (await getDbOrThrow()).insert(blueprintChatSessions).values({
        userId: ctx.user.id,
        companyId: input.companyId || null,
        messages: initialMessages,
        populatedFields: {},
        inferredValues: {},
        confidenceScores: {},
        completionPercent: 0,
        status: "interviewing",
      }).$returningId();

      return {
        sessionId: session.id,
        messages: initialMessages.filter(m => m.role !== "system"),
      };
    }),

  /**
   * Send a message to Σ and get a response
   */
  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      message: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch current session
      const [session] = await (await getDbOrThrow())
        .select()
        .from(blueprintChatSessions)
        .where(and(
          eq(blueprintChatSessions.id, input.sessionId),
          eq(blueprintChatSessions.userId, ctx.user.id),
        ));

      if (!session) throw new Error("Session not found");
      if (session.status !== "interviewing") throw new Error("Session is no longer active");

      const messages = (session.messages || []) as { role: string; content: string; timestamp: string }[];

      // Add user message
      const userMsg = {
        role: "user" as const,
        content: input.message,
        timestamp: new Date().toISOString(),
      };
      messages.push(userMsg);

      // Call LLM for Σ response
      const llmMessages = messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const response = await invokeLLM({ messages: llmMessages, maxTokens: 1024 });
      const assistantContent = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "";

      const assistantMsg = {
        role: "assistant" as const,
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };
      messages.push(assistantMsg);

      // Check if Σ is ready to generate
      const isReady = assistantContent.includes("[READY_TO_GENERATE]");

      // Estimate completion based on exchange count
      const userMsgCount = messages.filter(m => m.role === "user").length;
      const completionPercent = Math.min(isReady ? 95 : userMsgCount * 15, 95);

      await (await getDbOrThrow())
        .update(blueprintChatSessions)
        .set({
          messages: messages as any,
          completionPercent,
          status: isReady ? "generating" : "interviewing",
        })
        .where(eq(blueprintChatSessions.id, input.sessionId));

      return {
        message: assistantMsg,
        isReadyToGenerate: isReady,
        completionPercent,
      };
    }),


  /**
   * Skip the current question and ask a different one
   */
  skipQuestion: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await (await getDbOrThrow())
        .select()
        .from(blueprintChatSessions)
        .where(and(
          eq(blueprintChatSessions.id, input.sessionId),
          eq(blueprintChatSessions.userId, ctx.user.id),
        ));

      if (!session) throw new Error("Session not found");
      if (session.status !== "interviewing") throw new Error("Session is no longer active");

      const messages = (session.messages || []) as { role: string; content: string; timestamp: string }[];

      const skipMsg = { role: "user" as const, content: "[SKIP_QUESTION]", timestamp: new Date().toISOString() };
      messages.push(skipMsg);

      const llmMessages = messages.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));
      const response = await invokeLLM({ messages: llmMessages, maxTokens: 512 });
      const assistantContent = typeof response.choices[0].message.content === "string" ? response.choices[0].message.content : "";

      const assistantMsg = { role: "assistant" as const, content: assistantContent, timestamp: new Date().toISOString() };
      messages.push(assistantMsg);

      const userMsgCount = messages.filter(m => m.role === "user" && m.content !== "[SKIP_QUESTION]").length;
      const completionPercent = Math.min(userMsgCount * 15, 90);

      await (await getDbOrThrow())
        .update(blueprintChatSessions)
        .set({ messages: messages as any, completionPercent })
        .where(eq(blueprintChatSessions.id, input.sessionId));

      return { message: assistantMsg, completionPercent, isReadyToGenerate: false };
    }),

  /**
   * Finish the interview early and trigger blueprint generation immediately
   */
  finishInterview: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await (await getDbOrThrow())
        .select()
        .from(blueprintChatSessions)
        .where(and(
          eq(blueprintChatSessions.id, input.sessionId),
          eq(blueprintChatSessions.userId, ctx.user.id),
        ));

      if (!session) throw new Error("Session not found");
      if (session.status !== "interviewing") throw new Error("Session is no longer active");

      const messages = (session.messages || []) as { role: string; content: string; timestamp: string }[];

      const finishMsg = { role: "user" as const, content: "[FINISH_INTERVIEW]", timestamp: new Date().toISOString() };
      messages.push(finishMsg);

      const llmMessages = messages.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));
      const response = await invokeLLM({ messages: llmMessages, maxTokens: 512 });
      const assistantContent = typeof response.choices[0].message.content === "string" ? response.choices[0].message.content : "";

      const assistantMsg = { role: "assistant" as const, content: assistantContent, timestamp: new Date().toISOString() };
      messages.push(assistantMsg);

      await (await getDbOrThrow())
        .update(blueprintChatSessions)
        .set({ messages: messages as any, completionPercent: 95, status: "generating" })
        .where(eq(blueprintChatSessions.id, input.sessionId));

      return { message: assistantMsg, completionPercent: 95, isReadyToGenerate: true };
    }),

  /**
   * Generate the blueprint from the completed Σ conversation
   */
  generateBlueprint: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await (await getDbOrThrow())
        .select()
        .from(blueprintChatSessions)
        .where(and(
          eq(blueprintChatSessions.id, input.sessionId),
          eq(blueprintChatSessions.userId, ctx.user.id),
        ));

      if (!session) throw new Error("Session not found");

      const messages = (session.messages || []) as { role: string; content: string }[];

      // Generate blueprint via LLM
      const generationPrompt = buildGenerationPrompt(messages);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a blueprint architect. Generate structured JSON blueprints from conversation context. Return ONLY valid JSON, no markdown fences." },
          { role: "user", content: generationPrompt },
        ],
        maxTokens: 4096,
        response_format: { type: "json_object" },
      });

      const rawContent = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "";

      let blueprint: any;
      try {
        blueprint = JSON.parse(rawContent);
      } catch {
        throw new Error("Failed to parse blueprint generation response");
      }

      // Generate ticker
      const ticker = generateTicker(blueprint.title || "BLUEPRINT");

      // Build React Flow nodes from agents
      const nodes = (blueprint.agents || []).map((agent: any, i: number) => ({
        id: agent.id || `agent-${i + 1}`,
        type: "agent",
        position: { x: 250 * i, y: 100 + (i % 2) * 150 },
        data: {
          name: agent.name,
          role: agent.role,
          mission: agent.mission,
          autonomyLevel: agent.autonomyLevel || "L1",
        },
      }));

      // Build React Flow edges from workflows
      const edges = (blueprint.workflows || []).map((wf: any, i: number) => ({
        id: wf.id || `edge-${i + 1}`,
        source: wf.sourceAgentId,
        target: wf.targetAgentId,
        type: "smoothstep",
        label: wf.name,
        data: { triggerCondition: wf.triggerCondition },
      }));

      // Insert blueprint template
      const [inserted] = await (await getDbOrThrow()).insert(blueprintTemplates).values({
        userId: ctx.user.id,
        companyId: session.companyId,
        ticker,
        title: blueprint.title || "Untitled Blueprint",
        description: blueprint.description || "",
        category: blueprint.category || "custom",
        objective: blueprint.objective || "",
        desiredFinalState: blueprint.desiredFinalState || "",
        constraints: blueprint.constraints || [],
        nonGoals: blueprint.nonGoals || [],
        successMetrics: blueprint.successMetrics || [],
        estimatedRuntime: blueprint.estimatedRuntime || "",
        nodes,
        edges,
        status: "draft",
      }).$returningId();

      const blueprintId = inserted.id;

      // Insert agents
      for (const agent of blueprint.agents || []) {
        await (await getDbOrThrow()).insert(blueprintAgents).values({
          blueprintId,
          nodeId: agent.id,
          name: agent.name,
          role: agent.role,
          mission: agent.mission || "",
          autonomyLevel: agent.autonomyLevel || "L1",
          tools: agent.tools || [],
          guardrails: agent.guardrails || [],
          allowedActions: agent.allowedActions || [],
          forbiddenActions: agent.forbiddenActions || [],
          confirmationTriggers: agent.confirmationTriggers || [],
          invariants: agent.invariants || [],
        });
      }

      // Insert workflows
      for (const wf of blueprint.workflows || []) {
        await (await getDbOrThrow()).insert(blueprintWorkflows).values({
          blueprintId,
          edgeId: wf.id,
          name: wf.name,
          description: wf.description || "",
          triggerCondition: wf.triggerCondition || "",
          sequenceOrder: wf.sequenceOrder || 0,
        });
      }

      // Insert goals
      for (const goal of blueprint.goals || []) {
        await (await getDbOrThrow()).insert(blueprintGoals).values({
          blueprintId,
          agentNodeId: goal.agentId,
          agentRole: goal.agentRole,
          objective: goal.objective,
          desiredFinalState: goal.desiredFinalState || "",
          context: goal.context || { background: "", resources: [], assumptions: [], nonGoals: [] },
          scope: goal.scope || { allowed: [], forbidden: [], confirmationRequired: [], invariants: [] },
          verification: goal.verification || { criteria: [], commands: [], evidence: [], artifacts: [] },
          iterationPolicy: goal.iterationPolicy || "",
          escalation: goal.escalation || { retryLimit: 3, pauseTriggers: [], maxIterations: 10 },
          outputRequirements: goal.outputRequirements || { format: "markdown", includes: [], style: "" },
          stopCondition: goal.stopCondition || [],
          status: "draft",
        });
      }

      // Update session with blueprint reference
      await (await getDbOrThrow())
        .update(blueprintChatSessions)
        .set({ blueprintId, status: "complete" })
        .where(eq(blueprintChatSessions.id, input.sessionId));

      return {
        blueprintId,
        ticker,
        title: blueprint.title,
        description: blueprint.description,
        nodes,
        edges,
        agentCount: (blueprint.agents || []).length,
        goalCount: (blueprint.goals || []).length,
      };
    }),

  /**
   * Get a blueprint by ID (full data for the canvas)
   */
  getBlueprint: protectedProcedure
    .input(z.object({ blueprintId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [template] = await (await getDbOrThrow())
        .select()
        .from(blueprintTemplates)
        .where(and(
          eq(blueprintTemplates.id, input.blueprintId),
          eq(blueprintTemplates.userId, ctx.user.id),
        ));

      if (!template) throw new Error("Blueprint not found");

      const agents = await (await getDbOrThrow())
        .select()
        .from(blueprintAgents)
        .where(eq(blueprintAgents.blueprintId, input.blueprintId));

      const workflows = await (await getDbOrThrow())
        .select()
        .from(blueprintWorkflows)
        .where(eq(blueprintWorkflows.blueprintId, input.blueprintId));

      const goals = await (await getDbOrThrow())
        .select()
        .from(blueprintGoals)
        .where(eq(blueprintGoals.blueprintId, input.blueprintId));

      return { template, agents, workflows, goals };
    }),

  /**
   * Update blueprint nodes/edges (from canvas edits)
   */
  updateGraph: protectedProcedure
    .input(z.object({
      blueprintId: z.number(),
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      await (await getDbOrThrow())
        .update(blueprintTemplates)
        .set({ nodes: input.nodes, edges: input.edges })
        .where(and(
          eq(blueprintTemplates.id, input.blueprintId),
          eq(blueprintTemplates.userId, ctx.user.id),
        ));
      return { success: true };
    }),

  /**
   * Update a specific agent's properties
   */
  updateAgent: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      data: z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        mission: z.string().optional(),
        autonomyLevel: z.enum(["L0", "L1", "L2", "L3"]).optional(),
        tools: z.array(z.any()).optional(),
        guardrails: z.array(z.any()).optional(),
        allowedActions: z.array(z.string()).optional(),
        forbiddenActions: z.array(z.string()).optional(),
        confirmationTriggers: z.array(z.string()).optional(),
        invariants: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await (await getDbOrThrow())
        .update(blueprintAgents)
        .set(input.data)
        .where(eq(blueprintAgents.id, input.agentId));
      return { success: true };
    }),

  /**
   * List user's blueprints (My Blueprints dashboard)
   */
  listMyBlueprints: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(blueprintTemplates.userId, ctx.user.id)];
      if (input?.companyId) {
        conditions.push(eq(blueprintTemplates.companyId, input.companyId));
      }

      const results = await (await getDbOrThrow())
        .select({
          id: blueprintTemplates.id,
          ticker: blueprintTemplates.ticker,
          title: blueprintTemplates.title,
          description: blueprintTemplates.description,
          category: blueprintTemplates.category,
          status: blueprintTemplates.status,
          visibility: blueprintTemplates.visibility,
          createdAt: blueprintTemplates.createdAt,
          updatedAt: blueprintTemplates.updatedAt,
        })
        .from(blueprintTemplates)
        .where(and(...conditions))
        .orderBy(desc(blueprintTemplates.updatedAt));

      return results;
    }),

  /**
   * Get a blueprint by ticker
   */
  getByTicker: protectedProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ ctx, input }) => {
      const [template] = await (await getDbOrThrow())
        .select()
        .from(blueprintTemplates)
        .where(eq(blueprintTemplates.ticker, input.ticker));

      if (!template) throw new Error("Blueprint not found");
      // Only allow access if owner or marketplace-visible
      if (template.userId !== ctx.user.id && template.visibility === "private") {
        throw new Error("Access denied");
      }

      const agents = await (await getDbOrThrow())
        .select()
        .from(blueprintAgents)
        .where(eq(blueprintAgents.blueprintId, template.id));

      const goals = await (await getDbOrThrow())
        .select()
        .from(blueprintGoals)
        .where(eq(blueprintGoals.blueprintId, template.id));

      return { template, agents, goals };
    }),

  /**
   * Get active chat sessions for the user
   */
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await (await getDbOrThrow())
      .select({
        id: blueprintChatSessions.id,
        status: blueprintChatSessions.status,
        completionPercent: blueprintChatSessions.completionPercent,
        blueprintId: blueprintChatSessions.blueprintId,
        createdAt: blueprintChatSessions.createdAt,
        updatedAt: blueprintChatSessions.updatedAt,
      })
      .from(blueprintChatSessions)
      .where(eq(blueprintChatSessions.userId, ctx.user.id))
      .orderBy(desc(blueprintChatSessions.createdAt))
      .limit(10);

    return sessions;
  }),

  /**
   * Get a specific chat session's messages
   */
  getSessionMessages: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [session] = await (await getDbOrThrow())
        .select()
        .from(blueprintChatSessions)
        .where(and(
          eq(blueprintChatSessions.id, input.sessionId),
          eq(blueprintChatSessions.userId, ctx.user.id),
        ));

      if (!session) throw new Error("Session not found");

      return {
        messages: ((session.messages || []) as any[]).filter((m: any) => m.role !== "system"),
        status: session.status,
        completionPercent: session.completionPercent,
        blueprintId: session.blueprintId,
      };
    }),

  /**
   * Create a blank blueprint (scratch visual builder)
   */
  createBlank: protectedProcedure
    .input(z.object({
      title: z.string().default("Untitled Blueprint"),
    }))
    .mutation(async ({ ctx, input }) => {
      const ticker = generateTicker(input.title);
      const [inserted] = await (await getDbOrThrow()).insert(blueprintTemplates).values({
        userId: ctx.user.id,
        ticker,
        title: input.title,
        description: "",
        category: "custom",
        objective: "",
        desiredFinalState: "",
        constraints: [],
        nonGoals: [],
        successMetrics: [],
        estimatedRuntime: "",
        nodes: [],
        edges: [],
        status: "draft",
      }).$returningId();
      return { blueprintId: inserted.id, ticker, title: input.title };
    }),

  /**
   * Transcribe voice audio to text using Whisper
   */
  transcribeVoice: protectedProcedure
    .input(z.object({ audioUrl: z.string(), language: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language ?? "en",
        prompt: "Transcribe user intent for an AI agent blueprint builder",
      });
      const text = "text" in result ? result.text : "";
      return { text };
    }),

  /**
   * Delete a blueprint
   */
  deleteBlueprint: protectedProcedure
    .input(z.object({ blueprintId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete child records first
      await (await getDbOrThrow()).delete(blueprintGoals).where(eq(blueprintGoals.blueprintId, input.blueprintId));
      await (await getDbOrThrow()).delete(blueprintWorkflows).where(eq(blueprintWorkflows.blueprintId, input.blueprintId));
      await (await getDbOrThrow()).delete(blueprintAgents).where(eq(blueprintAgents.blueprintId, input.blueprintId));
      await (await getDbOrThrow()).delete(blueprintTemplates).where(and(
        eq(blueprintTemplates.id, input.blueprintId),
        eq(blueprintTemplates.userId, ctx.user.id),
      ));
      return { success: true };
    }),
});

export default blueprintEngineRouter;
