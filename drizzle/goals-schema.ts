import { int, mysqlTable, mysqlEnum, text, timestamp, varchar, decimal, json, index } from "drizzle-orm/mysql-core";

/**
 * Multi-Agent Workplace Goals Schema (MySQL)
 * 
 * Supports:
 * - Creating goals with assigned agents
 * - Tracking agent contributions and progress
 * - Real-time status updates (on-track, at-risk, completed)
 * - KPI/metric tracking per goal
 */

export const workspaceGoals = mysqlTable(
  "workspace_goals",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    createdBy: int("createdBy").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["planning", "active", "paused", "completed", "cancelled"]).default("planning").notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
    targetDate: timestamp("targetDate"),
    completionDate: timestamp("completionDate"),
    successMetrics: json("successMetrics"), // Array of metric definitions
    metricsJson: json("metricsJson"), // Current metric values
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    companyIdx: index("workspace_goals_company_idx").on(table.companyId),
    statusIdx: index("workspace_goals_status_idx").on(table.status),
  })
);

export const goalAgents = mysqlTable(
  "goal_agents",
  {
    id: int("id").autoincrement().primaryKey(),
    goalId: int("goalId").notNull(),
    agentId: varchar("agentId", { length: 128 }).notNull(),
    agentName: varchar("agentName", { length: 256 }).notNull(),
    role: mysqlEnum("role", ["owner", "contributor", "reviewer", "executor"]).default("contributor").notNull(),
    assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    completionPercentage: decimal("completionPercentage", { precision: 5, scale: 2 }).default("0"),
    status: mysqlEnum("status", ["pending", "in-progress", "completed", "blocked"]).default("pending").notNull(),
    notes: text("notes"),
  },
  (table) => ({
    goalIdx: index("goal_agents_goal_idx").on(table.goalId),
    agentIdx: index("goal_agents_agent_idx").on(table.agentId),
  })
);

export const goalProgress = mysqlTable(
  "goal_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    goalId: int("goalId").notNull(),
    agentId: varchar("agentId", { length: 128 }).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    progressPercentage: decimal("progressPercentage", { precision: 5, scale: 2 }),
    status: mysqlEnum("status", ["on-track", "at-risk", "blocked", "completed"]).default("on-track").notNull(),
    update: text("update"),
    metricsSnapshot: json("metricsSnapshot"),
    completedTasks: int("completedTasks").default(0),
    totalTasks: int("totalTasks").default(0),
  },
  (table) => ({
    goalIdx: index("goal_progress_goal_idx").on(table.goalId),
    agentIdx: index("goal_progress_agent_idx").on(table.agentId),
    timestampIdx: index("goal_progress_timestamp_idx").on(table.timestamp),
  })
);

export const goalCollaborations = mysqlTable(
  "goal_collaborations",
  {
    id: int("id").autoincrement().primaryKey(),
    goalId: int("goalId").notNull(),
    fromAgentId: varchar("fromAgentId", { length: 128 }).notNull(),
    toAgentId: varchar("toAgentId", { length: 128 }).notNull(),
    messageType: mysqlEnum("messageType", ["request", "update", "blocker", "completion"]).default("update").notNull(),
    message: text("message").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    resolved: int("resolved").default(0),
  },
  (table) => ({
    goalIdx: index("goal_collaborations_goal_idx").on(table.goalId),
    fromIdx: index("goal_collaborations_from_idx").on(table.fromAgentId),
    toIdx: index("goal_collaborations_to_idx").on(table.toAgentId),
  })
);

export type WorkspaceGoal = typeof workspaceGoals.$inferSelect;
export type InsertWorkspaceGoal = typeof workspaceGoals.$inferInsert;
export type GoalAgent = typeof goalAgents.$inferSelect;
export type InsertGoalAgent = typeof goalAgents.$inferInsert;
export type GoalProgress = typeof goalProgress.$inferSelect;
export type InsertGoalProgress = typeof goalProgress.$inferInsert;
export type GoalCollaboration = typeof goalCollaborations.$inferSelect;
export type InsertGoalCollaboration = typeof goalCollaborations.$inferInsert;
