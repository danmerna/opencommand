/**
 * Google Analytics 4 (GA4) Integration
 * Fetches live analytics data for the Socratic Intent Engine context assembly.
 * Uses GA4 Data API v1beta with OAuth2 token refresh.
 */

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { userConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserConnection } from "../../drizzle/schema";

// ─── Token Refresh (shared with Google Ads) ─────────────────────────────────

export async function refreshGA4Token(connection: UserConnection): Promise<string> {
  const accessToken = connection.accessToken ?? "";

  if (!connection.tokenExpiresAt) return accessToken;

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now < expiresAt - fiveMinutes) return accessToken;

  if (!connection.refreshToken) {
    throw new Error("GA4 token expired and no refresh token available. Please reconnect.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.googleAdsClientId, // Same Google OAuth client
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

// ─── GA4 Data API Helper ────────────────────────────────────────────────────

async function ga4RunReport<T>(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Traffic Overview ───────────────────────────────────────────────────────

export interface GA4TrafficOverview {
  totalUsers30d: number;
  totalSessions30d: number;
  totalPageviews30d: number;
  avgSessionDuration: number;
  bounceRate: number;
  newVsReturning: { newUsers: number; returningUsers: number };
}

export async function getTrafficOverview(accessToken: string, propertyId: string): Promise<GA4TrafficOverview> {
  const data = await ga4RunReport<{
    rows?: Array<{
      metricValues?: Array<{ value?: string }>;
    }>;
  }>(accessToken, propertyId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
      { name: "newUsers" },
    ],
  }).catch(() => ({ rows: [] }));

  const vals = data.rows?.[0]?.metricValues ?? [];
  const totalUsers = parseInt(vals[0]?.value ?? "0");
  const newUsers = parseInt(vals[5]?.value ?? "0");

  return {
    totalUsers30d: totalUsers,
    totalSessions30d: parseInt(vals[1]?.value ?? "0"),
    totalPageviews30d: parseInt(vals[2]?.value ?? "0"),
    avgSessionDuration: parseFloat(vals[3]?.value ?? "0"),
    bounceRate: parseFloat(vals[4]?.value ?? "0"),
    newVsReturning: {
      newUsers,
      returningUsers: Math.max(0, totalUsers - newUsers),
    },
  };
}

// ─── Top Traffic Sources ────────────────────────────────────────────────────

export interface GA4TrafficSource {
  source: string;
  medium: string;
  users: number;
  sessions: number;
  conversions: number;
}

export async function getTopTrafficSources(accessToken: string, propertyId: string): Promise<GA4TrafficSource[]> {
  const data = await ga4RunReport<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  }>(accessToken, propertyId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "conversions" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  }).catch(() => ({ rows: [] }));

  return (data.rows ?? []).map(row => ({
    source: row.dimensionValues?.[0]?.value ?? "(direct)",
    medium: row.dimensionValues?.[1]?.value ?? "(none)",
    users: parseInt(row.metricValues?.[0]?.value ?? "0"),
    sessions: parseInt(row.metricValues?.[1]?.value ?? "0"),
    conversions: parseInt(row.metricValues?.[2]?.value ?? "0"),
  }));
}

// ─── Top Pages ──────────────────────────────────────────────────────────────

export interface GA4TopPage {
  pagePath: string;
  pageviews: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export async function getTopPages(accessToken: string, propertyId: string): Promise<GA4TopPage[]> {
  const data = await ga4RunReport<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  }>(accessToken, propertyId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  }).catch(() => ({ rows: [] }));

  return (data.rows ?? []).map(row => ({
    pagePath: row.dimensionValues?.[0]?.value ?? "/",
    pageviews: parseInt(row.metricValues?.[0]?.value ?? "0"),
    avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value ?? "0"),
    bounceRate: parseFloat(row.metricValues?.[2]?.value ?? "0"),
  }));
}

// ─── Conversion Summary ─────────────────────────────────────────────────────

export interface GA4ConversionSummary {
  totalConversions30d: number;
  conversionRate: number;
  topConversionEvents: Array<{ eventName: string; count: number }>;
}

export async function getConversionSummary(accessToken: string, propertyId: string): Promise<GA4ConversionSummary> {
  const data = await ga4RunReport<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  }>(accessToken, propertyId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "conversions" }],
    orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
    limit: 10,
  }).catch(() => ({ rows: [] }));

  const rows = data.rows ?? [];
  let totalConversions = 0;
  const topConversionEvents: Array<{ eventName: string; count: number }> = [];

  for (const row of rows) {
    const count = parseInt(row.metricValues?.[0]?.value ?? "0");
    totalConversions += count;
    topConversionEvents.push({
      eventName: row.dimensionValues?.[0]?.value ?? "unknown",
      count,
    });
  }

  // Get total sessions for conversion rate
  const sessionsData = await ga4RunReport<{
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  }>(accessToken, propertyId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    metrics: [{ name: "sessions" }],
  }).catch(() => ({ rows: [] }));

  const totalSessions = parseInt(sessionsData.rows?.[0]?.metricValues?.[0]?.value ?? "0");

  return {
    totalConversions30d: totalConversions,
    conversionRate: totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0,
    topConversionEvents: topConversionEvents.slice(0, 5),
  };
}

// ─── Full GA4 Snapshot ──────────────────────────────────────────────────────

export interface GA4Snapshot {
  traffic: GA4TrafficOverview;
  sources: GA4TrafficSource[];
  topPages: GA4TopPage[];
  conversions: GA4ConversionSummary;
}

export async function getGA4Snapshot(connection: UserConnection): Promise<GA4Snapshot> {
  const accessToken = await refreshGA4Token(connection);
  const propertyId = (connection.metadata as any)?.propertyId ?? connection.accountId ?? "";

  const [traffic, sources, topPages, conversions] = await Promise.all([
    getTrafficOverview(accessToken, propertyId),
    getTopTrafficSources(accessToken, propertyId),
    getTopPages(accessToken, propertyId),
    getConversionSummary(accessToken, propertyId),
  ]);

  return { traffic, sources, topPages, conversions };
}
