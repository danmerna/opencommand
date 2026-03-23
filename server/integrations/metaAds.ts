/**
 * Meta Ads (Facebook/Instagram) Integration
 * Fetches live ad campaign data for the Socratic Intent Engine context assembly.
 * Handles token refresh automatically via long-lived token exchange.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshMetaToken(connection: UserConnection): Promise<string> {
  const accessToken = connection.accessToken ?? "";

  if (!connection.tokenExpiresAt) return accessToken;

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return accessToken;

  // Exchange for a new long-lived token
  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${ENV.metaAppId}&client_secret=${ENV.metaAppSecret}&fb_exchange_token=${accessToken}`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta token refresh failed: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  const newAccessToken = data.access_token;
  const newExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days default

  const db = await getDb();
  if (db) {
    await db.update(userConnections).set({
      accessToken: newAccessToken,
      tokenExpiresAt: newExpiresAt,
      status: "connected",
      updatedAt: new Date(),
    }).where(eq(userConnections.id, connection.id));
  }

  return newAccessToken;
}

// ─── Meta Graph API Helper ──────────────────────────────────────────────────

async function metaGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v19.0${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Ad Account Summary ─────────────────────────────────────────────────────

export interface MetaAdAccountSummary {
  accountId: string;
  accountName: string;
  currency: string;
  totalCampaigns: number;
  activeCampaigns: number;
}

export async function getAdAccountSummary(accessToken: string): Promise<MetaAdAccountSummary[]> {
  const accounts = await metaGet<{
    data?: Array<{ id: string; name: string; currency: string; account_status: number }>;
  }>("/me/adaccounts", accessToken, {
    fields: "id,name,currency,account_status",
    limit: "10",
  }).catch(() => ({ data: [] }));

  const summaries: MetaAdAccountSummary[] = [];

  for (const acct of accounts.data ?? []) {
    // Fetch campaign counts
    const campaigns = await metaGet<{
      data?: Array<{ id: string; status: string }>;
    }>(`/${acct.id}/campaigns`, accessToken, {
      fields: "id,status",
      limit: "100",
    }).catch(() => ({ data: [] }));

    const allCampaigns = campaigns.data ?? [];
    summaries.push({
      accountId: acct.id,
      accountName: acct.name ?? acct.id,
      currency: acct.currency ?? "USD",
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === "ACTIVE").length,
    });
  }

  return summaries;
}

// ─── Campaign Performance ───────────────────────────────────────────────────

export interface MetaCampaignPerformance {
  campaignName: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
}

export async function getCampaignPerformance(accessToken: string, days = 30): Promise<MetaCampaignPerformance[]> {
  const accounts = await metaGet<{
    data?: Array<{ id: string }>;
  }>("/me/adaccounts", accessToken, { fields: "id", limit: "5" }).catch(() => ({ data: [] }));

  const results: MetaCampaignPerformance[] = [];

  for (const acct of (accounts.data ?? []).slice(0, 3)) {
    const insights = await metaGet<{
      data?: Array<{
        campaign_name: string;
        campaign_id: string;
        objective: string;
        spend: string;
        impressions: string;
        clicks: string;
        ctr: string;
        cpc: string;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
    }>(`/${acct.id}/insights`, accessToken, {
      fields: "campaign_name,campaign_id,objective,spend,impressions,clicks,ctr,cpc,actions",
      level: "campaign",
      date_preset: days <= 7 ? "last_7d" : "last_30d",
      limit: "20",
    }).catch(() => ({ data: [] }));

    for (const row of insights.data ?? []) {
      const spend = parseFloat(row.spend ?? "0");
      const conversions = (row.actions ?? [])
        .filter(a => ["offsite_conversion", "purchase", "lead", "complete_registration"].includes(a.action_type))
        .reduce((sum, a) => sum + parseFloat(a.value ?? "0"), 0);

      results.push({
        campaignName: row.campaign_name ?? "Unnamed",
        status: "ACTIVE",
        objective: row.objective ?? "UNKNOWN",
        spend,
        impressions: parseInt(row.impressions ?? "0"),
        clicks: parseInt(row.clicks ?? "0"),
        ctr: parseFloat(row.ctr ?? "0"),
        cpc: parseFloat(row.cpc ?? "0"),
        conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
      });
    }
  }

  return results.sort((a, b) => b.spend - a.spend);
}

// ─── Audience Insights ──────────────────────────────────────────────────────

export interface MetaAudienceInsight {
  totalReach30d: number;
  totalSpend30d: number;
  averageCPM: number;
  topObjectives: string[];
}

export async function getAudienceInsights(accessToken: string): Promise<MetaAudienceInsight> {
  const accounts = await metaGet<{
    data?: Array<{ id: string }>;
  }>("/me/adaccounts", accessToken, { fields: "id", limit: "3" }).catch(() => ({ data: [] }));

  let totalReach = 0;
  let totalSpend = 0;
  let totalImpressions = 0;
  const objectiveCounts: Record<string, number> = {};

  for (const acct of (accounts.data ?? []).slice(0, 3)) {
    const insights = await metaGet<{
      data?: Array<{
        reach: string;
        spend: string;
        impressions: string;
        objective: string;
      }>;
    }>(`/${acct.id}/insights`, accessToken, {
      fields: "reach,spend,impressions,objective",
      date_preset: "last_30d",
      level: "campaign",
      limit: "50",
    }).catch(() => ({ data: [] }));

    for (const row of insights.data ?? []) {
      totalReach += parseInt(row.reach ?? "0");
      totalSpend += parseFloat(row.spend ?? "0");
      totalImpressions += parseInt(row.impressions ?? "0");
      const obj = row.objective ?? "UNKNOWN";
      objectiveCounts[obj] = (objectiveCounts[obj] ?? 0) + 1;
    }
  }

  const topObjectives = Object.entries(objectiveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    totalReach30d: totalReach,
    totalSpend30d: totalSpend,
    averageCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    topObjectives,
  };
}

// ─── Full Meta Ads Snapshot ─────────────────────────────────────────────────

export interface MetaAdsSnapshot {
  accounts: MetaAdAccountSummary[];
  campaigns: MetaCampaignPerformance[];
  audience: MetaAudienceInsight;
}

export async function getMetaAdsSnapshot(connection: UserConnection): Promise<MetaAdsSnapshot> {
  const accessToken = await refreshMetaToken(connection);

  const [accounts, campaigns, audience] = await Promise.all([
    getAdAccountSummary(accessToken),
    getCampaignPerformance(accessToken, 30),
    getAudienceInsights(accessToken),
  ]);

  return { accounts, campaigns, audience };
}
