import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agents, InsertAgent,
  okrs, InsertOkr,
  tasks, InsertTask,
  pooReceipts, InsertPooReceipt,
  inboxItems, InsertInboxItem,
  marketplaceListings, InsertMarketplaceListing,
  creatorPartnerships, InsertCreatorPartnership,
  decisionLog, InsertDecisionLogEntry,
  companies, InsertCompany,
  departments, InsertDepartment,
  agentCapabilities, InsertAgentCapability,
  taskThreads, InsertTaskThread,
  heartbeatLog, InsertHeartbeatLogEntry,
  approvalGates, InsertApprovalGate,
  blueprints, InsertBlueprint,
  blueprintReviews, InsertBlueprintReview,
  blueprintDeployments, InsertBlueprintDeployment,
  skills, InsertSkill,
  toolRegistry, InsertToolRegistryEntry,
  webhooks, InsertWebhook,
  auditLog, InsertAuditLogEntry,
  projects, InsertProject,
  projectFiles, InsertProjectFile,
  projectChats, InsertProjectChat,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => { const value = user[field]; if (value === undefined) return; const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized; };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Companies ───────────────────────────────────────────────────────────────
export async function getCompaniesByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(companies).where(eq(companies.userId, userId)).orderBy(desc(companies.createdAt));
}
export async function getCompanyById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return r[0];
}
export async function createCompany(data: InsertCompany) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(companies).values(data);
}
export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id));
}
export async function getCompanyPnL(companyId: number) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalCosts: 0, netProfit: 0, receiptCount: 0 };
  const rev = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${pooReceipts.dollarValueCreated}), 0)`,
    totalCosts: sql<number>`COALESCE(SUM(${pooReceipts.costIncurred}), 0)`,
    receiptCount: sql<number>`COUNT(*)`,
  }).from(pooReceipts).where(eq(pooReceipts.companyId, companyId));
  const r = rev[0] ?? { totalRevenue: 0, totalCosts: 0, receiptCount: 0 };
  return { ...r, netProfit: Number(r.totalRevenue) - Number(r.totalCosts) };
}

// ─── Departments ─────────────────────────────────────────────────────────────
export async function getDepartmentsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(departments).where(eq(departments.companyId, companyId));
}
export async function createDepartment(data: InsertDepartment) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(departments).values(data);
}
export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(departments).set(data).where(eq(departments.id, id));
}
export async function deleteDepartment(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(departments).where(eq(departments.id, id));
}

// ─── Agents ──────────────────────────────────────────────────────────────────
export async function getAgentsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt));
}
export async function getAgentsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agents).where(eq(agents.companyId, companyId)).orderBy(desc(agents.createdAt));
}
export async function getAgentById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return r[0];
}
export async function createAgent(data: InsertAgent) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(agents).values(data);
}
export async function updateAgentStatus(id: number, status: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(agents).set({ status: status as any, updatedAt: new Date() }).where(eq(agents.id, id));
}
export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(agents).set({ ...data, updatedAt: new Date() }).where(eq(agents.id, id));
}
export async function deleteAgent(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(agents).where(eq(agents.id, id));
}

// ─── Agent Capabilities ──────────────────────────────────────────────────────
export async function getCapabilitiesByAgentId(agentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentCapabilities).where(eq(agentCapabilities.agentId, agentId));
}
export async function createAgentCapability(data: InsertAgentCapability) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(agentCapabilities).values(data);
}
export async function deleteAgentCapability(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(agentCapabilities).where(eq(agentCapabilities.id, id));
}

// ─── OKRs ────────────────────────────────────────────────────────────────────
export async function getOkrsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(okrs).where(eq(okrs.userId, userId)).orderBy(desc(okrs.createdAt));
}
export async function getOkrsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(okrs).where(eq(okrs.companyId, companyId)).orderBy(desc(okrs.createdAt));
}
export async function createOkr(data: InsertOkr) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(okrs).values(data);
}
export async function updateOkrProgress(id: number, currentValue: string, status: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(okrs).set({ currentValue, status: status as any, updatedAt: new Date() }).where(eq(okrs.id, id));
}
export async function deleteOkr(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(okrs).where(eq(okrs.id, id));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export async function getTasksByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
}
export async function getTasksByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(desc(tasks.createdAt));
}
export async function getTaskById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return r[0];
}
export async function createTask(data: InsertTask) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(tasks).values(data);
}
export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id));
}

// ─── Task Threads ────────────────────────────────────────────────────────────
export async function getThreadsByTaskId(taskId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(taskThreads).where(eq(taskThreads.taskId, taskId)).orderBy(taskThreads.createdAt);
}
export async function createTaskThread(data: InsertTaskThread) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(taskThreads).values(data);
}

// ─── Heartbeat Log ───────────────────────────────────────────────────────────
export async function getHeartbeatLogByAgentId(agentId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(heartbeatLog).where(eq(heartbeatLog.agentId, agentId)).orderBy(desc(heartbeatLog.createdAt)).limit(limit);
}
export async function getHeartbeatLogByCompanyId(companyId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(heartbeatLog).where(eq(heartbeatLog.companyId, companyId)).orderBy(desc(heartbeatLog.createdAt)).limit(limit);
}
export async function createHeartbeatLogEntry(data: InsertHeartbeatLogEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(heartbeatLog).values(data);
}

// ─── PoO Receipts ────────────────────────────────────────────────────────────
export async function getPooReceiptsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pooReceipts).where(eq(pooReceipts.userId, userId)).orderBy(desc(pooReceipts.createdAt));
}

export async function getPooReceiptByNumber(receiptNumber: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(pooReceipts).where(eq(pooReceipts.receiptNumber, receiptNumber)).limit(1);
  return result.length > 0 ? result[0] : null;
}
export async function createPooReceipt(data: InsertPooReceipt) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(pooReceipts).values(data);
}
export async function getPooSummaryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return { totalValue: 0, totalHours: 0, totalReceipts: 0, totalCosts: 0 };
  const result = await db.select({
    totalValue: sql<number>`COALESCE(SUM(${pooReceipts.dollarValueCreated}), 0)`,
    totalHours: sql<number>`COALESCE(SUM(${pooReceipts.laborHoursSaved}), 0)`,
    totalReceipts: sql<number>`COUNT(*)`,
    totalCosts: sql<number>`COALESCE(SUM(${pooReceipts.costIncurred}), 0)`,
  }).from(pooReceipts).where(eq(pooReceipts.userId, userId));
  return result[0] ?? { totalValue: 0, totalHours: 0, totalReceipts: 0, totalCosts: 0 };
}

// ─── Inbox Items ─────────────────────────────────────────────────────────────
export async function getInboxItemsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(inboxItems).where(eq(inboxItems.userId, userId)).orderBy(desc(inboxItems.createdAt));
}
export async function createInboxItem(data: InsertInboxItem) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(inboxItems).values(data);
}
export async function resolveInboxItem(id: number, resolution: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "resolved", resolution, resolvedAt: new Date() }).where(eq(inboxItems.id, id));
}
export async function dismissInboxItem(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "dismissed" }).where(eq(inboxItems.id, id));
}
export async function markInboxItemRead(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "read" }).where(and(eq(inboxItems.id, id), eq(inboxItems.status, "unread")));
}

// ─── Approval Gates ──────────────────────────────────────────────────────────
export async function getApprovalGatesByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(approvalGates).where(eq(approvalGates.companyId, companyId));
}
export async function createApprovalGate(data: InsertApprovalGate) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(approvalGates).values(data);
}
export async function updateApprovalGate(id: number, data: Partial<InsertApprovalGate>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(approvalGates).set(data).where(eq(approvalGates.id, id));
}
export async function deleteApprovalGate(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(approvalGates).where(eq(approvalGates.id, id));
}

// ─── Blueprints ──────────────────────────────────────────────────────────────
export async function getActiveBlueprints() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blueprints).where(eq(blueprints.isActive, true)).orderBy(desc(blueprints.totalDeployments));
}
export async function getBlueprintById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(blueprints).where(eq(blueprints.id, id)).limit(1);
  return r[0];
}
export async function getBlueprintsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blueprints).where(eq(blueprints.creatorUserId, userId)).orderBy(desc(blueprints.createdAt));
}
export async function createBlueprint(data: InsertBlueprint) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(blueprints).values(data);
}
export async function updateBlueprint(id: number, data: Partial<InsertBlueprint>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(blueprints).set({ ...data, updatedAt: new Date() }).where(eq(blueprints.id, id));
}

// ─── Blueprint Reviews ───────────────────────────────────────────────────────
export async function getReviewsByBlueprintId(blueprintId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blueprintReviews).where(eq(blueprintReviews.blueprintId, blueprintId)).orderBy(desc(blueprintReviews.createdAt));
}
export async function createBlueprintReview(data: InsertBlueprintReview) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(blueprintReviews).values(data);
}

// ─── Blueprint Deployments ───────────────────────────────────────────────────
export async function getDeploymentsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blueprintDeployments).where(eq(blueprintDeployments.userId, userId)).orderBy(desc(blueprintDeployments.createdAt));
}
export async function getDeploymentsByBlueprintId(blueprintId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blueprintDeployments).where(eq(blueprintDeployments.blueprintId, blueprintId));
}
export async function createBlueprintDeployment(data: InsertBlueprintDeployment) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(blueprintDeployments).values(data);
}
export async function updateBlueprintDeployment(id: number, data: Partial<InsertBlueprintDeployment>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(blueprintDeployments).set({ ...data, updatedAt: new Date() }).where(eq(blueprintDeployments.id, id));
}

// ─── Marketplace ─────────────────────────────────────────────────────────────
export async function getMarketplaceListings(listingType?: string) {
  const db = await getDb(); if (!db) return [];
  if (listingType) {
    return db.select().from(marketplaceListings).where(and(eq(marketplaceListings.isActive, true), eq(marketplaceListings.listingType, listingType as any))).orderBy(desc(marketplaceListings.totalPurchases));
  }
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.isActive, true)).orderBy(desc(marketplaceListings.totalPurchases));
}
export async function getMarketplaceListingById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id)).limit(1);
  return r[0];
}
export async function createMarketplaceListing(data: InsertMarketplaceListing) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(marketplaceListings).values(data);
}

// ─── Skills ──────────────────────────────────────────────────────────────────
export async function getActiveSkills() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(skills).where(eq(skills.isActive, true)).orderBy(desc(skills.totalInstalls));
}
export async function getSkillById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  return r[0];
}
export async function createSkill(data: InsertSkill) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(skills).values(data);
}

// ─── Tool Registry ───────────────────────────────────────────────────────────
export async function getToolsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(toolRegistry).where(eq(toolRegistry.companyId, companyId));
}
export async function createToolRegistryEntry(data: InsertToolRegistryEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(toolRegistry).values(data);
}
export async function updateToolRegistryEntry(id: number, data: Partial<InsertToolRegistryEntry>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(toolRegistry).set(data).where(eq(toolRegistry.id, id));
}
export async function deleteToolRegistryEntry(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(toolRegistry).where(eq(toolRegistry.id, id));
}

// ─── Webhooks ────────────────────────────────────────────────────────────────
export async function getWebhooksByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(webhooks).where(eq(webhooks.companyId, companyId));
}
export async function createWebhook(data: InsertWebhook) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(webhooks).values(data);
}
export async function updateWebhook(id: number, data: Partial<InsertWebhook>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(webhooks).set(data).where(eq(webhooks.id, id));
}
export async function deleteWebhook(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(webhooks).where(eq(webhooks.id, id));
}

// ─── Creator Partnerships ────────────────────────────────────────────────────
export async function getCreatorPartnerships() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(creatorPartnerships).orderBy(desc(creatorPartnerships.createdAt));
}
export async function createCreatorPartnership(data: InsertCreatorPartnership) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(creatorPartnerships).values(data);
}

// ─── Decision Log ────────────────────────────────────────────────────────────
export async function getDecisionLogByUserId(userId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(decisionLog).where(eq(decisionLog.userId, userId)).orderBy(desc(decisionLog.createdAt)).limit(limit);
}
export async function createDecisionLogEntry(data: InsertDecisionLogEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(decisionLog).values(data);
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export async function getAuditLogByCompanyId(companyId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(auditLog).where(eq(auditLog.companyId, companyId)).orderBy(desc(auditLog.createdAt)).limit(limit);
}
export async function createAuditLogEntry(data: InsertAuditLogEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(auditLog).values(data);
}

// ─── Tool Categories ────────────────────────────────────────────────────────
import {
  toolCategories, InsertToolCategory,
  toolProviders, InsertToolProvider,
  userConnections, InsertUserConnection,
  abstractionMappings, InsertAbstractionMapping,
  contextObjects, InsertContextObject,
  agentRequiredCategories, InsertAgentRequiredCategory,
} from "../drizzle/schema";

export async function getAllToolCategories() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(toolCategories).orderBy(toolCategories.name);
}
export async function getToolCategoryById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(toolCategories).where(eq(toolCategories.id, id)).limit(1);
  return r[0];
}
export async function getToolCategoryBySlug(slug: string) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(toolCategories).where(eq(toolCategories.slug, slug)).limit(1);
  return r[0];
}
export async function createToolCategory(data: InsertToolCategory) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(toolCategories).values(data);
}
export async function seedToolCategories() {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const existing = await db.select().from(toolCategories);
  if (existing.length > 0) return existing;
  const categories: InsertToolCategory[] = [
    { slug: "crm", name: "CRM", description: "Customer Relationship Management — manage contacts, deals, and pipelines", icon: "Users", abstractActions: JSON.parse('["read_pipeline","get_deals","create_contact","update_deal_stage","search_contacts","get_deal_value"]') as any },
    { slug: "email_marketing", name: "Email Marketing", description: "Create campaigns, manage subscribers, and track engagement", icon: "Mail", abstractActions: JSON.parse('["get_campaign_stats","create_campaign","add_subscriber","get_open_rates","get_click_rates","list_segments"]') as any },
    { slug: "analytics", name: "Analytics", description: "Web and product analytics — traffic, conversions, user behavior", icon: "BarChart3", abstractActions: JSON.parse('["get_traffic","get_top_pages","get_conversions","get_referral_sources","get_bounce_rate","get_user_segments"]') as any },
    { slug: "project_mgmt", name: "Project Management", description: "Task tracking, project planning, and team workload management", icon: "Kanban", abstractActions: JSON.parse('["create_task","get_active_projects","update_status","get_team_workload","list_sprints","get_overdue_tasks"]') as any },
    { slug: "payments", name: "Payments", description: "Payment processing, subscriptions, and revenue tracking", icon: "CreditCard", abstractActions: JSON.parse('["get_revenue","get_subscriptions","get_churn_rate","get_mrr","get_recent_transactions","get_failed_payments"]') as any },
    { slug: "communication", name: "Communication", description: "Team messaging, channels, and notifications", icon: "MessageSquare", abstractActions: JSON.parse('["send_message","get_channel_history","create_channel","list_channels","search_messages","get_unread_count"]') as any },
    { slug: "personal_email", name: "Personal Email", description: "Email inbox management — send, search, and organize", icon: "Inbox", abstractActions: JSON.parse('["send_email","search_inbox","get_recent_threads","get_unread","create_draft","add_label"]') as any },
    { slug: "ecommerce", name: "E-commerce", description: "Online store management — orders, inventory, and products", icon: "ShoppingCart", abstractActions: JSON.parse('["get_orders","get_inventory","get_top_products","update_listing","get_revenue_by_product","get_abandoned_carts"]') as any },
  ];
  await db.insert(toolCategories).values(categories);
  return db.select().from(toolCategories);
}

// ─── Tool Providers ─────────────────────────────────────────────────────────
export async function getProvidersByCategoryId(categoryId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(toolProviders).where(eq(toolProviders.categoryId, categoryId));
}
export async function getAllToolProviders() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(toolProviders).orderBy(toolProviders.name);
}
export async function getToolProviderById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(toolProviders).where(eq(toolProviders.id, id)).limit(1);
  return r[0];
}
export async function createToolProvider(data: InsertToolProvider) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(toolProviders).values(data);
}
export async function seedToolProviders(categories: { id: number; slug: string }[]) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const existing = await db.select().from(toolProviders);
  if (existing.length > 0) return existing;
  const catMap = Object.fromEntries(categories.map(c => [c.slug, c.id]));
  const providers: InsertToolProvider[] = [
    { categoryId: catMap["crm"], slug: "hubspot", name: "HubSpot", description: "All-in-one CRM platform", authType: "oauth2", baseApiUrl: "https://api.hubapi.com" },
    { categoryId: catMap["crm"], slug: "salesforce", name: "Salesforce", description: "Enterprise CRM leader", authType: "oauth2", baseApiUrl: "https://login.salesforce.com" },
    { categoryId: catMap["crm"], slug: "pipedrive", name: "Pipedrive", description: "Sales-focused CRM", authType: "oauth2", baseApiUrl: "https://api.pipedrive.com" },
    { categoryId: catMap["crm"], slug: "close", name: "Close", description: "CRM built for sales teams", authType: "api_key", baseApiUrl: "https://api.close.com" },
    { categoryId: catMap["email_marketing"], slug: "mailchimp", name: "Mailchimp", description: "Email marketing platform", authType: "oauth2", baseApiUrl: "https://server.api.mailchimp.com" },
    { categoryId: catMap["email_marketing"], slug: "klaviyo", name: "Klaviyo", description: "E-commerce email marketing", authType: "api_key", baseApiUrl: "https://a.klaviyo.com" },
    { categoryId: catMap["email_marketing"], slug: "convertkit", name: "ConvertKit", description: "Creator email marketing", authType: "api_key", baseApiUrl: "https://api.convertkit.com" },
    { categoryId: catMap["analytics"], slug: "google_analytics", name: "Google Analytics", description: "Web analytics by Google", authType: "oauth2", baseApiUrl: "https://analyticsdata.googleapis.com" },
    { categoryId: catMap["analytics"], slug: "mixpanel", name: "Mixpanel", description: "Product analytics", authType: "api_key", baseApiUrl: "https://mixpanel.com/api" },
    { categoryId: catMap["analytics"], slug: "amplitude", name: "Amplitude", description: "Digital analytics platform", authType: "api_key", baseApiUrl: "https://amplitude.com/api" },
    { categoryId: catMap["project_mgmt"], slug: "notion", name: "Notion", description: "All-in-one workspace", authType: "oauth2", baseApiUrl: "https://api.notion.com" },
    { categoryId: catMap["project_mgmt"], slug: "asana", name: "Asana", description: "Work management platform", authType: "oauth2", baseApiUrl: "https://app.asana.com/api" },
    { categoryId: catMap["project_mgmt"], slug: "linear", name: "Linear", description: "Issue tracking for teams", authType: "oauth2", baseApiUrl: "https://api.linear.app" },
    { categoryId: catMap["payments"], slug: "stripe", name: "Stripe", description: "Payment infrastructure", authType: "api_key", baseApiUrl: "https://api.stripe.com" },
    { categoryId: catMap["payments"], slug: "square", name: "Square", description: "Commerce platform", authType: "oauth2", baseApiUrl: "https://connect.squareup.com" },
    { categoryId: catMap["communication"], slug: "slack", name: "Slack", description: "Team messaging platform", authType: "oauth2", baseApiUrl: "https://slack.com/api" },
    { categoryId: catMap["communication"], slug: "discord", name: "Discord", description: "Community platform", authType: "oauth2", baseApiUrl: "https://discord.com/api" },
    { categoryId: catMap["personal_email"], slug: "gmail", name: "Gmail", description: "Google email service", authType: "oauth2", baseApiUrl: "https://gmail.googleapis.com" },
    { categoryId: catMap["personal_email"], slug: "outlook", name: "Outlook", description: "Microsoft email service", authType: "oauth2", baseApiUrl: "https://graph.microsoft.com" },
    { categoryId: catMap["ecommerce"], slug: "shopify", name: "Shopify", description: "E-commerce platform", authType: "oauth2", baseApiUrl: "https://admin.shopify.com" },
    { categoryId: catMap["ecommerce"], slug: "woocommerce", name: "WooCommerce", description: "WordPress e-commerce", authType: "api_key", baseApiUrl: "https://woocommerce.com/wp-json" },
  ];
  await db.insert(toolProviders).values(providers);
  return db.select().from(toolProviders);
}

// ─── User Connections ───────────────────────────────────────────────────────
export async function getUserConnectionsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userConnections).where(eq(userConnections.userId, userId)).orderBy(desc(userConnections.createdAt));
}
export async function getUserConnectionsByCategory(userId: number, categoryId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userConnections).where(and(eq(userConnections.userId, userId), eq(userConnections.categoryId, categoryId), eq(userConnections.status, "connected")));
}
export async function createUserConnection(data: InsertUserConnection) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(userConnections).values(data);
}
export async function updateUserConnection(id: number, data: Partial<InsertUserConnection>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(userConnections).set({ ...data, updatedAt: new Date() }).where(eq(userConnections.id, id));
}
export async function disconnectUserConnection(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(userConnections).set({ status: "disconnected", updatedAt: new Date() }).where(eq(userConnections.id, id));
}

// ─── Abstraction Mappings ───────────────────────────────────────────────────
export async function getMappingsByCategoryId(categoryId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(abstractionMappings).where(eq(abstractionMappings.categoryId, categoryId));
}
export async function getMappingsByProviderId(providerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(abstractionMappings).where(eq(abstractionMappings.providerId, providerId));
}
export async function getMappingForAction(categoryId: number, providerId: number, action: string) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(abstractionMappings).where(and(
    eq(abstractionMappings.categoryId, categoryId),
    eq(abstractionMappings.providerId, providerId),
    eq(abstractionMappings.abstractAction, action),
    eq(abstractionMappings.isActive, true),
  )).limit(1);
  return r[0];
}
export async function createAbstractionMapping(data: InsertAbstractionMapping) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(abstractionMappings).values(data);
}

// ─── Context Objects ────────────────────────────────────────────────────────
export async function getContextObjectsByUserId(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(contextObjects).where(eq(contextObjects.userId, userId)).orderBy(desc(contextObjects.createdAt)).limit(limit);
}
export async function getContextObjectById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(contextObjects).where(eq(contextObjects.id, id)).limit(1);
  return r[0];
}
export async function createContextObject(data: InsertContextObject) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const result = await db.insert(contextObjects).values(data);
  return result;
}
export async function updateContextObject(id: number, data: Partial<InsertContextObject>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(contextObjects).set({ ...data, updatedAt: new Date() }).where(eq(contextObjects.id, id));
}

// ─── Agent Required Categories (Portability) ────────────────────────────────
export async function getRequiredCategoriesByAgentId(agentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentRequiredCategories).where(eq(agentRequiredCategories.agentId, agentId));
}
export async function getRequiredCategoriesByBlueprintId(blueprintId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentRequiredCategories).where(eq(agentRequiredCategories.blueprintId, blueprintId));
}
export async function getRequiredCategoriesByListingId(listingId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentRequiredCategories).where(eq(agentRequiredCategories.listingId, listingId));
}
export async function createAgentRequiredCategory(data: InsertAgentRequiredCategory) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(agentRequiredCategories).values(data);
}
export async function checkUserCompatibility(userId: number, requiredCategoryIds: number[]) {
  const db = await getDb(); if (!db) return { compatible: false, missing: requiredCategoryIds, connected: [] as number[] };
  const connections = await db.select().from(userConnections).where(and(eq(userConnections.userId, userId), eq(userConnections.status, "connected")));
  const connectedCategoryIds = Array.from(new Set(connections.map(c => c.categoryId)));
  const missing = requiredCategoryIds.filter(id => !connectedCategoryIds.includes(id));
  return { compatible: missing.length === 0, missing, connected: connectedCategoryIds };
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function getProjectsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}
export async function getProjectsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(desc(projects.createdAt));
}
export async function getProjectById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return r[0];
}
export async function createProject(data: InsertProject) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(projects).values(data);
}
export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}
export async function deleteProject(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(projects).where(eq(projects.id, id));
}

// ─── Project Files ────────────────────────────────────────────────────────────
export async function getProjectFiles(projectId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(desc(projectFiles.createdAt));
}
export async function createProjectFile(data: InsertProjectFile) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(projectFiles).values(data);
}
export async function deleteProjectFile(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.delete(projectFiles).where(eq(projectFiles.id, id));
}

// ─── Project Chats ────────────────────────────────────────────────────────────
export async function getProjectChats(projectId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(projectChats).where(eq(projectChats.projectId, projectId)).orderBy(projectChats.createdAt).limit(limit);
}
export async function createProjectChat(data: InsertProjectChat) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(projectChats).values(data);
}
