import { eq, desc, and, sql } from "drizzle-orm";
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
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
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

// ─── Agents ───────────────────────────────────────────────────────────────────
export async function getAgentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt));
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0];
}

export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(data);
  return result;
}

export async function updateAgentStatus(id: number, status: "idle" | "active" | "paused" | "error") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(agents).set({ status, updatedAt: new Date() }).where(eq(agents.id, id));
}

export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(agents).set({ ...data, updatedAt: new Date() }).where(eq(agents.id, id));
}

// ─── OKRs ─────────────────────────────────────────────────────────────────────
export async function getOkrsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(okrs).where(eq(okrs.userId, userId)).orderBy(desc(okrs.createdAt));
}

export async function createOkr(data: InsertOkr) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(okrs).values(data);
}

export async function updateOkrProgress(id: number, currentValue: string, status: "on_track" | "at_risk" | "achieved" | "missed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(okrs).set({ currentValue, status, updatedAt: new Date() }).where(eq(okrs.id, id));
}

export async function deleteOkr(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(okrs).where(eq(okrs.id, id));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return result;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id));
}

// ─── PoO Receipts ─────────────────────────────────────────────────────────────
export async function getPooReceiptsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pooReceipts).where(eq(pooReceipts.userId, userId)).orderBy(desc(pooReceipts.createdAt));
}

export async function createPooReceipt(data: InsertPooReceipt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(pooReceipts).values(data);
}

export async function getPooSummaryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return { totalValue: 0, totalHours: 0, totalReceipts: 0 };
  const result = await db.select({
    totalValue: sql<number>`COALESCE(SUM(${pooReceipts.dollarValueCreated}), 0)`,
    totalHours: sql<number>`COALESCE(SUM(${pooReceipts.laborHoursSaved}), 0)`,
    totalReceipts: sql<number>`COUNT(*)`,
  }).from(pooReceipts).where(eq(pooReceipts.userId, userId));
  return result[0] ?? { totalValue: 0, totalHours: 0, totalReceipts: 0 };
}

// ─── Inbox Items ──────────────────────────────────────────────────────────────
export async function getInboxItemsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inboxItems).where(eq(inboxItems.userId, userId)).orderBy(desc(inboxItems.createdAt));
}

export async function createInboxItem(data: InsertInboxItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(inboxItems).values(data);
}

export async function resolveInboxItem(id: number, resolution: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "resolved", resolution, resolvedAt: new Date() }).where(eq(inboxItems.id, id));
}

export async function dismissInboxItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "dismissed" }).where(eq(inboxItems.id, id));
}

export async function markInboxItemRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(inboxItems).set({ status: "read" }).where(and(eq(inboxItems.id, id), eq(inboxItems.status, "unread")));
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
export async function getMarketplaceListings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.isActive, true)).orderBy(desc(marketplaceListings.totalPurchases));
}

export async function getMarketplaceListingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id)).limit(1);
  return result[0];
}

export async function createMarketplaceListing(data: InsertMarketplaceListing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(marketplaceListings).values(data);
}

// ─── Creator Partnerships ─────────────────────────────────────────────────────
export async function getCreatorPartnerships() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creatorPartnerships).orderBy(desc(creatorPartnerships.createdAt));
}

export async function createCreatorPartnership(data: InsertCreatorPartnership) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(creatorPartnerships).values(data);
}

// ─── Decision Log ─────────────────────────────────────────────────────────────
export async function getDecisionLogByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(decisionLog).where(eq(decisionLog.userId, userId)).orderBy(desc(decisionLog.createdAt)).limit(limit);
}

export async function createDecisionLogEntry(data: InsertDecisionLogEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(decisionLog).values(data);
}
