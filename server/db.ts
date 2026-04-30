import { eq, desc, and, sql, isNull, ne, inArray, asc, count } from "drizzle-orm";
import crypto from "crypto";
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
  agentOnboardings, InsertAgentOnboarding,
  strategyProposals, InsertStrategyProposal,
  waitlistEntries, InsertWaitlistEntry,
  briefingLogs, InsertBriefingLog,
  featureEvents, InsertFeatureEvent,
  userFeedback, InsertUserFeedback,
  onboardingWelcomeEmails,
  changelogEntries,
  pageViews, InsertPageView,
  userSessions, InsertUserSession,
  agentAutonomySettings, InsertAgentAutonomySetting,
  ralfExecutionLogs, InsertRalfExecutionLog,
  subAgentRecommendations, InsertSubAgentRecommendation,
  executiveContextManifests, InsertExecutiveContextManifest,
  websiteAudits, InsertWebsiteAudit,
} from "../drizzle/schema";
import type { InsertChangelogEntry } from "../drizzle/schema";
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

export async function getUserByIdForApproval(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    waitlistPosition: users.waitlistPosition,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUnsubscribeToken(token: string) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.emailUnsubscribeToken, token)).limit(1);
  return r[0];
}
export async function setUserUnsubscribeToken(userId: number, token: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ emailUnsubscribeToken: token }).where(eq(users.id, userId));
}
export async function unsubscribeUserByToken(token: string) {
  const db = await getDb(); if (!db) return false;
  const user = await getUserByUnsubscribeToken(token);
  if (!user) return false;
  await db.update(users).set({ emailUnsubscribed: true }).where(eq(users.id, user.id));
  return true;
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
export async function getOkrById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(okrs).where(eq(okrs.id, id)).limit(1);
  return r[0];
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
    { slug: "paid_ads", name: "Paid Advertising", description: "Paid ad campaigns — spend, performance, and audience insights", icon: "TrendingUp", abstractActions: JSON.parse('["get_campaigns","get_spend","get_conversions","get_audience","get_roas","get_top_ads"]') as any },
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
    { categoryId: catMap["analytics"], slug: "ga4", name: "Google Analytics 4", description: "GA4 web analytics", authType: "oauth2", baseApiUrl: "https://analyticsdata.googleapis.com" },
    { categoryId: catMap["analytics"], slug: "mixpanel", name: "Mixpanel", description: "Product analytics", authType: "api_key", baseApiUrl: "https://mixpanel.com/api" },
    { categoryId: catMap["analytics"], slug: "amplitude", name: "Amplitude", description: "Digital analytics platform", authType: "api_key", baseApiUrl: "https://amplitude.com/api" },
    { categoryId: catMap["paid_ads"], slug: "meta_ads", name: "Meta Ads", description: "Facebook & Instagram advertising", authType: "oauth2", baseApiUrl: "https://graph.facebook.com" },
    { categoryId: catMap["paid_ads"], slug: "google_ads", name: "Google Ads", description: "Google search and display advertising", authType: "oauth2", baseApiUrl: "https://googleads.googleapis.com" },
    { categoryId: catMap["paid_ads"], slug: "tiktok_ads", name: "TikTok Ads", description: "TikTok advertising platform", authType: "oauth2", baseApiUrl: "https://business-api.tiktok.com" },
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

// ─── Agent Onboardings ────────────────────────────────────────────────────────
export async function getOnboardingByAgentId(agentId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(agentOnboardings).where(eq(agentOnboardings.agentId, agentId)).limit(1);
  return rows[0] ?? null;
}
export async function getOnboardingsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentOnboardings).where(eq(agentOnboardings.userId, userId)).orderBy(desc(agentOnboardings.createdAt));
}
export async function getOnboardingsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(agentOnboardings).where(eq(agentOnboardings.companyId, companyId)).orderBy(desc(agentOnboardings.createdAt));
}
export async function createOnboarding(data: InsertAgentOnboarding) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(agentOnboardings).values(data);
}
export async function updateOnboarding(id: number, data: Partial<InsertAgentOnboarding>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(agentOnboardings).set(data).where(eq(agentOnboardings.id, id));
}
export async function completeOnboarding(id: number, summary: string, context: Record<string, unknown>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(agentOnboardings).set({ status: "completed", summary, context, completedAt: new Date() }).where(eq(agentOnboardings.id, id));
}

// ─── Strategy Proposals ───────────────────────────────────────────────────────
export async function getStrategyProposalsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(strategyProposals).where(eq(strategyProposals.companyId, companyId)).orderBy(desc(strategyProposals.createdAt));
}
export async function getStrategyProposalsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(strategyProposals).where(eq(strategyProposals.userId, userId)).orderBy(desc(strategyProposals.createdAt));
}
export async function getStrategyProposalById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(strategyProposals).where(eq(strategyProposals.id, id)).limit(1);
  return rows[0] ?? null;
}
export async function createStrategyProposal(data: InsertStrategyProposal) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(strategyProposals).values(data);
}
export async function updateStrategyProposalStatus(id: number, status: "draft" | "proposed" | "accepted" | "revised") {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(strategyProposals).set({ status }).where(eq(strategyProposals.id, id));
}
export async function getOnboardingById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(agentOnboardings).where(eq(agentOnboardings.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────
export async function joinWaitlist(data: InsertWaitlistEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(waitlistEntries).values(data);
}
export async function getWaitlistCount() {
  const db = await getDb(); if (!db) return 0;
  const rows = await db.select().from(waitlistEntries);
  return rows.length;
}
export async function getWaitlistEntries() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(waitlistEntries).orderBy(desc(waitlistEntries.createdAt));
}
export async function isEmailOnWaitlist(email: string) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select().from(waitlistEntries).where(eq(waitlistEntries.email, email)).limit(1);
  return rows.length > 0;
}

// ─── Briefing Logs ────────────────────────────────────────────────────────────────────────────────
export async function createBriefingLog(data: InsertBriefingLog) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(briefingLogs).values(data);
}
export async function getBriefingLogsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(briefingLogs).where(eq(briefingLogs.userId, userId)).orderBy(desc(briefingLogs.deliveredAt));
}
export async function getBriefingLogsByCompanyId(companyId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(briefingLogs).where(eq(briefingLogs.companyId, companyId)).orderBy(desc(briefingLogs.deliveredAt));
}

// ─── Feature Events (Usage Analytics) ───────────────────────────────────────
export async function createFeatureEvent(data: InsertFeatureEvent) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(featureEvents).values(data);
}
export async function getFeatureEventsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(featureEvents).where(eq(featureEvents.userId, userId)).orderBy(desc(featureEvents.createdAt));
}
export async function getFeatureEventsAll() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(featureEvents).orderBy(desc(featureEvents.createdAt)).limit(5000);
}
export async function getFeatureEventsSummary() {
  const db = await getDb(); if (!db) return [];
  return db.select({
    feature: featureEvents.feature,
    action: featureEvents.action,
    count: sql<number>`COUNT(*)`,
    uniqueUsers: sql<number>`COUNT(DISTINCT ${featureEvents.userId})`,
    lastUsed: sql<Date>`MAX(${featureEvents.createdAt})`,
  }).from(featureEvents).groupBy(featureEvents.feature, featureEvents.action).orderBy(desc(sql`COUNT(*)`));
}

// ─── User Feedback ──────────────────────────────────────────────────────────
export async function createUserFeedback(data: InsertUserFeedback) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.insert(userFeedback).values(data);
}
export async function getUserFeedbackAll() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userFeedback).orderBy(desc(userFeedback.createdAt)).limit(500);
}
export async function getUserFeedbackByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userFeedback).where(eq(userFeedback.userId, userId)).orderBy(desc(userFeedback.createdAt));
}
export async function updateFeedbackStatus(id: number, status: "new" | "reviewed" | "resolved") {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(userFeedback).set({ status }).where(eq(userFeedback.id, id));
}

// ─── Onboarding Welcome Email Tracking ──────────────────────────────────────

export async function hasWelcomeEmailBeenSent(userId: number): Promise<boolean> {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select().from(onboardingWelcomeEmails).where(eq(onboardingWelcomeEmails.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function markWelcomeEmailSent(userId: number, companyId?: number | null): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(onboardingWelcomeEmails).values({ userId, companyId: companyId ?? null }).onDuplicateKeyUpdate({ set: { sentAt: new Date() } });
}

// ─── Changelog Entries ───────────────────────────────────────────────────────
export async function getChangelogEntries(limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(changelogEntries).orderBy(desc(changelogEntries.publishedAt)).limit(limit);
}

export async function createChangelogEntry(data: InsertChangelogEntry) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(changelogEntries).values(data);
  return result;
}

export async function seedChangelogIfEmpty(): Promise<void> {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(changelogEntries).limit(1);
  if (existing.length > 0) return;

  const entries: InsertChangelogEntry[] = [
    {
      version: "0.9.5",
      title: "Introducing Self-Contextualization",
      description: "Your executive agents now pull live data from connected tools before their first question. Connect HubSpot, Salesforce, Meta Ads, Google Ads, or GA4 — and your CMO, CFO, CEO, and CTO will already know your business before the interview begins.",
      type: "feature",
      publishedAt: new Date("2026-03-23"),
    },
    {
      version: "0.9.4",
      title: "Ad Platform Integrations: Meta, Google, TikTok",
      description: "Connect Meta Ads, Google Ads, and TikTok Ads to pull campaign performance, ROAS, keyword data, and audience insights directly into your executive agents' context. Your CMO now has full visibility across your entire ad stack from day one.",
      type: "feature",
      publishedAt: new Date("2026-03-20"),
    },
    {
      version: "0.9.3",
      title: "Context Assembly Animation",
      description: "Watch your agents pull context in real time during onboarding. The new animated visualization shows data flowing from each connected tool into the context engine — so you can see exactly what your executives know before they start working.",
      type: "improvement",
      publishedAt: new Date("2026-03-18"),
    },
    {
      version: "0.9.2",
      title: "Quick Tour & Onboarding Resume",
      description: "New users now get a guided Quick Tour highlighting the Strategy tab, Agent Fleet, and Intent Engine. If you leave mid-onboarding, Mission Control shows a resume banner with your exact progress so you can pick up exactly where you left off.",
      type: "improvement",
      publishedAt: new Date("2026-03-15"),
    },
    {
      version: "0.9.1",
      title: "Integration Health Indicators",
      description: "See at a glance which integrations are active, when data was last synced, and whether any agents have data gaps. The new health indicators on each agent card surface missing context before it becomes a problem.",
      type: "feature",
      publishedAt: new Date("2026-03-10"),
    },
    {
      version: "0.9.0",
      title: "Free During Beta — Full Access for All",
      description: "All pricing tiers are disabled. Every account that signs up gets full unrestricted access to all features — unlimited agents, tools, commands, context engineering, and Proof of Outcome receipts. Early users will be grandfathered when pricing launches.",
      type: "announcement",
      publishedAt: new Date("2026-03-05"),
    },
  ];

  await db.insert(changelogEntries).values(entries);
}

// ─── Page Views ───────────────────────────────────────────────────────────────
export async function insertPageView(data: InsertPageView) {
  const db = await getDb(); if (!db) return;
  await db.insert(pageViews).values(data);
}

export async function getPageViewsByUser(userId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pageViews).where(eq(pageViews.userId, userId)).orderBy(desc(pageViews.createdAt)).limit(limit);
}

export async function getTopPagesByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ path: pageViews.path, count: sql<number>`count(*)`.as("count") })
    .from(pageViews).where(eq(pageViews.userId, userId))
    .groupBy(pageViews.path).orderBy(desc(sql`count(*)`)).limit(10);
}

// ─── User Sessions ────────────────────────────────────────────────────────────
export async function upsertUserSession(data: InsertUserSession) {
  const db = await getDb(); if (!db) return;
  await db.insert(userSessions).values(data).onDuplicateKeyUpdate({
    set: { lastSeenAt: data.lastSeenAt, pageCount: sql`${userSessions.pageCount} + 1`, exitPath: data.exitPath, duration: data.duration ?? 0 },
  });
}

export async function getSessionsByUser(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userSessions).where(eq(userSessions.userId, userId)).orderBy(desc(userSessions.startedAt)).limit(limit);
}

// ─── Admin: All Users with KPIs ───────────────────────────────────────────────
export async function adminGetAllUsers() {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function adminGetUserKpis(userId: number) {
  const db = await getDb(); if (!db) return null;
  const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.userId, userId));
  const [companyCount] = await db.select({ count: sql<number>`count(*)` }).from(companies).where(eq(companies.userId, userId));
  const [pageViewCount] = await db.select({ count: sql<number>`count(*)` }).from(pageViews).where(eq(pageViews.userId, userId));
  const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(userSessions).where(eq(userSessions.userId, userId));
  const [featureEventCount] = await db.select({ count: sql<number>`count(*)` }).from(featureEvents).where(eq(featureEvents.userId, userId));
  const [feedbackCount] = await db.select({ count: sql<number>`count(*)` }).from(userFeedback).where(eq(userFeedback.userId, userId));
  const [onboardingCount] = await db.select({ count: sql<number>`count(*)` }).from(agentOnboardings).where(and(eq(agentOnboardings.userId, userId), eq(agentOnboardings.status, "completed")));
  return {
    agents: Number(agentCount?.count ?? 0),
    companies: Number(companyCount?.count ?? 0),
    pageViews: Number(pageViewCount?.count ?? 0),
    sessions: Number(sessionCount?.count ?? 0),
    featureEvents: Number(featureEventCount?.count ?? 0),
    feedback: Number(feedbackCount?.count ?? 0),
    completedOnboardings: Number(onboardingCount?.count ?? 0),
  };
}

export async function adminGetUserTimeline(userId: number) {
  const db = await getDb(); if (!db) return [];
  // Merge feature events + page views into a unified timeline
  const fEvents = await db.select({ id: featureEvents.id, type: sql<string>`'feature'`, label: sql<string>`concat(${featureEvents.feature}, ':', ${featureEvents.action})`, metadata: featureEvents.metadata, createdAt: featureEvents.createdAt }).from(featureEvents).where(eq(featureEvents.userId, userId)).orderBy(desc(featureEvents.createdAt)).limit(200);
  const pViews = await db.select({ id: pageViews.id, type: sql<string>`'pageview'`, label: pageViews.path, metadata: sql<null>`null`, createdAt: pageViews.createdAt }).from(pageViews).where(eq(pageViews.userId, userId)).orderBy(desc(pageViews.createdAt)).limit(200);
  const combined = [...fEvents, ...pViews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 300);
  return combined;
}

export async function adminGetDailyActivity(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ date: sql<string>`DATE(${featureEvents.createdAt})`, count: sql<number>`count(*)` })
    .from(featureEvents).where(and(eq(featureEvents.userId, userId), sql`${featureEvents.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`))
    .groupBy(sql`DATE(${featureEvents.createdAt})`).orderBy(sql`DATE(${featureEvents.createdAt})`);
}

// ─── Sign-up Funnel Analytics ─────────────────────────────────────────────────
// Funnel stages (in order):
//  1. Signed Up        → users table (all users)
//  2. Created Company  → companies table (at least 1 company)
//  3. Started Onboarding → agent_onboardings (at least 1 row, any status)
//  4. Completed CEO    → agent_onboardings where agentType='ceo' AND status='completed'
//  5. Full Team Built  → agent_onboardings where status='completed' AND count >= 2
//  6. Strategy Generated → strategy_proposals (at least 1 row)
//  7. Strategy Accepted  → strategy_proposals where status='accepted'
//  8. OKRs Created     → okrs where source='strategy' (auto-created from accepted strategy)

export async function adminGetFunnelStats() {
  const db = await getDb(); if (!db) return null;

  // Count only real users (those with an email — excludes ghost rows from failed OAuth)
  const [signedUp] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.email} IS NOT NULL`);
  const [createdCompany] = await db.select({ count: sql<number>`count(distinct ${companies.userId})` }).from(companies);
  const [startedOnboarding] = await db.select({ count: sql<number>`count(distinct ${agentOnboardings.userId})` }).from(agentOnboardings);
  const [completedCeo] = await db.select({ count: sql<number>`count(distinct ${agentOnboardings.userId})` }).from(agentOnboardings).where(and(eq(agentOnboardings.agentType, "ceo"), eq(agentOnboardings.status, "completed")));
  const [fullTeam] = await db.select({ count: sql<number>`count(*)` }).from(
    db.select({ userId: agentOnboardings.userId, cnt: sql<number>`count(*)`.as("cnt") })
      .from(agentOnboardings).where(eq(agentOnboardings.status, "completed"))
      .groupBy(agentOnboardings.userId)
      .having(sql`count(*) >= 2`)
      .as("sub")
  );
  const [strategyGenerated] = await db.select({ count: sql<number>`count(distinct ${strategyProposals.userId})` }).from(strategyProposals);
  const [strategyAccepted] = await db.select({ count: sql<number>`count(distinct ${strategyProposals.userId})` }).from(strategyProposals).where(eq(strategyProposals.status, "accepted"));
  const [okrsCreated] = await db.select({ count: sql<number>`count(distinct ${okrs.userId})` }).from(okrs).where(eq(okrs.source, "strategy"));

  return {
    stages: [
      { key: "signed_up", label: "Signed Up", description: "Created an account", count: Number(signedUp?.count ?? 0) },
      { key: "created_company", label: "Created Company", description: "Set up at least one company", count: Number(createdCompany?.count ?? 0) },
      { key: "started_onboarding", label: "Started Onboarding", description: "Began executive team setup", count: Number(startedOnboarding?.count ?? 0) },
      { key: "completed_ceo", label: "CEO Contextualized", description: "Completed CEO interview", count: Number(completedCeo?.count ?? 0) },
      { key: "full_team", label: "Full Team Built", description: "2+ executives contextualized", count: Number(fullTeam?.count ?? 0) },
      { key: "strategy_generated", label: "Strategy Generated", description: "AI strategy proposal created", count: Number(strategyGenerated?.count ?? 0) },
      { key: "strategy_accepted", label: "Strategy Accepted", description: "Approved the strategy proposal", count: Number(strategyAccepted?.count ?? 0) },
      { key: "okrs_created", label: "OKRs Created", description: "Strategy converted to OKRs", count: Number(okrsCreated?.count ?? 0) },
    ],
  };
}

export async function adminGetUserFunnelStage(userId: number): Promise<string> {
  const db = await getDb(); if (!db) return "signed_up";

  const [hasOkrs] = await db.select({ count: sql<number>`count(*)` }).from(okrs).where(and(eq(okrs.userId, userId), eq(okrs.source, "strategy")));
  if (Number(hasOkrs?.count) > 0) return "okrs_created";

  const [hasAccepted] = await db.select({ count: sql<number>`count(*)` }).from(strategyProposals).where(and(eq(strategyProposals.userId, userId), eq(strategyProposals.status, "accepted")));
  if (Number(hasAccepted?.count) > 0) return "strategy_accepted";

  const [hasStrategy] = await db.select({ count: sql<number>`count(*)` }).from(strategyProposals).where(eq(strategyProposals.userId, userId));
  if (Number(hasStrategy?.count) > 0) return "strategy_generated";

  const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(agentOnboardings).where(and(eq(agentOnboardings.userId, userId), eq(agentOnboardings.status, "completed")));
  if (Number(completedCount?.count) >= 2) return "full_team";

  const [hasCeo] = await db.select({ count: sql<number>`count(*)` }).from(agentOnboardings).where(and(eq(agentOnboardings.userId, userId), eq(agentOnboardings.agentType, "ceo"), eq(agentOnboardings.status, "completed")));
  if (Number(hasCeo?.count) > 0) return "completed_ceo";

  const [hasOnboarding] = await db.select({ count: sql<number>`count(*)` }).from(agentOnboardings).where(eq(agentOnboardings.userId, userId));
  if (Number(hasOnboarding?.count) > 0) return "started_onboarding";

  const [hasCompany] = await db.select({ count: sql<number>`count(*)` }).from(companies).where(eq(companies.userId, userId));
  if (Number(hasCompany?.count) > 0) return "created_company";

  return "signed_up";
}


// ─── Waitlist System ────────────────────────────────────────────────────────

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex"); // 8-char hex
}

export async function findOrCreateUserByEmail(email: string, referralCode?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0];

  // Get next waitlist position
  const [maxPos] = await db.select({ max: sql<number>`COALESCE(MAX(waitlistPosition), 0)` }).from(users);
  const nextPosition = (maxPos?.max ?? 0) + 1;

  // Create new user with email-only (no openId yet — will be linked on OAuth)
  const tempOpenId = `email_${crypto.randomBytes(8).toString("hex")}`;
  const newRefCode = generateReferralCode();

  await db.insert(users).values({
    openId: tempOpenId,
    email,
    name: email.split("@")[0],
    loginMethod: "email",
    role: "user",
    waitlistStatus: "pending",
    waitlistPosition: nextPosition,
    referralCode: newRefCode,
    referredBy: referralCode || null,
    waitlistJoinedAt: new Date(),
  });

  // If referred, process the referral
  if (referralCode) {
    await processReferral(referralCode);
  }

  const [newUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return newUser;
}

export async function processReferral(referralCode: string) {
  const db = await getDb();
  if (!db) return;

  // Increment referral count for the referrer
  await db.update(users)
    .set({ referralCount: sql`referralCount + 1` })
    .where(eq(users.referralCode, referralCode));

  // Move referrer up by 1 position (decrease position number)
  const [referrer] = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
  if (referrer && referrer.waitlistPosition && referrer.waitlistPosition > 1) {
    const newPos = referrer.waitlistPosition - 1;
    // Swap with the user currently at that position
    await db.update(users)
      .set({ waitlistPosition: referrer.waitlistPosition })
      .where(and(eq(users.waitlistPosition, newPos), ne(users.id, referrer.id)));
    await db.update(users)
      .set({ waitlistPosition: newPos })
      .where(eq(users.id, referrer.id));
  }
}

export async function getWaitlistInfo(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select({
    waitlistStatus: users.waitlistStatus,
    waitlistPosition: users.waitlistPosition,
    referralCode: users.referralCode,
    referralCount: users.referralCount,
    referredBy: users.referredBy,
  }).from(users).where(eq(users.id, userId)).limit(1);

  const [totalResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.waitlistStatus, "pending"));

  return { ...user, totalWaitlist: totalResult?.count ?? 0 };
}

export async function adminApproveUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    waitlistStatus: "approved",
    waitlistApprovedAt: new Date(),
    waitlistPosition: null,
  }).where(eq(users.id, userId));
}

export async function adminRejectUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    waitlistStatus: "rejected",
    waitlistPosition: null,
  }).where(eq(users.id, userId));
}

export async function adminBulkApproveUsers(userIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    waitlistStatus: "approved",
    waitlistApprovedAt: new Date(),
    waitlistPosition: null,
  }).where(inArray(users.id, userIds));
}

export async function adminGetWaitlistStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db.select({
    total: sql<number>`COUNT(*)`,
    pending: sql<number>`SUM(CASE WHEN waitlistStatus = 'pending' THEN 1 ELSE 0 END)`,
    approved: sql<number>`SUM(CASE WHEN waitlistStatus = 'approved' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`SUM(CASE WHEN waitlistStatus = 'rejected' THEN 1 ELSE 0 END)`,
    totalReferrals: sql<number>`SUM(referralCount)`,
  }).from(users);

  return stats;
}

export async function adminGetWaitlistUsers(statusFilter?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = statusFilter && statusFilter !== "all"
    ? eq(users.waitlistStatus, statusFilter as "pending" | "approved" | "rejected")
    : undefined;

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    waitlistStatus: users.waitlistStatus,
    waitlistPosition: users.waitlistPosition,
    referralCode: users.referralCode,
    referralCount: users.referralCount,
    referredBy: users.referredBy,
    waitlistJoinedAt: users.waitlistJoinedAt,
    waitlistApprovedAt: users.waitlistApprovedAt,
    createdAt: users.createdAt,
    loginMethod: users.loginMethod,
  }).from(users)
    .where(conditions)
    .orderBy(asc(users.waitlistPosition), desc(users.createdAt));
}

export async function mergeEmailUserToOAuth(email: string, oauthOpenId: string) {
  const db = await getDb();
  if (!db) return;

  // Find any email-first temp user (openId starts with 'email_') with this email
  const [tempUser] = await db.select().from(users)
    .where(and(eq(users.email, email), sql`${users.openId} LIKE 'email_%'`))
    .limit(1);

  if (!tempUser) return; // No email-first user to merge

  // Check if an OAuth user already exists
  const [oauthUser] = await db.select().from(users)
    .where(eq(users.openId, oauthOpenId))
    .limit(1);

  if (oauthUser) {
    // OAuth user already exists — transfer waitlist fields from temp user if they're better
    const updates: Record<string, unknown> = {};
    if (!oauthUser.waitlistPosition && tempUser.waitlistPosition) updates.waitlistPosition = tempUser.waitlistPosition;
    if (!oauthUser.referralCode && tempUser.referralCode) updates.referralCode = tempUser.referralCode;
    if (tempUser.referralCount > 0) updates.referralCount = sql`${users.referralCount} + ${tempUser.referralCount}`;
    if (!oauthUser.referredBy && tempUser.referredBy) updates.referredBy = tempUser.referredBy;
    if (!oauthUser.waitlistJoinedAt && tempUser.waitlistJoinedAt) updates.waitlistJoinedAt = tempUser.waitlistJoinedAt;
    if (tempUser.waitlistStatus === "approved") {
      updates.waitlistStatus = "approved";
      updates.waitlistApprovedAt = tempUser.waitlistApprovedAt;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, oauthUser.id));
    }

    // Delete the temp user
    await db.delete(users).where(eq(users.id, tempUser.id));
  } else {
    // No OAuth user yet — update the temp user's openId to the real one
    await db.update(users).set({ openId: oauthOpenId }).where(eq(users.id, tempUser.id));
  }
}

// ─── Agent Autonomy Settings ────────────────────────────────────────────────
export async function getAutonomySettings(agentId: number) {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(agentAutonomySettings).where(eq(agentAutonomySettings.agentId, agentId)).limit(1);
  return settings ?? null;
}

export async function upsertAutonomySettings(agentId: number, data: Partial<InsertAgentAutonomySetting>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAutonomySettings(agentId);
  if (existing) {
    await db.update(agentAutonomySettings).set(data).where(eq(agentAutonomySettings.agentId, agentId));
  } else {
    await db.insert(agentAutonomySettings).values({ agentId, ...data } as InsertAgentAutonomySetting);
  }
}

// ─── RALF Execution Logs ────────────────────────────────────────────────────
export async function createRalfLog(data: InsertRalfExecutionLog) {
  const db = await getDb();
  if (!db) return;
  return db.insert(ralfExecutionLogs).values(data);
}

export async function getRalfLogsByTask(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ralfExecutionLogs).where(eq(ralfExecutionLogs.taskId, taskId)).orderBy(ralfExecutionLogs.createdAt);
}

export async function getRalfLogsByAgent(agentId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ralfExecutionLogs).where(eq(ralfExecutionLogs.agentId, agentId)).orderBy(desc(ralfExecutionLogs.createdAt)).limit(limit);
}

export async function updateRalfLogStatus(id: number, status: string, output?: string, confidence?: string) {
  const db = await getDb();
  if (!db) return;
  const data: Record<string, unknown> = { status };
  if (output !== undefined) data.output = output;
  if (confidence !== undefined) data.confidence = confidence;
  await db.update(ralfExecutionLogs).set(data).where(eq(ralfExecutionLogs.id, id));
}

// ─── Sub-Agent Recommendations ──────────────────────────────────────────────
export async function createSubAgentRecommendation(data: InsertSubAgentRecommendation) {
  const db = await getDb();
  if (!db) return;
  return db.insert(subAgentRecommendations).values(data);
}

export async function getSubAgentRecommendations(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subAgentRecommendations).where(eq(subAgentRecommendations.companyId, companyId)).orderBy(desc(subAgentRecommendations.createdAt));
}

export async function getSubAgentRecommendationsByExecutive(executiveAgentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subAgentRecommendations).where(eq(subAgentRecommendations.executiveAgentId, executiveAgentId)).orderBy(desc(subAgentRecommendations.createdAt));
}

export async function updateSubAgentRecommendationStatus(id: number, status: "suggested" | "approved" | "deployed" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await db.update(subAgentRecommendations).set({ status }).where(eq(subAgentRecommendations.id, id));
}

export async function ensureWaitlistFields(userId: number) {
  const db = await getDb();
  if (!db) return;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const updates: Record<string, unknown> = {};
  if (!user.referralCode) updates.referralCode = generateReferralCode();
  if (!user.waitlistJoinedAt) updates.waitlistJoinedAt = new Date();

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }
}

// ─── Executive Context Manifests ─────────────────────────────────────────────
// Each executive agent declares which data sources it accessed during context
// assembly. Sub-agents inherit this manifest so they operate within the same
// data frame without re-assembling context from scratch.

export async function getContextManifest(agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(executiveContextManifests)
    .where(eq(executiveContextManifests.agentId, agentId))
    .orderBy(desc(executiveContextManifests.assembledAt))
    .limit(1);
  return r[0];
}

export async function upsertContextManifest(data: InsertExecutiveContextManifest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if a manifest already exists for this agent
  const existing = await getContextManifest(data.agentId);
  if (existing) {
    await db
      .update(executiveContextManifests)
      .set({
        dataSources: data.dataSources,
        contextSummary: data.contextSummary ?? null,
        liveStateSnapshot: data.liveStateSnapshot ?? null,
        assembledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(executiveContextManifests.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(executiveContextManifests).values(data);
  return (result as any).insertId as number;
}

export async function getContextManifestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(executiveContextManifests)
    .where(eq(executiveContextManifests.userId, userId))
    .orderBy(desc(executiveContextManifests.assembledAt));
}

// ─── Website Audits ─────────────────────────────────────────────────────────
export async function createWebsiteAudit(data: InsertWebsiteAudit) {
  const db = await getDb();
  if (!db) return;
  await db.insert(websiteAudits).values(data);
}

export async function updateWebsiteAudit(id: number, data: Partial<InsertWebsiteAudit>) {
  const db = await getDb();
  if (!db) return;
  await db.update(websiteAudits).set(data as any).where(eq(websiteAudits.id, id));
}

export async function getWebsiteAuditByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(websiteAudits).where(eq(websiteAudits.companyId, companyId)).orderBy(desc(websiteAudits.createdAt)).limit(1);
  return rows[0];
}

export async function getWebsiteAuditsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(websiteAudits).where(eq(websiteAudits.userId, userId)).orderBy(desc(websiteAudits.createdAt));
}
