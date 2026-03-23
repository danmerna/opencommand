import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Core Users ───────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Companies (Multi-Company Runtime) ───────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  mission: text("mission"),
  industry: varchar("industry", { length: 64 }),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
  monthlyBudget: decimal("monthlyBudget", { precision: 12, scale: 2 }).default("0"),
  totalRevenue: decimal("totalRevenue", { precision: 14, scale: 2 }).default("0"),
  totalCosts: decimal("totalCosts", { precision: 14, scale: 2 }).default("0"),
  agentCount: int("agentCount").default(0).notNull(),
  briefingFrequency: mysqlEnum("briefingFrequency", ["daily", "weekly", "monthly", "quarterly"]).default("weekly"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── Departments ─────────────────────────────────────────────────────────────
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }).default("0"),
  headAgentId: int("headAgentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ─── AI Agents (Extended with Org Chart) ─────────────────────────────────────
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  departmentId: int("departmentId"),
  parentAgentId: int("parentAgentId"),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["ceo", "cto", "cmo", "cfo", "vp", "manager", "specialist", "marketing", "research", "sales", "admin", "custom"]).notNull(),
  status: mysqlEnum("status", ["idle", "active", "paused", "error", "terminated"]).default("idle").notNull(),
  roleTitle: varchar("roleTitle", { length: 128 }),
  jobDescription: text("jobDescription"),
  description: text("description"),
  capabilities: json("capabilities").$type<string[]>(),
  tools: json("tools").$type<string[]>(),
  connectorType: mysqlEnum("connectorType", ["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"]).default("internal").notNull(),
  connectorConfig: json("connectorConfig").$type<Record<string, unknown>>(),
  heartbeatCron: varchar("heartbeatCron", { length: 64 }),
  heartbeatEnabled: boolean("heartbeatEnabled").default(false).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat"),
  nextHeartbeat: timestamp("nextHeartbeat"),
  monthlyBudget: decimal("monthlyBudget", { precision: 10, scale: 2 }).default("0"),
  budgetUsed: decimal("budgetUsed", { precision: 10, scale: 2 }).default("0"),
  budgetAlertThreshold: decimal("budgetAlertThreshold", { precision: 5, scale: 2 }).default("75"),
  failoverAgentId: int("failoverAgentId"),
  resourceUsage: decimal("resourceUsage", { precision: 5, scale: 2 }).default("0"),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  totalValueCreated: decimal("totalValueCreated", { precision: 12, scale: 2 }).default("0"),
  totalCostIncurred: decimal("totalCostIncurred", { precision: 12, scale: 2 }).default("0"),
  isMarketplaceListing: boolean("isMarketplaceListing").default(false).notNull(),
  orgChartX: int("orgChartX").default(0),
  orgChartY: int("orgChartY").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ─── Agent Capability Registry ───────────────────────────────────────────────
export const agentCapabilities = mysqlTable("agent_capabilities", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  capability: varchar("capability", { length: 128 }).notNull(),
  proficiency: mysqlEnum("proficiency", ["basic", "intermediate", "advanced", "expert"]).default("intermediate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentCapability = typeof agentCapabilities.$inferSelect;
export type InsertAgentCapability = typeof agentCapabilities.$inferInsert;

// ─── OKRs (Extended with Goal Hierarchy) ─────────────────────────────────────
export const okrs = mysqlTable("okrs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  parentOkrId: int("parentOkrId"),
  level: mysqlEnum("level", ["company", "department", "agent", "task"]).default("company").notNull(),
  objective: text("objective").notNull(),
  keyResult: text("keyResult").notNull(),
  targetValue: decimal("targetValue", { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal("currentValue", { precision: 12, scale: 2 }).default("0").notNull(),
  unit: varchar("unit", { length: 32 }).default("").notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["on_track", "at_risk", "achieved", "missed"]).default("on_track").notNull(),
  source: mysqlEnum("source", ["manual", "strategy"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Okr = typeof okrs.$inferSelect;
export type InsertOkr = typeof okrs.$inferInsert;

// ─── Tasks (Extended with Tickets/Threading) ─────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  parentTaskId: int("parentTaskId"),
  okrId: int("okrId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  intentObject: json("intentObject").$type<Record<string, unknown>>(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed", "awaiting_human", "delegated"]).default("pending").notNull(),
  routingMode: mysqlEnum("routingMode", ["ai", "human", "hybrid"]).default("ai").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  estimatedHours: decimal("estimatedHours", { precision: 6, scale: 2 }),
  actualHours: decimal("actualHours", { precision: 6, scale: 2 }),
  tokenCost: decimal("tokenCost", { precision: 10, scale: 4 }).default("0"),
  apiCallCost: decimal("apiCallCost", { precision: 10, scale: 4 }).default("0"),
  totalCost: decimal("totalCost", { precision: 10, scale: 4 }).default("0"),
  generatedPrompt: text("generatedPrompt"),
  executionLog: json("executionLog").$type<string[]>(),
  delegatedFromAgentId: int("delegatedFromAgentId"),
  delegatedToAgentId: int("delegatedToAgentId"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Task Threads (Ticket System) ────────────────────────────────────────────
export const taskThreads = mysqlTable("task_threads", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  agentId: int("agentId"),
  userId: int("userId"),
  role: mysqlEnum("role", ["agent", "human", "system"]).notNull(),
  content: text("content").notNull(),
  toolCalls: json("toolCalls").$type<Record<string, unknown>[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskThread = typeof taskThreads.$inferSelect;
export type InsertTaskThread = typeof taskThreads.$inferInsert;

// ─── Heartbeat Log ───────────────────────────────────────────────────────────
export const heartbeatLog = mysqlTable("heartbeat_log", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  companyId: int("companyId"),
  status: mysqlEnum("status", ["success", "error", "skipped", "throttled"]).notNull(),
  tasksChecked: int("tasksChecked").default(0),
  tasksActedOn: int("tasksActedOn").default(0),
  tokenCost: decimal("tokenCost", { precision: 10, scale: 4 }).default("0"),
  duration: int("duration").default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HeartbeatLogEntry = typeof heartbeatLog.$inferSelect;
export type InsertHeartbeatLogEntry = typeof heartbeatLog.$inferInsert;

// ─── Proof of Outcome Receipts ───────────────────────────────────────────────
export const pooReceipts = mysqlTable("poo_receipts", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  receiptNumber: varchar("receiptNumber", { length: 32 }).notNull().unique(),
  taskTitle: varchar("taskTitle", { length: 256 }).notNull(),
  outcome: text("outcome").notNull(),
  laborHoursSaved: decimal("laborHoursSaved", { precision: 8, scale: 2 }).notNull(),
  dollarValueCreated: decimal("dollarValueCreated", { precision: 12, scale: 2 }).notNull(),
  costIncurred: decimal("costIncurred", { precision: 10, scale: 4 }).default("0"),
  hourlyRateBenchmark: decimal("hourlyRateBenchmark", { precision: 8, scale: 2 }).default("150"),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "disputed"]).default("pending").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PooReceipt = typeof pooReceipts.$inferSelect;
export type InsertPooReceipt = typeof pooReceipts.$inferInsert;

// ─── Human-in-the-Loop Inbox ─────────────────────────────────────────────────
export const inboxItems = mysqlTable("inbox_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  taskId: int("taskId"),
  agentId: int("agentId"),
  type: mysqlEnum("type", ["decision_required", "budget_approval", "task_review", "alert", "poo_generated", "hire_approval", "strategy_review", "kill_switch"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["unread", "read", "resolved", "dismissed"]).default("unread").notNull(),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InboxItem = typeof inboxItems.$inferSelect;
export type InsertInboxItem = typeof inboxItems.$inferInsert;

// ─── Approval Gates ──────────────────────────────────────────────────────────
export const approvalGates = mysqlTable("approval_gates", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  gateType: mysqlEnum("gateType", ["spend", "hire", "strategy", "terminate", "custom"]).notNull(),
  threshold: decimal("threshold", { precision: 12, scale: 2 }),
  description: text("description"),
  requiresApproval: boolean("requiresApproval").default(true).notNull(),
  autoApproveBelow: decimal("autoApproveBelow", { precision: 12, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalGate = typeof approvalGates.$inferSelect;
export type InsertApprovalGate = typeof approvalGates.$inferInsert;

// ─── Company Blueprints ──────────────────────────────────────────────────────
export const blueprints = mysqlTable("blueprints", {
  id: int("id").autoincrement().primaryKey(),
  creatorUserId: int("creatorUserId").notNull(),
  sourceCompanyId: int("sourceCompanyId"),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 256 }),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  version: varchar("version", { length: 16 }).default("1.0.0").notNull(),
  changelog: text("changelog"),
  orgStructure: json("orgStructure").$type<Record<string, unknown>>(),
  agentConfigs: json("agentConfigs").$type<Record<string, unknown>[]>(),
  heartbeatConfigs: json("heartbeatConfigs").$type<Record<string, unknown>[]>(),
  okrTemplates: json("okrTemplates").$type<Record<string, unknown>[]>(),
  budgetAllocations: json("budgetAllocations").$type<Record<string, unknown>>(),
  governancePolicies: json("governancePolicies").$type<Record<string, unknown>>(),
  toolRequirements: json("toolRequirements").$type<string[]>(),
  estimatedMonthlyCost: decimal("estimatedMonthlyCost", { precision: 10, scale: 2 }),
  agentCount: int("agentCount").default(0),
  pricingModel: mysqlEnum("pricingModel", ["one_time", "monthly", "revenue_share", "franchise"]).default("monthly").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  revenueSharePct: decimal("revenueSharePct", { precision: 5, scale: 2 }),
  performanceScore: decimal("performanceScore", { precision: 5, scale: 2 }),
  totalValueGenerated: decimal("totalValueGenerated", { precision: 14, scale: 2 }).default("0"),
  totalDeployments: int("totalDeployments").default(0),
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }).default("0"),
  isCertified: boolean("isCertified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  endorsedBy: varchar("endorsedBy", { length: 128 }),
  endorserHandle: varchar("endorserHandle", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Blueprint = typeof blueprints.$inferSelect;
export type InsertBlueprint = typeof blueprints.$inferInsert;

// ─── Blueprint Reviews ───────────────────────────────────────────────────────
export const blueprintReviews = mysqlTable("blueprint_reviews", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  review: text("review"),
  verifiedValueCreated: decimal("verifiedValueCreated", { precision: 12, scale: 2 }),
  verifiedCostEfficiency: decimal("verifiedCostEfficiency", { precision: 5, scale: 2 }),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlueprintReview = typeof blueprintReviews.$inferSelect;
export type InsertBlueprintReview = typeof blueprintReviews.$inferInsert;

// ─── Blueprint Deployments ───────────────────────────────────────────────────
export const blueprintDeployments = mysqlTable("blueprint_deployments", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  status: mysqlEnum("status", ["deploying", "active", "paused", "failed"]).default("deploying").notNull(),
  totalValueCreated: decimal("totalValueCreated", { precision: 14, scale: 2 }).default("0"),
  totalCosts: decimal("totalCosts", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlueprintDeployment = typeof blueprintDeployments.$inferSelect;
export type InsertBlueprintDeployment = typeof blueprintDeployments.$inferInsert;

// ─── Marketplace Listings (Extended) ─────────────────────────────────────────
export const marketplaceListings = mysqlTable("marketplace_listings", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId"),
  blueprintId: int("blueprintId"),
  listingType: mysqlEnum("listingType", ["agent", "blueprint", "skill"]).default("agent").notNull(),
  tier: mysqlEnum("tier", ["solo_founder", "enterprise", "custom"]).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 256 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  pricingModel: mysqlEnum("pricingModel", ["monthly", "annual", "usage", "value_capture", "one_time", "revenue_share", "franchise"]).default("monthly").notNull(),
  features: json("features").$type<string[]>(),
  endorsedBy: varchar("endorsedBy", { length: 128 }),
  endorserHandle: varchar("endorserHandle", { length: 64 }),
  endorserNiche: varchar("endorserNiche", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  totalPurchases: int("totalPurchases").default(0).notNull(),
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

// ─── Skills (Marketplace) ────────────────────────────────────────────────────
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  creatorUserId: int("creatorUserId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }),
  description: text("description"),
  skillContent: text("skillContent"),
  price: decimal("price", { precision: 8, scale: 2 }),
  totalInstalls: int("totalInstalls").default(0),
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }).default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ─── External Tool Registry ──────────────────────────────────────────────────
export const toolRegistry = mysqlTable("tool_registry", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  name: varchar("name", { length: 64 }).notNull(),
  category: varchar("category", { length: 64 }),
  description: text("description"),
  apiEndpoint: varchar("apiEndpoint", { length: 512 }),
  costPerUse: decimal("costPerUse", { precision: 8, scale: 4 }).default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  config: json("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ToolRegistryEntry = typeof toolRegistry.$inferSelect;
export type InsertToolRegistryEntry = typeof toolRegistry.$inferInsert;

// ─── Webhook Endpoints (API Gateway) ─────────────────────────────────────────
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  secret: varchar("secret", { length: 256 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// ─── Creator Partnerships ────────────────────────────────────────────────────
export const creatorPartnerships = mysqlTable("creator_partnerships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  creatorName: varchar("creatorName", { length: 128 }).notNull(),
  creatorHandle: varchar("creatorHandle", { length: 64 }).notNull(),
  niche: varchar("niche", { length: 64 }).notNull(),
  audienceSize: int("audienceSize"),
  platform: varchar("platform", { length: 32 }),
  status: mysqlEnum("status", ["applied", "active", "paused", "terminated"]).default("applied").notNull(),
  floorGuarantee: decimal("floorGuarantee", { precision: 10, scale: 2 }).default("0"),
  flowPercentage: decimal("flowPercentage", { precision: 5, scale: 2 }).default("0"),
  totalEarned: decimal("totalEarned", { precision: 12, scale: 2 }).default("0"),
  endorsedListingId: int("endorsedListingId"),
  endorsedBlueprintId: int("endorsedBlueprintId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorPartnership = typeof creatorPartnerships.$inferSelect;
export type InsertCreatorPartnership = typeof creatorPartnerships.$inferInsert;

// ─── Decision Log (Memory Engine) ────────────────────────────────────────────
export const decisionLog = mysqlTable("decision_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  taskId: int("taskId"),
  decisionType: varchar("decisionType", { length: 64 }).notNull(),
  context: text("context"),
  decision: text("decision").notNull(),
  rationale: text("rationale"),
  outcome: text("outcome"),
  optionsConsidered: json("optionsConsidered").$type<string[]>(),
  wasSuccessful: boolean("wasSuccessful"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DecisionLogEntry = typeof decisionLog.$inferSelect;
export type InsertDecisionLogEntry = typeof decisionLog.$inferInsert;

// ─── Audit Log (Compliance) ──────────────────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  userId: int("userId"),
  agentId: int("agentId"),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

// ─── Tool Categories (Integration Abstraction Layer) ────────────────────────
export const toolCategories = mysqlTable("tool_categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  abstractActions: json("abstractActions").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ToolCategory = typeof toolCategories.$inferSelect;
export type InsertToolCategory = typeof toolCategories.$inferInsert;

// ─── Tool Providers (Specific SaaS Tools) ───────────────────────────────────
export const toolProviders = mysqlTable("tool_providers", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  authType: mysqlEnum("authType", ["oauth2", "api_key", "webhook", "none"]).default("oauth2").notNull(),
  oauthScopes: json("oauthScopes").$type<string[]>(),
  baseApiUrl: varchar("baseApiUrl", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ToolProvider = typeof toolProviders.$inferSelect;
export type InsertToolProvider = typeof toolProviders.$inferInsert;

// ─── User Connections (Connected Tools per User) ────────────────────────────
export const userConnections = mysqlTable("user_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(),
  categoryId: int("categoryId").notNull(),
  status: mysqlEnum("status", ["connected", "disconnected", "error", "expired"]).default("connected").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  accountName: varchar("accountName", { length: 128 }),
  accountId: varchar("accountId", { length: 128 }),
  lastSyncAt: timestamp("lastSyncAt"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserConnection = typeof userConnections.$inferSelect;
export type InsertUserConnection = typeof userConnections.$inferInsert;

// ─── Abstraction Mappings (Category Actions → Provider API Calls) ───────────
export const abstractionMappings = mysqlTable("abstraction_mappings", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  providerId: int("providerId").notNull(),
  abstractAction: varchar("abstractAction", { length: 128 }).notNull(),
  apiMethod: mysqlEnum("apiMethod", ["GET", "POST", "PUT", "PATCH", "DELETE"]).notNull(),
  apiEndpoint: varchar("apiEndpoint", { length: 512 }).notNull(),
  requestTemplate: json("requestTemplate").$type<Record<string, unknown>>(),
  responseMapping: json("responseMapping").$type<Record<string, unknown>>(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AbstractionMapping = typeof abstractionMappings.$inferSelect;
export type InsertAbstractionMapping = typeof abstractionMappings.$inferInsert;

// ─── Context Objects (Assembled Context per Request) ────────────────────────
export const contextObjects = mysqlTable("context_objects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId"),
  requestText: text("requestText").notNull(),
  inferredDomain: varchar("inferredDomain", { length: 64 }),
  inferredCategories: json("inferredCategories").$type<string[]>(),
  userProfile: json("userProfile").$type<Record<string, unknown>>(),
  liveState: json("liveState").$type<Record<string, unknown>>(),
  recentHistory: json("recentHistory").$type<Record<string, unknown>>(),
  inferredInsights: json("inferredInsights").$type<string[]>(),
  suggestedParameters: json("suggestedParameters").$type<Record<string, unknown>>(),
  contextualizedQuestions: json("contextualizedQuestions").$type<string[]>(),
  status: mysqlEnum("status", ["interpreting", "gathering", "contextualizing", "ready", "expired"]).default("interpreting").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContextObject = typeof contextObjects.$inferSelect;
export type InsertContextObject = typeof contextObjects.$inferInsert;

// ─── Agent Required Categories (for Marketplace Portability) ────────────────
export const agentRequiredCategories = mysqlTable("agent_required_categories", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId"),
  blueprintId: int("blueprintId"),
  listingId: int("listingId"),
  categoryId: int("categoryId").notNull(),
  isRequired: boolean("isRequired").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentRequiredCategory = typeof agentRequiredCategories.$inferSelect;
export type InsertAgentRequiredCategory = typeof agentRequiredCategories.$inferInsert;

// ─── Projects (Focused Goal Workspaces) ──────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  name: varchar("name", { length: 128 }).notNull(),
  goal: text("goal"),
  color: varchar("color", { length: 32 }).default("#6366f1").notNull(),
  status: mysqlEnum("status", ["active", "paused", "completed", "archived"]).default("active").notNull(),
  plan: text("plan"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Files ────────────────────────────────────────────────────────────
export const projectFiles = mysqlTable("project_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  size: int("size").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;

// ─── Project Chats ────────────────────────────────────────────────────────────
export const projectChats = mysqlTable("project_chats", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).default("user").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectChat = typeof projectChats.$inferSelect;
export type InsertProjectChat = typeof projectChats.$inferInsert;

// ─── Agent Onboardings (Socratic C-Suite Context Gathering) ─────────────────
export const agentOnboardings = mysqlTable("agent_onboardings", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  status: mysqlEnum("status", ["in_progress", "completed"]).default("in_progress").notNull(),
  agentType: varchar("agentType", { length: 32 }).notNull(),
  context: json("context").$type<Record<string, unknown>>(),
  conversationHistory: json("conversationHistory").$type<{ role: string; content: string }[]>(),
  summary: text("summary"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentOnboarding = typeof agentOnboardings.$inferSelect;
export type InsertAgentOnboarding = typeof agentOnboardings.$inferInsert;

// ─── Strategy Proposals (CEO-generated after onboarding) ────────────────────
export const strategyProposals = mysqlTable("strategy_proposals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  proposedByAgentId: int("proposedByAgentId"),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  executiveSummary: text("executiveSummary"),
  status: mysqlEnum("status", ["draft", "proposed", "accepted", "revised"]).default("proposed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StrategyProposal = typeof strategyProposals.$inferSelect;
export type InsertStrategyProposal = typeof strategyProposals.$inferInsert;

// ─── Waitlist Entries (Creators page signup) ─────────────────────────────────
export const waitlistEntries = mysqlTable("waitlist_entries", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 64 }).default("creators").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

// ─── Briefing Logs (history of delivered strategy briefings) ─────────────────
export const briefingLogs = mysqlTable("briefing_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  companyName: varchar("companyName", { length: 128 }),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
});

export type BriefingLog = typeof briefingLogs.$inferSelect;
export type InsertBriefingLog = typeof briefingLogs.$inferInsert;
