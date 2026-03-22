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

// ─── AI Agents ────────────────────────────────────────────────────────────────
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["ceo", "marketing", "research", "sales", "admin", "custom"]).notNull(),
  status: mysqlEnum("status", ["idle", "active", "paused", "error"]).default("idle").notNull(),
  description: text("description"),
  capabilities: json("capabilities").$type<string[]>(),
  resourceUsage: decimal("resourceUsage", { precision: 5, scale: 2 }).default("0"),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  totalValueCreated: decimal("totalValueCreated", { precision: 12, scale: 2 }).default("0"),
  isMarketplaceListing: boolean("isMarketplaceListing").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ─── OKRs ─────────────────────────────────────────────────────────────────────
export const okrs = mysqlTable("okrs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  objective: text("objective").notNull(),
  keyResult: text("keyResult").notNull(),
  targetValue: decimal("targetValue", { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal("currentValue", { precision: 12, scale: 2 }).default("0").notNull(),
  unit: varchar("unit", { length: 32 }).default("").notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["on_track", "at_risk", "achieved", "missed"]).default("on_track").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Okr = typeof okrs.$inferSelect;
export type InsertOkr = typeof okrs.$inferInsert;

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  intentObject: json("intentObject").$type<Record<string, unknown>>(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed", "awaiting_human"]).default("pending").notNull(),
  routingMode: mysqlEnum("routingMode", ["ai", "human", "hybrid"]).default("ai").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  estimatedHours: decimal("estimatedHours", { precision: 6, scale: 2 }),
  actualHours: decimal("actualHours", { precision: 6, scale: 2 }),
  generatedPrompt: text("generatedPrompt"),
  executionLog: json("executionLog").$type<string[]>(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Proof of Outcome Receipts ────────────────────────────────────────────────
export const pooReceipts = mysqlTable("poo_receipts", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  receiptNumber: varchar("receiptNumber", { length: 32 }).notNull().unique(),
  taskTitle: varchar("taskTitle", { length: 256 }).notNull(),
  outcome: text("outcome").notNull(),
  laborHoursSaved: decimal("laborHoursSaved", { precision: 8, scale: 2 }).notNull(),
  dollarValueCreated: decimal("dollarValueCreated", { precision: 12, scale: 2 }).notNull(),
  hourlyRateBenchmark: decimal("hourlyRateBenchmark", { precision: 8, scale: 2 }).default("150"),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "disputed"]).default("pending").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PooReceipt = typeof pooReceipts.$inferSelect;
export type InsertPooReceipt = typeof pooReceipts.$inferInsert;

// ─── Human-in-the-Loop Inbox ──────────────────────────────────────────────────
export const inboxItems = mysqlTable("inbox_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId"),
  agentId: int("agentId"),
  type: mysqlEnum("type", ["decision_required", "budget_approval", "task_review", "alert", "poo_generated"]).notNull(),
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

// ─── Marketplace Listings ─────────────────────────────────────────────────────
export const marketplaceListings = mysqlTable("marketplace_listings", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  tier: mysqlEnum("tier", ["solo_founder", "enterprise", "custom"]).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 256 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  pricingModel: mysqlEnum("pricingModel", ["monthly", "annual", "usage", "value_capture"]).default("monthly").notNull(),
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

// ─── Creator Partnerships ─────────────────────────────────────────────────────
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorPartnership = typeof creatorPartnerships.$inferSelect;
export type InsertCreatorPartnership = typeof creatorPartnerships.$inferInsert;

// ─── Decision Log (Memory Engine) ─────────────────────────────────────────────
export const decisionLog = mysqlTable("decision_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  taskId: int("taskId"),
  decisionType: varchar("decisionType", { length: 64 }).notNull(),
  context: text("context"),
  decision: text("decision").notNull(),
  rationale: text("rationale"),
  outcome: text("outcome"),
  wasSuccessful: boolean("wasSuccessful"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DecisionLogEntry = typeof decisionLog.$inferSelect;
export type InsertDecisionLogEntry = typeof decisionLog.$inferInsert;
