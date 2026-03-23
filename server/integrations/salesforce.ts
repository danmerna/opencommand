/**
 * Salesforce CRM Integration
 * Fetches live CRM data for the Socratic Intent Engine context assembly.
 * Handles token expiry and refresh automatically.
 * Mirrors the HubSpot integration structure for consistency.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshSalesforceToken(connection: UserConnection): Promise<{ accessToken: string; instanceUrl: string }> {
  const accessToken = connection.accessToken ?? "";
  const instanceUrl = (connection.metadata as any)?.instanceUrl ?? "https://login.salesforce.com";

  // If no expiry stored, assume valid
  if (!connection.tokenExpiresAt) return { accessToken, instanceUrl };

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return { accessToken, instanceUrl };

  // Token expired or about to expire — refresh
  if (!connection.refreshToken) {
    throw new Error("Salesforce token expired and no refresh token available. Please reconnect Salesforce.");
  }

  const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.salesforceClientId ?? "",
      client_secret: ENV.salesforceClientSecret ?? "",
      refresh_token: connection.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salesforce token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    instance_url?: string;
    issued_at?: string;
  };

  const newAccessToken = data.access_token;
  const newInstanceUrl = data.instance_url ?? instanceUrl;
  // Salesforce tokens typically last 2 hours
  const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const db = await getDb();
  if (db) {
    await db.update(userConnections).set({
      accessToken: newAccessToken,
      metadata: { ...(connection.metadata as any ?? {}), instanceUrl: newInstanceUrl },
      tokenExpiresAt: newExpiresAt,
      status: "connected",
      updatedAt: new Date(),
    }).where(eq(userConnections.id, connection.id));
  }

  return { accessToken: newAccessToken, instanceUrl: newInstanceUrl };
}

// ─── Salesforce API Helper ───────────────────────────────────────────────────

async function sfQuery<T>(instanceUrl: string, accessToken: string, soql: string): Promise<T> {
  const encoded = encodeURIComponent(soql);
  const res = await fetch(`${instanceUrl}/services/data/v59.0/query?q=${encoded}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Salesforce API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Contact / Lead Summary ──────────────────────────────────────────────────

export interface SFContactSummary {
  totalContacts: number;
  totalLeads: number;
  recentLeads30d: number;
  topAccounts: string[];
  topIndustries: string[];
}

export async function getContactsSummary(instanceUrl: string, accessToken: string): Promise<SFContactSummary> {
  // Total contacts
  const contactCount = await sfQuery<{ totalSize: number }>(
    instanceUrl, accessToken,
    "SELECT COUNT() FROM Contact"
  ).catch(() => ({ totalSize: 0 }));

  // Total leads
  const leadCount = await sfQuery<{ totalSize: number }>(
    instanceUrl, accessToken,
    "SELECT COUNT() FROM Lead WHERE IsConverted = false"
  ).catch(() => ({ totalSize: 0 }));

  // Recent leads (30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const recentLeads = await sfQuery<{ totalSize: number }>(
    instanceUrl, accessToken,
    `SELECT COUNT() FROM Lead WHERE CreatedDate >= ${thirtyDaysAgo}T00:00:00Z`
  ).catch(() => ({ totalSize: 0 }));

  // Top accounts by number of contacts
  const topAccountsData = await sfQuery<{
    records: Array<{ Account: { Name: string } | null; expr0: number }>;
  }>(
    instanceUrl, accessToken,
    "SELECT Account.Name, COUNT(Id) expr0 FROM Contact WHERE Account.Name != null GROUP BY Account.Name ORDER BY COUNT(Id) DESC LIMIT 5"
  ).catch(() => ({ records: [] }));

  const topAccounts = topAccountsData.records
    .map(r => r.Account?.Name)
    .filter((n): n is string => !!n);

  // Top industries from accounts
  const topIndustriesData = await sfQuery<{
    records: Array<{ Industry: string | null; expr0: number }>;
  }>(
    instanceUrl, accessToken,
    "SELECT Industry, COUNT(Id) expr0 FROM Account WHERE Industry != null GROUP BY Industry ORDER BY COUNT(Id) DESC LIMIT 5"
  ).catch(() => ({ records: [] }));

  const topIndustries = topIndustriesData.records
    .map(r => r.Industry)
    .filter((n): n is string => !!n);

  return {
    totalContacts: contactCount.totalSize,
    totalLeads: leadCount.totalSize,
    recentLeads30d: recentLeads.totalSize,
    topAccounts,
    topIndustries,
  };
}

// ─── Opportunity Pipeline ────────────────────────────────────────────────────

export interface SFPipeline {
  totalOpenOpportunities: number;
  totalPipelineValue: number;
  averageDealSize: number;
  opportunitiesByStage: Array<{ stageName: string; count: number; totalValue: number }>;
}

export async function getOpportunityPipeline(instanceUrl: string, accessToken: string): Promise<SFPipeline> {
  const pipelineData = await sfQuery<{
    records: Array<{ StageName: string; expr0: number; expr1: number }>;
  }>(
    instanceUrl, accessToken,
    "SELECT StageName, COUNT(Id) expr0, SUM(Amount) expr1 FROM Opportunity WHERE IsClosed = false GROUP BY StageName ORDER BY SUM(Amount) DESC"
  ).catch(() => ({ records: [] }));

  let totalOpen = 0;
  let totalValue = 0;
  const opportunitiesByStage = pipelineData.records.map(r => {
    const count = r.expr0 ?? 0;
    const value = r.expr1 ?? 0;
    totalOpen += count;
    totalValue += value;
    return { stageName: r.StageName, count, totalValue: value };
  });

  return {
    totalOpenOpportunities: totalOpen,
    totalPipelineValue: totalValue,
    averageDealSize: totalOpen > 0 ? totalValue / totalOpen : 0,
    opportunitiesByStage,
  };
}

// ─── Recent Closed-Won ──────────────────────────────────────────────────────

export interface SFClosedDeal {
  opportunityName: string;
  amount: number;
  accountName: string;
  closeDate: string;
}

export async function getRecentClosedWon(instanceUrl: string, accessToken: string, days = 30): Promise<SFClosedDeal[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const data = await sfQuery<{
    records: Array<{
      Name: string;
      Amount: number | null;
      Account?: { Name: string } | null;
      CloseDate: string;
    }>;
  }>(
    instanceUrl, accessToken,
    `SELECT Name, Amount, Account.Name, CloseDate FROM Opportunity WHERE IsWon = true AND CloseDate >= ${since} ORDER BY CloseDate DESC LIMIT 50`
  ).catch(() => ({ records: [] }));

  return data.records.map(r => ({
    opportunityName: r.Name ?? "Unnamed",
    amount: r.Amount ?? 0,
    accountName: r.Account?.Name ?? "Unknown",
    closeDate: r.CloseDate ?? "",
  }));
}

// ─── Stalled Opportunities ──────────────────────────────────────────────────

export interface SFVelocity {
  stalledOpportunities: Array<{ name: string; stageName: string; daysStalled: number; amount: number }>;
  totalStalledValue: number;
  stalledCount: number;
}

export async function getOpportunityVelocity(instanceUrl: string, accessToken: string, stalledThresholdDays = 14): Promise<SFVelocity> {
  const data = await sfQuery<{
    records: Array<{
      Name: string;
      StageName: string;
      Amount: number | null;
      LastModifiedDate: string;
    }>;
  }>(
    instanceUrl, accessToken,
    "SELECT Name, StageName, Amount, LastModifiedDate FROM Opportunity WHERE IsClosed = false ORDER BY LastModifiedDate ASC LIMIT 100"
  ).catch(() => ({ records: [] }));

  const now = Date.now();
  const stalledOpportunities: SFVelocity["stalledOpportunities"] = [];
  let totalStalledValue = 0;

  for (const opp of data.records) {
    const lastMod = new Date(opp.LastModifiedDate).getTime();
    const daysStalled = Math.floor((now - lastMod) / (1000 * 60 * 60 * 24));
    if (daysStalled >= stalledThresholdDays) {
      const amount = opp.Amount ?? 0;
      stalledOpportunities.push({
        name: opp.Name ?? "Unnamed",
        stageName: opp.StageName ?? "unknown",
        daysStalled,
        amount,
      });
      totalStalledValue += amount;
    }
  }

  stalledOpportunities.sort((a, b) => b.daysStalled - a.daysStalled);

  return { stalledOpportunities, totalStalledValue, stalledCount: stalledOpportunities.length };
}

// ─── Full CRM Snapshot ──────────────────────────────────────────────────────

export interface SalesforceSnapshot {
  contacts: SFContactSummary;
  pipeline: SFPipeline;
  closedWon30d: SFClosedDeal[];
  velocity: SFVelocity;
}

export async function getSalesforceSnapshot(connection: UserConnection): Promise<SalesforceSnapshot> {
  const { accessToken, instanceUrl } = await refreshSalesforceToken(connection);

  const [contacts, pipeline, closedWon30d, velocity] = await Promise.all([
    getContactsSummary(instanceUrl, accessToken),
    getOpportunityPipeline(instanceUrl, accessToken),
    getRecentClosedWon(instanceUrl, accessToken, 30),
    getOpportunityVelocity(instanceUrl, accessToken, 14),
  ]);

  return { contacts, pipeline, closedWon30d, velocity };
}
