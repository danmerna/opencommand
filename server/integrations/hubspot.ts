/**
 * HubSpot CRM Integration
 * Fetches live CRM data for the Socratic Intent Engine context assembly.
 * Handles token expiry and refresh automatically.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshTokenIfNeeded(connection: UserConnection): Promise<string> {
  const accessToken = connection.accessToken ?? "";

  // If no expiry stored, assume valid (some tokens don't expire)
  if (!connection.tokenExpiresAt) return accessToken;

  // Refresh if within 5 minutes of expiry or already expired
  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return accessToken;

  // Token is expired or about to expire — refresh it
  if (!connection.refreshToken) {
    throw new Error("HubSpot token expired and no refresh token available. Please reconnect HubSpot.");
  }

  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.hubspotClientId,
      client_secret: ENV.hubspotClientSecret,
      refresh_token: connection.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token ?? connection.refreshToken;
  const newExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  // Persist updated tokens
  const db = await getDb();
  if (db) {
    await db.update(userConnections).set({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenExpiresAt: newExpiresAt ?? undefined,
      status: "connected",
      updatedAt: new Date(),
    }).where(eq(userConnections.id, connection.id));
  }

  return newAccessToken;
}

// ─── HubSpot API Helper ───────────────────────────────────────────────────────

async function hubGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Contact Summary ──────────────────────────────────────────────────────────

export interface ContactSummary {
  totalContacts: number;
  recentAdditions30d: number;
  topCompanies: string[];
  topIndustries: string[];
}

export async function getContactsSummary(accessToken: string): Promise<ContactSummary> {
  // Total count
  const countData = await hubGet<{ total?: number }>(
    "/crm/v3/objects/contacts?limit=1",
    accessToken
  );
  const totalContacts = countData.total ?? 0;

  // Recent 30 days — use filter
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentData = await hubGet<{ total?: number; results?: Array<{ properties: Record<string, string> }> }>(
    `/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,createdate,company,industry&filterGroups=[{"filters":[{"propertyName":"createdate","operator":"GTE","value":"${thirtyDaysAgo}"}]}]`,
    accessToken
  ).catch(() => ({ total: 0, results: [] as Array<{ properties: Record<string, string> }> }));

  const recentContacts = recentData.results ?? [];
  const recentAdditions30d = recentData.total ?? recentContacts.length;

  // Extract top companies and industries
  const companyCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};
  for (const c of recentContacts) {
    const co = c.properties?.company;
    const ind = c.properties?.industry;
    if (co) companyCounts[co] = (companyCounts[co] ?? 0) + 1;
    if (ind) industryCounts[ind] = (industryCounts[ind] ?? 0) + 1;
  }

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const topIndustries = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return { totalContacts, recentAdditions30d, topCompanies, topIndustries };
}

// ─── Deal Pipeline ────────────────────────────────────────────────────────────

export interface DealPipeline {
  totalOpenDeals: number;
  totalPipelineValue: number;
  averageDealSize: number;
  dealsByStage: Array<{ stageName: string; count: number; totalValue: number }>;
}

export async function getDealsPipeline(accessToken: string): Promise<DealPipeline> {
  // Fetch pipelines to get stage names
  const pipelinesData = await hubGet<{
    results?: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string }>;
    }>;
  }>("/crm/v3/pipelines/deals", accessToken).catch(() => ({ results: [] }));

  const stageMap: Record<string, string> = {};
  for (const pipeline of pipelinesData.results ?? []) {
    for (const stage of pipeline.stages ?? []) {
      stageMap[stage.id] = stage.label;
    }
  }

  // Fetch open deals
  const dealsData = await hubGet<{
    total?: number;
    results?: Array<{ properties: Record<string, string> }>;
  }>(
    "/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,pipeline,createdate",
    accessToken
  ).catch(() => ({ total: 0, results: [] }));

  const deals = dealsData.results ?? [];
  const totalOpenDeals = dealsData.total ?? deals.length;

  const stageTotals: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;

  for (const deal of deals) {
    const stage = deal.properties?.dealstage ?? "unknown";
    const amount = parseFloat(deal.properties?.amount ?? "0") || 0;
    totalValue += amount;
    if (!stageTotals[stage]) stageTotals[stage] = { count: 0, value: 0 };
    stageTotals[stage].count++;
    stageTotals[stage].value += amount;
  }

  const dealsByStage = Object.entries(stageTotals).map(([stageId, data]) => ({
    stageName: stageMap[stageId] ?? stageId,
    count: data.count,
    totalValue: data.value,
  })).sort((a, b) => b.totalValue - a.totalValue);

  const averageDealSize = totalOpenDeals > 0 ? totalValue / Math.min(deals.length, totalOpenDeals) : 0;

  return { totalOpenDeals, totalPipelineValue: totalValue, averageDealSize, dealsByStage };
}

// ─── Recent Closed-Won ────────────────────────────────────────────────────────

export interface ClosedDeal {
  dealName: string;
  amount: number;
  industry: string;
  closeDate: string;
}

export async function getRecentClosedWon(accessToken: string, days = 30): Promise<ClosedDeal[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Search for closed-won deals
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [{
        filters: [
          { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
          { propertyName: "closedate", operator: "GTE", value: since },
        ],
      }],
      properties: ["dealname", "amount", "industry", "closedate"],
      limit: 50,
    }),
  });

  if (!res.ok) return [];

  const data = await res.json() as { results?: Array<{ properties: Record<string, string> }> };
  return (data.results ?? []).map(d => ({
    dealName: d.properties?.dealname ?? "Unnamed Deal",
    amount: parseFloat(d.properties?.amount ?? "0") || 0,
    industry: d.properties?.industry ?? "Unknown",
    closeDate: d.properties?.closedate ?? "",
  }));
}

// ─── Deal Velocity ────────────────────────────────────────────────────────────

export interface DealVelocity {
  stalledDeals: Array<{ dealName: string; stageName: string; daysStalled: number; amount: number }>;
  totalStalledValue: number;
  stalledCount: number;
}

export async function getDealVelocity(accessToken: string, stalledThresholdDays = 14): Promise<DealVelocity> {
  // Fetch open deals with create date to estimate stall time
  const dealsData = await hubGet<{
    results?: Array<{ id: string; properties: Record<string, string> }>;
  }>(
    "/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,hs_lastmodifieddate,createdate",
    accessToken
  ).catch(() => ({ results: [] }));

  const deals = dealsData.results ?? [];
  const now = Date.now();
  const stalledDeals: DealVelocity["stalledDeals"] = [];
  let totalStalledValue = 0;

  for (const deal of deals) {
    const lastMod = deal.properties?.hs_lastmodifieddate
      ? new Date(deal.properties.hs_lastmodifieddate).getTime()
      : new Date(deal.properties?.createdate ?? 0).getTime();

    const daysStalled = Math.floor((now - lastMod) / (1000 * 60 * 60 * 24));
    if (daysStalled >= stalledThresholdDays) {
      const amount = parseFloat(deal.properties?.amount ?? "0") || 0;
      stalledDeals.push({
        dealName: deal.properties?.dealname ?? "Unnamed",
        stageName: deal.properties?.dealstage ?? "unknown",
        daysStalled,
        amount,
      });
      totalStalledValue += amount;
    }
  }

  stalledDeals.sort((a, b) => b.daysStalled - a.daysStalled);

  return { stalledDeals, totalStalledValue, stalledCount: stalledDeals.length };
}

// ─── Full CRM Snapshot ────────────────────────────────────────────────────────

export interface HubSpotSnapshot {
  contacts: ContactSummary;
  pipeline: DealPipeline;
  closedWon30d: ClosedDeal[];
  velocity: DealVelocity;
}

// ─── Display Metrics for Socratic Engine ─────────────────────────────────────

import type { DataSourceCard } from "../../shared/types";

export function getHubSpotDisplayMetrics(snapshot: HubSpotSnapshot): DataSourceCard {
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString()}`;
  return {
    sourceId: "hubspot_crm",
    sourceName: "HubSpot CRM",
    sourceColor: "#ff7a59",
    metrics: [
      { label: "Open deals", value: `${snapshot.pipeline.totalOpenDeals} · ${fmt(snapshot.pipeline.totalPipelineValue)}` },
      { label: "Won (30d)", value: `${snapshot.closedWon30d.length} · ${fmt(snapshot.closedWon30d.reduce((s, d) => s + d.amount, 0))}` },
      { label: "Stalled deals", value: `${snapshot.velocity.stalledCount} · ${fmt(snapshot.velocity.totalStalledValue)}` },
      { label: "Avg deal size", value: fmt(snapshot.pipeline.averageDealSize) },
    ],
  };
}

export async function getHubSpotSnapshot(connection: UserConnection): Promise<HubSpotSnapshot> {
  const accessToken = await refreshTokenIfNeeded(connection);

  const [contacts, pipeline, closedWon30d, velocity] = await Promise.all([
    getContactsSummary(accessToken),
    getDealsPipeline(accessToken),
    getRecentClosedWon(accessToken, 30),
    getDealVelocity(accessToken, 14),
  ]);

  return { contacts, pipeline, closedWon30d, velocity };
}
