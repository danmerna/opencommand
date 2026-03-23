/**
 * Google Ads Integration
 * Fetches live ad campaign data for the Socratic Intent Engine context assembly.
 * Uses Google Ads REST API (v16) with OAuth2 token refresh.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshGoogleToken(connection: UserConnection): Promise<string> {
  const accessToken = connection.accessToken ?? "";

  if (!connection.tokenExpiresAt) return accessToken;

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return accessToken;

  if (!connection.refreshToken) {
    throw new Error("Google Ads token expired and no refresh token available. Please reconnect.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.googleAdsClientId,
      client_secret: ENV.googleAdsClientSecret,
      refresh_token: connection.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  const newAccessToken = data.access_token;
  const newExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000);

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

// ─── Google Ads API Helper ──────────────────────────────────────────────────

async function googleAdsQuery<T>(
  accessToken: string,
  customerId: string,
  query: string,
  developerToken: string
): Promise<T> {
  const res = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Account Summary ────────────────────────────────────────────────────────

export interface GoogleAdsAccountSummary {
  customerId: string;
  accountName: string;
  currencyCode: string;
  totalCampaigns: number;
  activeCampaigns: number;
}

export async function getAccountSummary(
  accessToken: string,
  customerId: string,
  developerToken: string
): Promise<GoogleAdsAccountSummary> {
  const query = `
    SELECT customer.descriptive_name, customer.currency_code,
           campaign.id, campaign.status
    FROM campaign
    LIMIT 100
  `;

  const data = await googleAdsQuery<Array<{
    results?: Array<{
      customer?: { descriptiveName?: string; currencyCode?: string };
      campaign?: { id?: string; status?: string };
    }>;
  }>>(accessToken, customerId, query, developerToken).catch(() => []);

  const results = Array.isArray(data) ? (data[0]?.results ?? []) : [];
  const accountName = results[0]?.customer?.descriptiveName ?? customerId;
  const currencyCode = results[0]?.customer?.currencyCode ?? "USD";
  const activeCampaigns = results.filter(r => r.campaign?.status === "ENABLED").length;

  return {
    customerId,
    accountName,
    currencyCode,
    totalCampaigns: results.length,
    activeCampaigns,
  };
}

// ─── Campaign Performance ───────────────────────────────────────────────────

export interface GoogleAdsCampaignPerformance {
  campaignName: string;
  status: string;
  type: string;
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
  customerId: string,
  developerToken: string,
  days = 30
): Promise<GoogleAdsCampaignPerformance[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const query = `
    SELECT campaign.name, campaign.status, campaign.advertising_channel_type,
           metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.average_cpc, metrics.conversions,
           metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const data = await googleAdsQuery<Array<{
    results?: Array<{
      campaign?: { name?: string; status?: string; advertisingChannelType?: string };
      metrics?: {
        costMicros?: string;
        impressions?: string;
        clicks?: string;
        ctr?: number;
        averageCpc?: string;
        conversions?: number;
        costPerConversion?: string;
      };
    }>;
  }>>(accessToken, customerId, query, developerToken).catch(() => []);

  const results = Array.isArray(data) ? (data[0]?.results ?? []) : [];

  return results.map(r => {
    const costMicros = parseInt(r.metrics?.costMicros ?? "0");
    const spend = costMicros / 1_000_000;
    const clicks = parseInt(r.metrics?.clicks ?? "0");
    const conversions = r.metrics?.conversions ?? 0;

    return {
      campaignName: r.campaign?.name ?? "Unnamed",
      status: r.campaign?.status ?? "UNKNOWN",
      type: r.campaign?.advertisingChannelType ?? "UNKNOWN",
      spend,
      impressions: parseInt(r.metrics?.impressions ?? "0"),
      clicks,
      ctr: r.metrics?.ctr ?? 0,
      cpc: parseInt(r.metrics?.averageCpc ?? "0") / 1_000_000,
      conversions,
      costPerConversion: conversions > 0 ? spend / conversions : 0,
    };
  });
}

// ─── Spend Summary ──────────────────────────────────────────────────────────

export interface GoogleAdsSpendSummary {
  totalSpend30d: number;
  totalImpressions30d: number;
  totalClicks30d: number;
  totalConversions30d: number;
  averageCPM: number;
  topChannelTypes: string[];
}

export async function getSpendSummary(
  accessToken: string,
  customerId: string,
  developerToken: string
): Promise<GoogleAdsSpendSummary> {
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const query = `
    SELECT campaign.advertising_channel_type,
           metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
  `;

  const data = await googleAdsQuery<Array<{
    results?: Array<{
      campaign?: { advertisingChannelType?: string };
      metrics?: { costMicros?: string; impressions?: string; clicks?: string; conversions?: number };
    }>;
  }>>(accessToken, customerId, query, developerToken).catch(() => []);

  const results = Array.isArray(data) ? (data[0]?.results ?? []) : [];

  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  const channelCounts: Record<string, number> = {};

  for (const r of results) {
    totalSpend += parseInt(r.metrics?.costMicros ?? "0") / 1_000_000;
    totalImpressions += parseInt(r.metrics?.impressions ?? "0");
    totalClicks += parseInt(r.metrics?.clicks ?? "0");
    totalConversions += r.metrics?.conversions ?? 0;
    const ch = r.campaign?.advertisingChannelType ?? "UNKNOWN";
    channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
  }

  const topChannelTypes = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    totalSpend30d: totalSpend,
    totalImpressions30d: totalImpressions,
    totalClicks30d: totalClicks,
    totalConversions30d: totalConversions,
    averageCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    topChannelTypes,
  };
}

// ─── Full Google Ads Snapshot ───────────────────────────────────────────────

export interface GoogleAdsSnapshot {
  account: GoogleAdsAccountSummary;
  campaigns: GoogleAdsCampaignPerformance[];
  spend: GoogleAdsSpendSummary;
}

export async function getGoogleAdsSnapshot(connection: UserConnection): Promise<GoogleAdsSnapshot> {
  const accessToken = await refreshGoogleToken(connection);
  const customerId = (connection.metadata as any)?.customerId ?? connection.accountId ?? "";
  const developerToken = ENV.googleAdsDeveloperToken;

  const [account, campaigns, spend] = await Promise.all([
    getAccountSummary(accessToken, customerId, developerToken),
    getCampaignPerformance(accessToken, customerId, developerToken, 30),
    getSpendSummary(accessToken, customerId, developerToken),
  ]);

  return { account, campaigns, spend };
}
