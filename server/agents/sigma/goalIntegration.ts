import { invokeLLM } from "../../_core/llm";
import { createGoal, listGoals, updateGoal, assignAgentToGoal, updateAgentProgress, recordAgentCollaboration, getGoal } from "../goals/goalsService";
import { listAgents } from "../registry";

/**
 * Σ Chat Goal Integration
 * Handles natural language goal creation, updates, and collaboration through Σ Chat
 */

export interface GoalChatContext {
  userId: number;
  companyId: number;
  workspaceId: string;
}

export interface GoalChatResponse {
  response: string;
  action: "goal_created" | "goal_updated" | "goal_listed" | "agent_assigned" | "progress_updated" | "collaboration_sent" | "goal_info" | "help";
  data?: any;
}

/**
 * Detect if a message is goal-related
 */
export function detectGoalIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const goalKeywords = [
    "@create-goal", "create goal", "new goal", "set goal", "add goal",
    "goal status", "goal progress", "update goal", "show goals", "list goals",
    "assign agent", "assign to goal", "assign lead", "assign executive", "assign intent", "goal collaboration",
    "complete goal", "cancel goal", "pause goal",
    "workplace goal", "team goal", "agent goal",
    "multi-agent goal", "workspace goal",
  ];
  return goalKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Process a goal-related message through Σ Chat
 */
export async function processGoalRequest(
  message: string,
  context: GoalChatContext
): Promise<GoalChatResponse> {
  const lower = message.toLowerCase();

  // @create-goal command
  if (lower.includes("@create-goal") || lower.includes("create goal") || lower.includes("new goal") || lower.includes("set goal")) {
    return await handleCreateGoal(message, context);
  }

  // List goals
  if (lower.includes("show goals") || lower.includes("list goals") || lower.includes("my goals") || lower.includes("all goals")) {
    return await handleListGoals(context);
  }

  // Update goal status
  if (lower.includes("complete goal") || lower.includes("cancel goal") || lower.includes("pause goal") || lower.includes("update goal")) {
    return await handleUpdateGoal(message, context);
  }

  // Assign agent
  if (lower.includes("assign agent") || lower.includes("assign to goal")) {
    return await handleAssignAgent(message, context);
  }

  // Goal progress
  if (lower.includes("goal progress") || lower.includes("goal status")) {
    return await handleGoalProgress(message, context);
  }

  // Default: help
  return {
    response: `**Goal Commands Available:**\n\n` +
      `- **@create-goal** [title] — Create a new multi-agent goal\n` +
      `- **show goals** — List all workspace goals\n` +
      `- **goal status** [name] — Check progress on a specific goal\n` +
      `- **assign agent** [agent] to [goal] — Assign an agent to a goal\n` +
      `- **update goal** [name] [status] — Update goal status (complete/pause/cancel)\n\n` +
      `Example: *@create-goal Q2 Lead Response Campaign with Lead Response Agent and Executive Board*`,
    action: "help",
  };
}

/**
 * Handle @create-goal command using LLM to parse natural language
 */
async function handleCreateGoal(
  message: string,
  context: GoalChatContext
): Promise<GoalChatResponse> {
  try {
    // Use LLM to extract goal details from natural language
    const availableAgents = await listAgents(context.workspaceId);
    const agentNames = availableAgents.map((a) => `${a.name} (${a.id})`).join(", ");

    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a goal parser for a multi-agent workspace. Extract goal details from the user's message.
Available agents: ${agentNames}

Return a JSON object with:
- title: string (goal title)
- description: string (goal description)
- priority: "low" | "medium" | "high" | "critical"
- targetDays: number (days until target, default 30)
- agents: array of { agentId: string, agentName: string, role: "owner" | "contributor" | "reviewer" | "executor" }
- successMetrics: array of { name: string, target: number, unit: string }

Be smart about inferring priority, agents, and metrics from context.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "goal_details",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
              targetDays: { type: "number" },
              agents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    agentId: { type: "string" },
                    agentName: { type: "string" },
                    role: { type: "string", enum: ["owner", "contributor", "reviewer", "executor"] },
                  },
                  required: ["agentId", "agentName", "role"],
                  additionalProperties: false,
                },
              },
              successMetrics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    target: { type: "number" },
                    unit: { type: "string" },
                  },
                  required: ["name", "target", "unit"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "description", "priority", "targetDays", "agents", "successMetrics"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(String(llmResponse.choices[0]?.message?.content || "{}"));

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (parsed.targetDays || 30));

    const goal = await createGoal({
      companyId: context.companyId,
      createdBy: context.userId,
      title: parsed.title || "Untitled Goal",
      description: parsed.description || "",
      priority: parsed.priority || "medium",
      targetDate,
      successMetrics: parsed.successMetrics || [],
      agents: parsed.agents || [],
    });

    // Build response with agent assignments
    const agentList = (parsed.agents || [])
      .map((a: any) => `  - **${a.agentName}** (${a.role})`)
      .join("\n");

    const metricsList = (parsed.successMetrics || [])
      .map((m: any) => `  - ${m.name}: ${m.target} ${m.unit}`)
      .join("\n");

    return {
      response: `**Goal Created Successfully** ✅\n\n` +
        `**${parsed.title}**\n` +
        `${parsed.description}\n\n` +
        `**Priority:** ${parsed.priority}\n` +
        `**Target Date:** ${targetDate.toLocaleDateString()}\n\n` +
        (agentList ? `**Assigned Agents:**\n${agentList}\n\n` : "") +
        (metricsList ? `**Success Metrics:**\n${metricsList}\n\n` : "") +
        `View and manage this goal on the [Goals Dashboard](/goals).`,
      action: "goal_created",
      data: goal,
    };
  } catch (error) {
    console.error("[Sigma Goals] Create goal failed:", error);
    return {
      response: `Failed to create goal. Please try again with a clearer description.\n\nExample: *@create-goal Q2 Lead Response Campaign - improve lead response time to under 5 minutes with Lead Response Agent and Executive Board*`,
      action: "help",
    };
  }
}

/**
 * Handle list goals request
 */
async function handleListGoals(context: GoalChatContext): Promise<GoalChatResponse> {
  try {
    const goals = await listGoals(context.companyId);

    if (goals.length === 0) {
      return {
        response: `**No goals found.** Create one with:\n\n*@create-goal [your goal description]*`,
        action: "goal_listed",
        data: [],
      };
    }

    const statusEmoji: Record<string, string> = {
      planning: "📋",
      active: "🚀",
      paused: "⏸️",
      completed: "✅",
      cancelled: "❌",
    };

    const priorityEmoji: Record<string, string> = {
      low: "🟢",
      medium: "🟡",
      high: "🟠",
      critical: "🔴",
    };

    const goalList = goals
      .map((g: any) => {
        const status = statusEmoji[g.status] || "📋";
        const priority = priorityEmoji[g.priority] || "🟡";
        const agentCount = g.agents?.length || 0;
        return `${status} ${priority} **${g.title}** — ${g.status} (${agentCount} agents)`;
      })
      .join("\n");

    return {
      response: `**Workspace Goals (${goals.length})**\n\n${goalList}\n\nSay *goal status [name]* for details on any goal.`,
      action: "goal_listed",
      data: goals,
    };
  } catch (error) {
    console.error("[Sigma Goals] List goals failed:", error);
    return {
      response: "Failed to retrieve goals. Please try again.",
      action: "help",
    };
  }
}

/**
 * Handle goal status/progress request
 */
async function handleGoalProgress(
  message: string,
  context: GoalChatContext
): Promise<GoalChatResponse> {
  try {
    const goals = await listGoals(context.companyId);

    if (goals.length === 0) {
      return {
        response: "No goals found. Create one with *@create-goal [description]*",
        action: "help",
      };
    }

    // Try to match a specific goal by name
    const lower = message.toLowerCase();
    const matchedGoal = goals.find((g: any) =>
      lower.includes(g.title.toLowerCase().substring(0, 20))
    );

    if (matchedGoal) {
      const fullGoal = await getGoal(matchedGoal.id);
      if (!fullGoal) {
        return { response: "Goal not found.", action: "help" };
      }

      const agentProgress = (fullGoal.agents || [])
        .map((a: any) => `  - **${a.agentName}** (${a.role}): ${a.completionPercentage || 0}% — ${a.status || "pending"}`)
        .join("\n");

      return {
        response: `**${fullGoal.title}**\n\n` +
          `**Status:** ${fullGoal.status}\n` +
          `**Priority:** ${fullGoal.priority}\n` +
          `**Target:** ${fullGoal.targetDate ? new Date(fullGoal.targetDate).toLocaleDateString() : "No target"}\n\n` +
          (agentProgress ? `**Agent Progress:**\n${agentProgress}\n\n` : "No agents assigned.\n\n") +
          `Say *update goal ${fullGoal.title} [complete/pause/cancel]* to change status.`,
        action: "goal_info",
        data: fullGoal,
      };
    }

    // No specific match — show overview
    return await handleListGoals(context);
  } catch (error) {
    console.error("[Sigma Goals] Goal progress failed:", error);
    return { response: "Failed to check goal progress.", action: "help" };
  }
}

/**
 * Handle update goal status
 */
async function handleUpdateGoal(
  message: string,
  context: GoalChatContext
): Promise<GoalChatResponse> {
  try {
    const lower = message.toLowerCase();
    let newStatus: "completed" | "paused" | "cancelled" | "active" = "active";

    if (lower.includes("complete")) newStatus = "completed";
    else if (lower.includes("pause")) newStatus = "paused";
    else if (lower.includes("cancel")) newStatus = "cancelled";

    const goals = await listGoals(context.companyId);
    const matchedGoal = goals.find((g: any) =>
      lower.includes(g.title.toLowerCase().substring(0, 20))
    );

    if (!matchedGoal) {
      const goalNames = goals.map((g: any) => `- ${g.title}`).join("\n");
      return {
        response: `Could not find the goal to update. Available goals:\n\n${goalNames}\n\nTry: *update goal [exact name] [complete/pause/cancel]*`,
        action: "help",
      };
    }

    const updated = await updateGoal({
      goalId: matchedGoal.id,
      status: newStatus,
    });

    return {
      response: `**Goal Updated** ✅\n\n**${matchedGoal.title}** is now **${newStatus}**.`,
      action: "goal_updated",
      data: updated,
    };
  } catch (error) {
    console.error("[Sigma Goals] Update goal failed:", error);
    return { response: "Failed to update goal.", action: "help" };
  }
}

/**
 * Handle assign agent to goal
 */
async function handleAssignAgent(
  message: string,
  context: GoalChatContext
): Promise<GoalChatResponse> {
  try {
    const availableAgents = await listAgents(context.workspaceId);
    const goals = await listGoals(context.companyId);
    const lower = message.toLowerCase();

    // Try to find agent mention
    const matchedAgent = availableAgents.find((a) =>
      lower.includes(a.name.toLowerCase())
    );

    // Try to find goal mention
    const matchedGoal = goals.find((g: any) =>
      lower.includes(g.title.toLowerCase().substring(0, 20))
    );

    if (!matchedAgent || !matchedGoal) {
      const agentNames = availableAgents.map((a) => `- ${a.name}`).join("\n");
      const goalNames = goals.map((g: any) => `- ${g.title}`).join("\n");

      return {
        response: `I need both an agent name and a goal name.\n\n**Available Agents:**\n${agentNames}\n\n**Available Goals:**\n${goalNames}\n\nTry: *assign Lead Response Agent to Q2 Campaign*`,
        action: "help",
      };
    }

    const result = await assignAgentToGoal(
      matchedGoal.id,
      matchedAgent.id,
      matchedAgent.name,
      "contributor"
    );

    return {
      response: `**Agent Assigned** ✅\n\n**${matchedAgent.name}** has been assigned to **${matchedGoal.title}** as a contributor.`,
      action: "agent_assigned",
      data: result,
    };
  } catch (error) {
    console.error("[Sigma Goals] Assign agent failed:", error);
    return { response: "Failed to assign agent to goal.", action: "help" };
  }
}
