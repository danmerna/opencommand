/**
 * TikTok Ads Integration
 * Fetches live ad campaign data for the Socratic Intent Engine context assembly.
 * Uses TikTok Marketing API v1.3 with OAuth2 token refresh.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshTikTokToken(connection: UserConnection): Promise<string> {
  const accessToken = connection.accessToken ?? "";

  if (!connection.tokenExpiresAt) return accessToken;

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return accessToken;

  if (!connection.refreshToken) {
    throw new Error("TikTok Ads token expired and no refresh token available. Please reconnect.");
  }

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: ENV.tiktokAppId,
      secret: ENV.tiktokAppSecret,
      auth_code: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    data?: { access_token?: string; expires_in?: number };
    code?: number;
  };

  if (!data.data?.access_token) {
    throw new Error("TikTok token refresh returned no access token");
  }

  const newAccessToken = data.data.access_token;
  const newExpiresAt = data.data.expires_in
    ? new Date(Date.now() + data.data.expires_in * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

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

// ─── TikTok API Helper ─────────────────────────────────────────────────────

async function tiktokGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://business-api.tiktok.com/open_api/v1.3${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "Access-Token": accessToken },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikTok API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function tiktokPost<T>(path: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://business-api.tiktok.com/open_api/v1.3${path}`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TikTok API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Advertiser Info ────────────────────────────────────────────────────────

export interface TikTokAdvertiserInfo {
  advertiserId: string;
  advertiserName: string;
  currency: string;
  timezone: string;
}

export async function getAdvertiserInfo(accessToken: string, advertiserId: string): Promise<TikTokAdvertiserInfo> {
  const data = await tiktokGet<{
    data?: { list?: Array<{ advertiser_id?: string; advertiser_name?: string; currency?: string; timezone?: string }> };
  }>("/advertiser/info/", accessToken, {
    advertiser_ids: JSON.stringify([advertiserId]),
  }).catch(() => ({ data: { list: [] } }));

  const info = data.data?.list?.[0];
  return {
    advertiserId: info?.advertiser_id ?? advertiserId,
    advertiserName: info?.advertiser_name ?? advertiserId,
    currency: info?.currency ?? "USD",
    timezone: info?.timezone ?? "UTC",
  };
}

// ─── Campaign Performance ───────────────────────────────────────────────────

export interface TikTokCampaignPerformance {
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

export async function getCampaignPerformance(
  accessToken: string,
  advertiserId: string,
  days = 30
): Promise<TikTokCampaignPerformance[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const data = await tiktokPost<{
    data?: {
      list?: Array<{
        dimensions?: { campaign_id?: string };
        metrics?: {
          campaign_name?: string;
          spend?: string;
          impressions?: string;
          clicks?: string;
          ctr?: string;
          cpc?: string;
          conversion?: string;
          cost_per_conversion?: string;
          objective_type?: string;
        };
      }>;
    };
  }>("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_CAMPAIGN",
    dimensions: ["campaign_id"],
    metrics: [
      "campaign_name", "spend", "impressions", "clicks",
      "ctr", "cpc", "conversion", "cost_per_conversion", "objective_type",
    ],
    start_date: startDate,
    end_date: endDate,
    page_size: 20,
    page: 1,
  }).catch(() => ({ data: { list: [] } }));

  return (data.data?.list ?? []).map(row => {
    const m = row.metrics ?? {};
    const spend = parseFloat(m.spend ?? "0");
    const conversions = parseFloat(m.conversion ?? "0");

    return {
      campaignName: m.campaign_name ?? "Unnamed",
      status: "ACTIVE",
      objective: m.objective_type ?? "UNKNOWN",
      spend,
      impressions: parseInt(m.impressions ?? "0"),
      clicks: parseInt(m.clicks ?? "0"),
      ctr: parseFloat(m.ctr ?? "0"),
      cpc: parseFloat(m.cpc ?? "0"),
      conversions,
      costPerConversion: conversions > 0 ? spend / conversions : 0,
    };
  }).sort((a, b) => b.spend - a.spend);
}

// ─── Spend Summary ──────────────────────────────────────────────────────────

export interface TikTokSpendSummary {
  totalSpend30d: number;
  totalImpressions30d: number;
  totalClicks30d: number;
  totalConversions30d: number;
  averageCPM: number;
}

export async function getSpendSummary(
  accessToken: string,
  advertiserId: string
): Promise<TikTokSpendSummary> {
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const data = await tiktokPost<{
    data?: {
      list?: Array<{
        metrics?: {
          spend?: string;
          impressions?: string;
          clicks?: string;
          conversion?: string;
        };
      }>;
    };
  }>("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_ADVERTISER",
    dimensions: ["advertiser_id"],
    metrics: ["spend", "impressions", "clicks", "conversion"],
    start_date: startDate,
    end_date: endDate,
    page_size: 1,
    page: 1,
  }).catch(() => ({ data: { list: [] } }));

  const row = data.data?.list?.[0]?.metrics;
  const totalSpend = parseFloat(row?.spend ?? "0");
  const totalImpressions = parseInt(row?.impressions ?? "0");

  return {
    totalSpend30d: totalSpend,
    totalImpressions30d: totalImpressions,
    totalClicks30d: parseInt(row?.clicks ?? "0"),
    totalConversions30d: parseFloat(row?.conversion ?? "0"),
    averageCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
  };
}

// ─── Full TikTok Ads Snapshot ───────────────────────────────────────────────

export interface TikTokAdsSnapshot {
  advertiser: TikTokAdvertiserInfo;
  campaigns: TikTokCampaignPerformance[];
  spend: TikTokSpendSummary;
}

// ─── Display Metrics for Socratic Engine ─────────────────────────────────────

import type { DataSourceCard } from "../../shared/types";

export function getTikTokAdsDisplayMetrics(snapshot: TikTokAdsSnapshot): DataSourceCard {
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toFixed(0)}`;
  return {
    sourceId: "tiktok_ads",
    sourceName: "TikTok Ads",
    sourceColor: "#010101",
    metrics: [
      { label: "Active campaigns", value: `${snapshot.campaigns.filter(c => c.status === "CAMPAIGN_STATUS_ENABLE").length}` },
      { label: "Spend (30d)", value: fmt(snapshot.spend.totalSpend30d) },
      { label: "Clicks (30d)", value: snapshot.spend.totalClicks30d.toLocaleString() },
      { label: "Conversions", value: `${snapshot.spend.totalConversions30d.toFixed(0)}` },
    ],
  };
}

export async function getTikTokAdsSnapshot(connection: UserConnection): Promise<TikTokAdsSnapshot> {
  const accessToken = await refreshTikTokToken(connection);
  const advertiserId = (connection.metadata as any)?.advertiserId ?? connection.accountId ?? "";

  const [advertiser, campaigns, spend] = await Promise.all([
    getAdvertiserInfo(accessToken, advertiserId),
    getCampaignPerformance(accessToken, advertiserId, 30),
    getSpendSummary(accessToken, advertiserId),
  ]);

  return { advertiser, campaigns, spend };
}
