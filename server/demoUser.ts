/**
 * Demo User Seeder
 *
 * Creates or resets the demo user "demo@opencommand.co" with pre-seeded
 * mock connections for Salesforce, HubSpot, Meta Ads, Google Ads, and GA4.
 *
 * The demo user can log in via Manus OAuth using the demo account.
 * All integration data fetches return mock data via DEMO_MODE token.
 */

import { getDb } from "./db";
import { users, userConnections, companies } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { DEMO_TOKEN } from "./integrations/demoMockData"; // "DEMO_MODE"

export const DEMO_OPEN_ID = "demo_user_opencommand_2026";
export const DEMO_EMAIL = "demo@opencommand.co";
export const DEMO_NAME = "Demo User (Meridian Software)";

// Provider IDs from the DB (seeded via seedToolProviders)
// These match the IDs we verified in the DB
const PROVIDER_IDS = {
  hubspot: 1,
  salesforce: 2,
  meta_ads: 30001,
  google_ads: 30002,
  ga4: 30004,
};

const CATEGORY_IDS = {
  crm: 1,
  analytics: 3,
  paid_ads: 30001,
};

interface SeedResult {
  userId: number;
  connectionsCreated: number;
  companyCreated: boolean;
  message: string;
}

export async function seedDemoUser(): Promise<SeedResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // 1. Upsert the demo user
  await db.insert(users).values({
    openId: DEMO_OPEN_ID,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    loginMethod: "demo",
    role: "user",
    waitlistStatus: "approved",
    waitlistApprovedAt: new Date(),
    waitlistJoinedAt: new Date(),
    referralCode: "DEMO2026",
  }).onDuplicateKeyUpdate({
    set: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      waitlistStatus: "approved",
      waitlistApprovedAt: new Date(),
    },
  });

  // Get the user ID
  const [demoUser] = await db.select().from(users).where(eq(users.openId, DEMO_OPEN_ID)).limit(1);
  if (!demoUser) throw new Error("Failed to create demo user");
  const userId = demoUser.id;

  // 2. Delete existing demo connections (reset)
  await db.delete(userConnections).where(eq(userConnections.userId, userId));

  // 3. Seed mock connections
  const connections = [
    {
      userId,
      providerId: PROVIDER_IDS.hubspot,
      categoryId: CATEGORY_IDS.crm,
      status: "connected" as const,
      accessToken: DEMO_TOKEN, // "DEMO_MODE" — triggers mock data in contextAssembler
      refreshToken: DEMO_TOKEN,
      accountName: "Meridian Software (HubSpot)",
      accountId: "demo-hubspot-portal-12345",
      lastSyncAt: new Date(),
      metadata: { portalId: "12345", demo: true },
    },
    {
      userId,
      providerId: PROVIDER_IDS.salesforce,
      categoryId: CATEGORY_IDS.crm,
      status: "connected" as const,
      accessToken: DEMO_TOKEN, // "DEMO_MODE" — triggers mock data in contextAssembler
      refreshToken: DEMO_TOKEN,
      accountName: "Meridian Software (Salesforce)",
      accountId: "demo-sf-org-00D000000000001",
      lastSyncAt: new Date(),
      metadata: { instanceUrl: "https://meridian.salesforce.com", orgId: "00D000000000001", demo: true },
    },
    {
      userId,
      providerId: PROVIDER_IDS.meta_ads,
      categoryId: CATEGORY_IDS.paid_ads,
      status: "connected" as const,
      accessToken: DEMO_TOKEN, // "DEMO_MODE" — triggers mock data in contextAssembler
      refreshToken: DEMO_TOKEN,
      accountName: "Meridian Software (Meta Ads)",
      accountId: "act_demo_001",
      lastSyncAt: new Date(),
      metadata: { adAccountId: "act_demo_001", demo: true },
    },
    {
      userId,
      providerId: PROVIDER_IDS.google_ads,
      categoryId: CATEGORY_IDS.paid_ads,
      status: "connected" as const,
      accessToken: DEMO_TOKEN, // "DEMO_MODE" — triggers mock data in contextAssembler
      refreshToken: DEMO_TOKEN,
      accountName: "Meridian Software (Google Ads)",
      accountId: "demo-customer",
      lastSyncAt: new Date(),
      metadata: { customerId: "demo-customer", demo: true },
    },
    {
      userId,
      providerId: PROVIDER_IDS.ga4,
      categoryId: CATEGORY_IDS.analytics,
      status: "connected" as const,
      accessToken: DEMO_TOKEN, // "DEMO_MODE" — triggers mock data in contextAssembler
      refreshToken: DEMO_TOKEN,
      accountName: "Meridian Software (GA4)",
      accountId: "properties/demo-123456",
      lastSyncAt: new Date(),
      metadata: { propertyId: "demo-123456", demo: true },
    },
  ];

  await db.insert(userConnections).values(connections);

  // 4. Upsert a demo company
  const existingCompanies = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
  let companyCreated = false;

  if (existingCompanies.length === 0) {
    await db.insert(companies).values({
      userId,
      name: "Meridian Software",
      mission: "Empowering B2B teams with intelligent automation that eliminates repetitive work and accelerates revenue growth.",
      industry: "B2B SaaS",
      status: "active",
      monthlyBudget: "45000",
      totalRevenue: "2400000",
      totalCosts: "1800000",
      agentCount: 0,
      briefingFrequency: "weekly",
    });
    companyCreated = true;
  }

  return {
    userId,
    connectionsCreated: connections.length,
    companyCreated,
    message: `Demo user seeded successfully. User ID: ${userId}, email: ${DEMO_EMAIL}`,
  };
}

export async function getDemoUserId(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.openId, DEMO_OPEN_ID)).limit(1);
  return user?.id ?? null;
}
