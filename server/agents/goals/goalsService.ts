import { getDb } from "../../db";
import { workspaceGoals, goalAgents, goalProgress, goalCollaborations } from "../../../drizzle/goals-schema";
import { eq, and, desc } from "drizzle-orm";

export interface CreateGoalInput {
  companyId: number;
  createdBy: number;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  targetDate?: Date;
  successMetrics?: Array<{ name: string; target: number; unit: string }>;
  agents?: Array<{ agentId: string; agentName: string; role: "owner" | "contributor" | "reviewer" | "executor" }>;
}

export interface UpdateGoalInput {
  goalId: number;
  title?: string;
  description?: string;
  status?: "planning" | "active" | "paused" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "critical";
  targetDate?: Date;
  successMetrics?: Array<{ name: string; target: number; unit: string }>;
}

export async function createGoal(input: CreateGoalInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db.insert(workspaceGoals).values({
    companyId: input.companyId,
    createdBy: input.createdBy,
    title: input.title,
    description: input.description || null,
    status: "planning",
    priority: input.priority || "medium",
    targetDate: input.targetDate || null,
    completionDate: null,
    successMetrics: input.successMetrics || null,
    metricsJson: input.successMetrics
      ? Object.fromEntries(input.successMetrics.map((m) => [m.name, 0]))
      : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const goalId = result[0].insertId as number;

  // Assign agents if provided
  if (input.agents && input.agents.length > 0) {
    await db.insert(goalAgents).values(
      input.agents.map((agent) => ({
        goalId: goalId,
        agentId: agent.agentId,
        agentName: agent.agentName,
        role: (agent.role || "contributor") as any,
        assignedAt: new Date(),
        completionPercentage: "0",
        status: "pending" as any,
        notes: null,
      }))
    );
  }

  return { goalId, ...input };
}

export async function getGoal(goalId: number) {
  const db = await getDb();
  if (!db) return null;

  const goals = await db.select().from(workspaceGoals).where(eq(workspaceGoals.id, goalId));
  const goal = goals[0];

  if (!goal) return null;

  const agents = await db.select().from(goalAgents).where(eq(goalAgents.goalId, goalId));

  const progressList = await db
    .select()
    .from(goalProgress)
    .where(eq(goalProgress.goalId, goalId))
    .orderBy(desc(goalProgress.timestamp))
    .limit(1);

  return {
    ...goal,
    agents,
    latestProgress: progressList[0] || null,
    successMetrics: goal.successMetrics || [],
    metrics: goal.metricsJson || {},
  };
}

export async function listGoals(companyId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const goals = await db
    .select()
    .from(workspaceGoals)
    .where(status ? and(eq(workspaceGoals.companyId, companyId), eq(workspaceGoals.status, status as any)) : eq(workspaceGoals.companyId, companyId))
    .orderBy(desc(workspaceGoals.createdAt));

  return Promise.all(
    goals.map(async (goal) => {
      const agents = await db.select().from(goalAgents).where(eq(goalAgents.goalId, goal.id));

      return {
        ...goal,
        agents,
        successMetrics: goal.successMetrics || [],
        metrics: goal.metricsJson || {},
      };
    })
  );
}

export async function updateGoal(input: UpdateGoalInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const updates: any = {
    updatedAt: new Date(),
  };

  if (input.title) updates.title = input.title;
  if (input.description) updates.description = input.description;
  if (input.status) updates.status = input.status as any;
  if (input.priority) updates.priority = input.priority as any;
  if (input.targetDate) updates.targetDate = input.targetDate;
  if (input.successMetrics) {
    updates.successMetrics = input.successMetrics;
    updates.metricsJson = Object.fromEntries(input.successMetrics.map((m) => [m.name, 0]));
  }

  if (input.status === "completed") {
    updates.completionDate = new Date();
  }

  await db.update(workspaceGoals).set(updates).where(eq(workspaceGoals.id, input.goalId));

  return getGoal(input.goalId);
}

export async function deleteGoal(goalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.delete(workspaceGoals).where(eq(workspaceGoals.id, goalId));
  return { success: true };
}

export async function assignAgentToGoal(goalId: number, agentId: string, agentName: string, role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(goalAgents).values({
    goalId: goalId,
    agentId: agentId,
    agentName: agentName,
    role: role as any,
    assignedAt: new Date(),
    completionPercentage: "0",
    status: "pending" as any,
    notes: null,
  });

  return getGoal(goalId);
}

export async function updateAgentProgress(goalId: number, agentId: string, progressPercentage: number, status: string, update?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Record progress
  await db.insert(goalProgress).values({
    goalId: goalId,
    agentId: agentId,
    timestamp: new Date(),
    progressPercentage: String(progressPercentage),
    status: status as any,
    update: update || null,
    metricsSnapshot: null,
    completedTasks: 0,
    totalTasks: 0,
  });

  // Update agent status
  await db
    .update(goalAgents)
    .set({
      completionPercentage: String(progressPercentage),
      status: status as any,
    })
    .where(and(eq(goalAgents.goalId, goalId), eq(goalAgents.agentId, agentId)));

  return getGoal(goalId);
}

export async function recordAgentCollaboration(
  goalId: number,
  fromAgentId: string,
  toAgentId: string,
  messageType: string,
  message: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(goalCollaborations).values({
    goalId: goalId,
    fromAgentId: fromAgentId,
    toAgentId: toAgentId,
    messageType: messageType as any,
    message: message,
    timestamp: new Date(),
    resolved: 0,
  });

  return { success: true };
}

export async function getGoalCollaborations(goalId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(goalCollaborations).where(eq(goalCollaborations.goalId, goalId)).orderBy(desc(goalCollaborations.timestamp));
}
