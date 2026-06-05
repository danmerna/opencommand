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
  emailUnsubscribeToken: varchar("emailUnsubscribeToken", { length: 64 }),
  emailUnsubscribed: boolean("emailUnsubscribed").default(false).notNull(),
  waitlistStatus: mysqlEnum("waitlistStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  waitlistPosition: int("waitlistPosition"),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  referralCount: int("referralCount").default(0).notNull(),
  referredBy: varchar("referredBy", { length: 32 }),
  waitlistJoinedAt: timestamp("waitlistJoinedAt"),
  waitlistApprovedAt: timestamp("waitlistApprovedAt"),
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
  website: varchar("website", { length: 256 }),
  briefingFrequency: mysqlEnum("briefingFrequency", ["daily", "weekly", "monthly", "quarterly"]).default("weekly"),
  companySize: mysqlEnum("companySize", ["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;;

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
  connectorType: mysqlEnum("connectorType", ["internal", "openai", "anthropic", "gemini", "custom_api", "crewai", "claude_code"]).default("internal").notNull(),
  connectorConfig: text("connectorConfig"),
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
  builtWithSigma: boolean("builtWithSigma").default(false).notNull(),
  sigmaSpec: json("sigmaSpec").$type<Record<string, unknown>>(),
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

// ─── Email Templates ────────────────────────────────────────────────────────
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["john_deere", "kubota", "financing", "parts", "service", "custom"]).default("custom").notNull(),
  subject: varchar("subject", { length: 256 }).notNull(),
  body: text("body").notNull(),
  variablesJson: text("variablesJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

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
  recommendations: json("recommendations").$type<Record<string, unknown>>(),
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

// ─── Feature Events (Usage Analytics) ───────────────────────────────────────
export const featureEvents = mysqlTable("feature_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  feature: varchar("feature", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeatureEvent = typeof featureEvents.$inferSelect;
export type InsertFeatureEvent = typeof featureEvents.$inferInsert;

// ─── User Feedback (In-App Feedback Widget) ─────────────────────────────────
export const userFeedback = mysqlTable("user_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["bug", "feature", "general", "praise"]).default("general").notNull(),
  content: text("content").notNull(),
  page: varchar("page", { length: 128 }),
  status: mysqlEnum("status", ["new", "reviewed", "resolved"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;

// ─── Changelog Entries (What's New) ─────────────────────────────────────────
export const changelogEntries = mysqlTable("changelog_entries", {
  id: int("id").autoincrement().primaryKey(),
  version: varchar("version", { length: 32 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  type: mysqlEnum("type", ["feature", "improvement", "fix", "announcement"]).default("feature").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type InsertChangelogEntry = typeof changelogEntries.$inferInsert;

// ─── Onboarding Welcome Email Tracking ──────────────────────────────────────
export const onboardingWelcomeEmails = mysqlTable("onboarding_welcome_emails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  companyId: int("companyId"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type OnboardingWelcomeEmail = typeof onboardingWelcomeEmails.$inferSelect;
export type InsertOnboardingWelcomeEmail = typeof onboardingWelcomeEmails.$inferInsert;

// ─── Page Views (Client-side beacon tracking) ────────────────────────────────
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }),
  path: varchar("path", { length: 512 }).notNull(),
  referrer: varchar("referrer", { length: 512 }),
  userAgent: text("userAgent"),
  duration: int("duration"), // ms spent on page (sent on next navigation)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ─── User Sessions ────────────────────────────────────────────────────────────
export const userSessions = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  pageCount: int("pageCount").default(1).notNull(),
  entryPath: varchar("entryPath", { length: 512 }),
  exitPath: varchar("exitPath", { length: 512 }),
  userAgent: text("userAgent"),
  duration: int("duration").default(0), // total session ms
});
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// ─── Agent Autonomy Settings ────────────────────────────────────────────────
export const agentAutonomySettings = mysqlTable("agent_autonomy_settings", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  autonomyLevel: mysqlEnum("autonomyLevel", ["full_auto", "supervised", "approval_required", "manual_only"]).default("supervised").notNull(),
  maxSpendPerTask: decimal("maxSpendPerTask", { precision: 10, scale: 2 }).default("50"),
  maxTasksPerDay: int("maxTasksPerDay").default(10),
  allowedActions: json("allowedActions").$type<string[]>(),
  blockedActions: json("blockedActions").$type<string[]>(),
  requireApprovalAbove: decimal("requireApprovalAbove", { precision: 10, scale: 2 }).default("100"),
  crossModelVerification: boolean("crossModelVerification").default(false).notNull(),
  ralfEnabled: boolean("ralfEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentAutonomySetting = typeof agentAutonomySettings.$inferSelect;
export type InsertAgentAutonomySetting = typeof agentAutonomySettings.$inferInsert;

// ─── RALF Execution Logs (Reason → Act → Learn → Feedback) ─────────────────
export const ralfExecutionLogs = mysqlTable("ralf_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  agentId: int("agentId").notNull(),
  companyId: int("companyId"),
  phase: mysqlEnum("phase", ["reason", "act", "learn", "feedback"]).notNull(),
  input: text("input"),
  output: text("output"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  crossModelVerified: boolean("crossModelVerified").default(false).notNull(),
  verificationResult: text("verificationResult"),
  durationMs: int("durationMs"),
  tokenCost: decimal("tokenCost", { precision: 10, scale: 4 }).default("0"),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "skipped"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RalfExecutionLog = typeof ralfExecutionLogs.$inferSelect;
export type InsertRalfExecutionLog = typeof ralfExecutionLogs.$inferInsert;

// ─── Sub-Agent Recommendations ──────────────────────────────────────────────
export const subAgentRecommendations = mysqlTable("sub_agent_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  executiveAgentId: int("executiveAgentId").notNull(),
  recommendedName: varchar("recommendedName", { length: 128 }).notNull(),
  recommendedType: varchar("recommendedType", { length: 64 }).notNull(),
  roleTitle: varchar("roleTitle", { length: 128 }),
  justification: text("justification"),
  requiredTools: json("requiredTools").$type<string[]>(),
  estimatedImpact: varchar("estimatedImpact", { length: 256 }),
  status: mysqlEnum("status", ["suggested", "approved", "deployed", "dismissed"]).default("suggested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SubAgentRecommendation = typeof subAgentRecommendations.$inferSelect;
export type InsertSubAgentRecommendation = typeof subAgentRecommendations.$inferInsert;

// ─── Integration Requests (user interest tracking for coming soon/planned) ──
export const integrationRequests = mysqlTable("integration_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerName: varchar("providerName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IntegrationRequest = typeof integrationRequests.$inferSelect;
export type InsertIntegrationRequest = typeof integrationRequests.$inferInsert;

// ─── Executive Context Manifests ─────────────────────────────────────────────
// Stores the declared data sources each executive agent accessed during its
// last context assembly. Sub-agents inherit this manifest so they operate
// within the same data frame without re-assembling context from scratch.
export const executiveContextManifests = mysqlTable("executive_context_manifests", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  // Which executive type owns this manifest (ceo | cmo | cto | cfo)
  executiveType: varchar("executiveType", { length: 16 }),
  // JSON array of data source slugs this executive declared access to
  dataSources: json("dataSources").$type<string[]>().notNull(),
  // Compact text summary of what was found — passed to sub-agents as context header
  contextSummary: text("contextSummary"),
  // Raw liveState snapshot (JSON) for sub-agent inheritance
  liveStateSnapshot: json("liveStateSnapshot").$type<Record<string, unknown>>(),
  assembledAt: timestamp("assembledAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExecutiveContextManifest = typeof executiveContextManifests.$inferSelect;
export type InsertExecutiveContextManifest = typeof executiveContextManifests.$inferInsert;


// ─── Action Items (Intent Engine) ──────────────────────────────────────────────
export const actionItems = mysqlTable("action_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  actionText: text("actionText").notNull(),
  context: text("context"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium").notNull(),
  options: json("options").$type<{
    recommended: { text: string; reasoning: string };
    conservative: { text: string; reasoning: string };
    aggressive: { text: string; reasoning: string };
  }>().notNull(),
  selectedOption: mysqlEnum("selectedOption", ["recommended", "conservative", "aggressive"]),
  status: mysqlEnum("status", ["pending", "approved", "dismissed", "executed", "failed"]).default("pending").notNull(),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

// ─── Overnight Changes (Morning Briefing) ──────────────────────────────────────
export const overnightChanges = mysqlTable("overnight_changes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  changeType: varchar("changeType", { length: 64 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  dataSource: varchar("dataSource", { length: 128 }),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  actionRequired: boolean("actionRequired").default(false).notNull(),
  actionItemId: int("actionItemId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OvernightChange = typeof overnightChanges.$inferSelect;
export type InsertOvernightChange = typeof overnightChanges.$inferInsert;

// ─── Strategy Cards (Morning Briefing) ─────────────────────────────────────────
export const strategyCards = mysqlTable("strategy_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  title: varchar("title", { length: 256 }).notNull(),
  recommendation: text("recommendation").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium").notNull(),
  context: text("context"),
  actionItemId: int("actionItemId"),
  status: mysqlEnum("status", ["pending", "approved", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StrategyCard = typeof strategyCards.$inferSelect;
export type InsertStrategyCard = typeof strategyCards.$inferInsert;

// ─── Completed Work (ROI Dashboard) ────────────────────────────────────────────
export const completedWork = mysqlTable("completed_work", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  taskDescription: text("taskDescription").notNull(),
  timeSavedHours: decimal("timeSavedHours", { precision: 8, scale: 2 }).notNull(),
  laborValueUsd: decimal("laborValueUsd", { precision: 12, scale: 2 }).notNull(),
  costIncurredUsd: decimal("costIncurredUsd", { precision: 10, scale: 2 }).default("0"),
  netValueUsd: decimal("netValueUsd", { precision: 12, scale: 2 }).notNull(),
  outcome: text("outcome"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompletedWork = typeof completedWork.$inferSelect;
export type InsertCompletedWork = typeof completedWork.$inferInsert;

// ─── Blueprint Model Evaluations (Premium Model Evaluator) ────────────────────
export const blueprintModelEvaluations = mysqlTable("blueprint_model_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  userId: int("userId").notNull(),
  modelName: varchar("modelName", { length: 128 }).notNull(),
  qualityScore: decimal("qualityScore", { precision: 3, scale: 2 }).notNull(),
  speedMs: int("speedMs").notNull(),
  costPerRun: decimal("costPerRun", { precision: 10, scale: 6 }).notNull(),
  recommendedModel: boolean("recommendedModel").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlueprintModelEvaluation = typeof blueprintModelEvaluations.$inferSelect;
export type InsertBlueprintModelEvaluation = typeof blueprintModelEvaluations.$inferInsert;


// ─── Emails (Linq Integration) ──────────────────────────────────────────────
export const emails = mysqlTable("emails", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 255 }).notNull(),
  threadId: varchar("threadId", { length: 255 }),
  from: varchar("from", { length: 255 }).notNull(),
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(),
  htmlBody: text("htmlBody"),
  attachmentsJson: text("attachmentsJson"),
  timestamp: timestamp("timestamp").notNull(),
  status: varchar("status", { length: 50 }).default("received").notNull(),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

// ─── Website Audits (Background analysis during onboarding) ─────────────────
export const websiteAudits = mysqlTable("website_audits", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["pending", "scraping", "analyzing", "complete", "failed"]).default("pending").notNull(),

  // ── Metadata & SEO ──
  pageTitle: varchar("pageTitle", { length: 512 }),
  metaDescription: text("metaDescription"),
  ogTags: json("ogTags").$type<Record<string, string>>(),
  canonicalUrl: varchar("canonicalUrl", { length: 512 }),
  language: varchar("language", { length: 16 }),
  favicon: varchar("favicon", { length: 512 }),

  // ── Technical SEO ──
  hasRobotsTxt: boolean("hasRobotsTxt"),
  hasSitemapXml: boolean("hasSitemapXml"),
  isHttps: boolean("isHttps"),
  responseTimeMs: int("responseTimeMs"),
  securityHeaders: json("securityHeaders").$type<Record<string, string | boolean>>(),
  seoIssues: json("seoIssues").$type<string[]>(),

  // ── Social Presence ──
  socialLinks: json("socialLinks").$type<Record<string, string>>(),

  // ── Tech Stack ──
  detectedTech: json("detectedTech").$type<{ frameworks: string[]; analytics: string[]; adPixels: string[]; crm: string[]; other: string[] }>(),

  // ── LLM Content Analysis ──
  llmAnalysis: json("llmAnalysis").$type<{
    valueProposition: string;
    targetAudience: string;
    competitivePositioning: string;
    toneOfVoice: string;
    keyProducts: string[];
    likelyCompetitors: string[];
    marketInsights: string;
  }>(),

  // ── Summary for executive agents ──
  executiveSummary: text("executiveSummary"),

  errorMessage: text("errorMessage"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebsiteAudit = typeof websiteAudits.$inferSelect;
export type InsertWebsiteAudit = typeof websiteAudits.$inferInsert;

// ─── Quick Start Results (Shareable) ─────────────────────────────────────────
export const quickStartResults = mysqlTable("quick_start_results", {
  id: int("id").autoincrement().primaryKey(),
  shareId: varchar("shareId", { length: 32 }).notNull().unique(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }),
  companyName: varchar("companyName", { length: 256 }).notNull(),
  website: varchar("website", { length: 512 }).notNull(),
  industry: varchar("industry", { length: 128 }),
  recommendation: text("recommendation"),
  auditSummary: text("auditSummary"),
  seoScore: int("seoScore"),
  techStack: json("techStack"),
  socialPresence: json("socialPresence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuickStartResult = typeof quickStartResults.$inferSelect;
export type InsertQuickStartResult = typeof quickStartResults.$inferInsert;

// ─── Onboarding Surveys (Post-Demo Feedback) ─────────────────────────────────
export const onboardingSurveys = mysqlTable("onboarding_surveys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  companyId: int("companyId"),
  thumbs: mysqlEnum("thumbs", ["up", "down"]).notNull(),
  questions: json("questions"), // LLM-generated questions array
  responses: json("responses"), // user answers array
  briefingFrequency: varchar("briefingFrequency", { length: 32 }),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OnboardingSurvey = typeof onboardingSurveys.$inferSelect;
export type InsertOnboardingSurvey = typeof onboardingSurveys.$inferInsert;

// ─── Guest Sessions (No-Auth Onboarding) ─────────────────────────────────────
export const guestSessions = mysqlTable("guest_sessions", {
  id: int("id").autoincrement().primaryKey(),
  guestToken: varchar("guestToken", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }),
  email: varchar("email", { length: 320 }),
  companyId: int("companyId"),
  onboardingId: int("onboardingId"),
  recommendations: json("recommendations"),
  surveyId: int("surveyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertGuestSession = typeof guestSessions.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// Σ INTENT ENGINE — BLUEPRINT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Blueprint Templates (Reusable, Publishable, Marketplace-Ready) ──────────
export const blueprintTemplates = mysqlTable("blueprint_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),

  // Identity
  ticker: varchar("ticker", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "growth", "brand", "retention", "launch", "performance",
    "operations", "engineering", "sales", "support", "custom"
  ]).default("custom").notNull(),
  version: varchar("version", { length: 32 }).default("1.0.0").notNull(),

  // Blueprint content (the full graph definition)
  objective: text("objective").notNull(),
  desiredFinalState: text("desiredFinalState"),
  constraints: json("constraints").$type<string[]>(),
  nonGoals: json("nonGoals").$type<string[]>(),
  successMetrics: json("successMetrics").$type<{ metric: string; target: string; verificationMethod: string }[]>(),
  estimatedRuntime: varchar("estimatedRuntime", { length: 64 }),

  // Graph structure (React Flow serialized)
  nodes: json("nodes").$type<{
    id: string;
    type: string; // 'agent' | 'workflow' | 'tool' | 'data' | 'guardrail' | 'gate'
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }[]>(),
  edges: json("edges").$type<{
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
    data?: Record<string, unknown>;
  }[]>(),

  // Marketplace
  visibility: mysqlEnum("visibility", ["private", "shared", "marketplace"]).default("private").notNull(),
  price: int("price").default(0).notNull(), // cents
  stripeProductId: varchar("stripeProductId", { length: 128 }),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  isApproved: boolean("isApproved").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  usageCount: int("usageCount").default(0).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  ratingCount: int("ratingCount").default(0).notNull(),

  // Status
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlueprintTemplate = typeof blueprintTemplates.$inferSelect;
export type InsertBlueprintTemplate = typeof blueprintTemplates.$inferInsert;

// ─── Blueprint Agents (Nodes of type 'agent' in the graph) ───────────────────
export const blueprintAgents = mysqlTable("blueprint_agents", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  nodeId: varchar("nodeId", { length: 64 }).notNull(), // matches React Flow node id

  name: varchar("name", { length: 128 }).notNull(),
  role: varchar("role", { length: 256 }).notNull(),
  mission: text("mission"),

  // Autonomy
  autonomyLevel: mysqlEnum("autonomyLevel", ["L0", "L1", "L2", "L3"]).default("L1").notNull(),

  // Tools (structured)
  tools: json("tools").$type<{
    name: string;
    source: string;
    permission: "read" | "write" | "execute";
  }[]>(),

  // Guardrails (structured)
  guardrails: json("guardrails").$type<{
    severity: "standard" | "warning" | "hard_stop";
    title: string;
    description: string;
  }[]>(),

  // Scope & Permissions
  allowedActions: json("allowedActions").$type<string[]>(),
  forbiddenActions: json("forbiddenActions").$type<string[]>(),
  confirmationTriggers: json("confirmationTriggers").$type<string[]>(),
  invariants: json("invariants").$type<string[]>(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlueprintAgent = typeof blueprintAgents.$inferSelect;
export type InsertBlueprintAgent = typeof blueprintAgents.$inferInsert;

// ─── Blueprint Workflows (Execution steps / edges with logic) ────────────────
export const blueprintWorkflows = mysqlTable("blueprint_workflows", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  edgeId: varchar("edgeId", { length: 64 }).notNull(), // matches React Flow edge id

  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  triggerCondition: text("triggerCondition"), // when this workflow fires
  inputSchema: json("inputSchema").$type<Record<string, unknown>>(),
  outputSchema: json("outputSchema").$type<Record<string, unknown>>(),

  // Execution order within the graph
  sequenceOrder: int("sequenceOrder").default(0).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlueprintWorkflow = typeof blueprintWorkflows.$inferSelect;
export type InsertBlueprintWorkflow = typeof blueprintWorkflows.$inferInsert;

// ─── Blueprint Goals (/goal contracts assigned to agents within a blueprint) ─
export const blueprintGoals = mysqlTable("blueprint_goals", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  agentNodeId: varchar("agentNodeId", { length: 64 }).notNull(), // which agent owns this goal

  // 8-section /goal contract
  agentRole: varchar("agentRole", { length: 256 }).notNull(),
  objective: text("objective").notNull(),
  desiredFinalState: text("desiredFinalState"),
  context: json("context").$type<{
    background: string;
    resources: string[];
    assumptions: string[];
    nonGoals: string[];
  }>(),
  scope: json("scope").$type<{
    allowed: string[];
    forbidden: string[];
    confirmationRequired: string[];
    invariants: string[];
  }>(),
  verification: json("verification").$type<{
    criteria: string[];
    commands: string[];
    evidence: string[];
    artifacts: string[];
  }>(),
  iterationPolicy: text("iterationPolicy"),
  escalation: json("escalation").$type<{
    retryLimit: number;
    pauseTriggers: string[];
    maxIterations: number;
  }>(),
  outputRequirements: json("outputRequirements").$type<{
    format: string;
    includes: string[];
    style: string;
  }>(),
  stopCondition: json("stopCondition").$type<string[]>(),

  // Verification status
  verificationStatus: mysqlEnum("verificationStatus", [
    "unverified", "pending_review", "verified", "rejected"
  ]).default("unverified").notNull(),
  verifier1Result: json("verifier1Result").$type<{
    model: string;
    passed: boolean;
    reasoning: string;
    verifiedAt: string;
  }>(),
  verifier2Result: json("verifier2Result").$type<{
    model: string;
    passed: boolean;
    reasoning: string;
    verifiedAt: string;
  }>(),

  status: mysqlEnum("status", ["draft", "active", "in_progress", "completed", "failed"]).default("draft").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlueprintGoal = typeof blueprintGoals.$inferSelect;
export type InsertBlueprintGoal = typeof blueprintGoals.$inferInsert;

// ─── Blueprint Chat Sessions (Σ interview to generate a blueprint) ───────────
export const blueprintChatSessions = mysqlTable("blueprint_chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  blueprintId: int("blueprintId"), // null until blueprint is generated

  // Conversation
  messages: json("messages").$type<{ role: "user" | "assistant" | "system"; content: string; timestamp: string }[]>(),

  // Σ internal state
  populatedFields: json("populatedFields").$type<Record<string, unknown>>(),
  inferredValues: json("inferredValues").$type<Record<string, unknown>>(),
  confidenceScores: json("confidenceScores").$type<Record<string, number>>(),
  completionPercent: int("completionPercent").default(0).notNull(),

  status: mysqlEnum("status", ["interviewing", "generating", "complete", "abandoned"]).default("interviewing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlueprintChatSession = typeof blueprintChatSessions.$inferSelect;
export type InsertBlueprintChatSession = typeof blueprintChatSessions.$inferInsert;

// ─── Blueprint Purchases (Marketplace transactions) ──────────────────────────
export const blueprintPurchases = mysqlTable("blueprint_purchases", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull(),
  buyerUserId: int("buyerUserId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),
  price: int("price").notNull(), // cents at time of purchase
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "completed", "refunded"]).default("pending").notNull(),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type BlueprintPurchase = typeof blueprintPurchases.$inferSelect;
export type InsertBlueprintPurchase = typeof blueprintPurchases.$inferInsert;

// ─── Blueprint Instances (A user's active copy of a template) ────────────────
export const blueprintInstances = mysqlTable("blueprint_instances", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),

  // Instance-specific overrides (user edits after generation)
  title: varchar("title", { length: 256 }),
  nodes: json("nodes").$type<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }[]>(),
  edges: json("edges").$type<{
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
    data?: Record<string, unknown>;
  }[]>(),

  // Execution state
  status: mysqlEnum("status", ["configuring", "ready", "running", "paused", "completed", "failed"]).default("configuring").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlueprintInstance = typeof blueprintInstances.$inferSelect;
export type InsertBlueprintInstance = typeof blueprintInstances.$inferInsert;

// ─── Model Execution Tracking ────────────────────────────────────────────────

export const modelExecutionLogs = mysqlTable("model_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  blueprintId: int("blueprintId"),
  modelId: varchar("modelId", { length: 64 }).notNull(),
  workflowRole: mysqlEnum("workflowRole", ["coordinator", "implementer", "verifier", "fixer", "web_research", "vision", "computer_use", "bulk_worker"]),
  taskCategory: varchar("taskCategory", { length: 64 }),
  inputTokens: int("inputTokens").default(0).notNull(),
  outputTokens: int("outputTokens").default(0).notNull(),
  latencyMs: int("latencyMs").default(0).notNull(),
  costUsd: decimal("costUsd", { precision: 10, scale: 6 }).default("0").notNull(),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  qualityScore: decimal("qualityScore", { precision: 3, scale: 2 }),
  taskDescription: varchar("taskDescription", { length: 512 }),
  executionContext: json("executionContext").$type<Record<string, unknown>>(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ModelExecutionLog = typeof modelExecutionLogs.$inferSelect;
export type InsertModelExecutionLog = typeof modelExecutionLogs.$inferInsert;

// ─── Agent Model Configuration ───────────────────────────────────────────────

export const agentModelConfigs = mysqlTable("agent_model_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  agentId: int("agentId"),
  blueprintId: int("blueprintId"),
  nodeId: varchar("nodeId", { length: 128 }),
  modelId: varchar("modelId", { length: 64 }).notNull(),
  workflowRole: mysqlEnum("workflowRole_amc", ["coordinator", "implementer", "verifier", "fixer", "web_research", "vision", "computer_use", "bulk_worker"]),
  maxTokens: int("maxTokens").default(4096),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  fallbackModelId: varchar("fallbackModelId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentModelConfig = typeof agentModelConfigs.$inferSelect;
export type InsertAgentModelConfig = typeof agentModelConfigs.$inferInsert;
