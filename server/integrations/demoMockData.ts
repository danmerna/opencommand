/**
 * Demo Mock Data — Realistic business metrics for the demo user
 *
 * These snapshots are returned instead of real API calls when the user
 * has a connection with accessToken === "DEMO_MODE".
 *
 * The fictional company: "Meridian Software" — a B2B SaaS startup
 * with $2.4M ARR, growing 40% YoY, 180 customers.
 */

import type { SalesforceSnapshot } from "./salesforce";
import type { MetaAdsSnapshot } from "./metaAds";
import type { GoogleAdsSnapshot } from "./googleAds";
import type { GA4Snapshot } from "./ga4";
import type { HubSpotSnapshot } from "./hubspot";

export const DEMO_TOKEN = "DEMO_MODE";

export function isDemoConnection(accessToken: string | null | undefined): boolean {
  return accessToken === DEMO_TOKEN;
}

// ─── Salesforce Mock ──────────────────────────────────────────────────────────

export const DEMO_SALESFORCE: SalesforceSnapshot = {
  contacts: {
    totalContacts: 1247,
    totalLeads: 342,
    recentLeads30d: 54,
    topAccounts: ["Apex Manufacturing", "BlueStar Logistics", "Cascade Health", "Dune Analytics", "Ironclad Ventures"],
    topIndustries: ["Manufacturing", "Logistics", "Healthcare", "Technology", "Finance"],
  },
  pipeline: {
    totalOpenOpportunities: 63,
    totalPipelineValue: 847000,
    averageDealSize: 13444,
    opportunitiesByStage: [
      { stageName: "Prospecting", count: 18, totalValue: 241000 },
      { stageName: "Qualification", count: 14, totalValue: 188000 },
      { stageName: "Proposal/Price Quote", count: 12, totalValue: 198000 },
      { stageName: "Negotiation/Review", count: 11, totalValue: 148000 },
      { stageName: "Closed Won", count: 8, totalValue: 72000 },
    ],
  },
  closedWon30d: [
    { opportunityName: "Apex Manufacturing — Enterprise License", amount: 24000, accountName: "Apex Manufacturing", closeDate: "2026-03-10" },
    { opportunityName: "BlueStar Logistics — Pro Plan", amount: 18000, accountName: "BlueStar Logistics", closeDate: "2026-03-14" },
    { opportunityName: "Cascade Health — Starter", amount: 8400, accountName: "Cascade Health", closeDate: "2026-03-19" },
    { opportunityName: "Dune Analytics — Growth", amount: 12600, accountName: "Dune Analytics", closeDate: "2026-03-22" },
  ],
  velocity: {
    stalledOpportunities: [
      { name: "TerraVault Systems", stageName: "Negotiation/Review", daysStalled: 22, amount: 31000 },
      { name: "Pinnacle Group", stageName: "Proposal/Price Quote", daysStalled: 18, amount: 24500 },
      { name: "Orion Retail", stageName: "Qualification", daysStalled: 16, amount: 14200 },
    ],
    totalStalledValue: 121000,
    stalledCount: 9,
  },
};

// ─── HubSpot Mock ─────────────────────────────────────────────────────────────

export const DEMO_HUBSPOT: HubSpotSnapshot = {
  contacts: {
    totalContacts: 3841,
    recentAdditions30d: 214,
    topCompanies: ["Ironclad Ventures", "Northgate Systems", "Prism Digital", "Summit Capital", "Vertex Labs"],
    topIndustries: ["SaaS", "Finance", "Marketing", "E-commerce", "Healthcare"],
  },
  pipeline: {
    totalOpenDeals: 47,
    totalPipelineValue: 612000,
    averageDealSize: 13021,
    dealsByStage: [
      { stageName: "Appointment Scheduled", count: 12, totalValue: 156000 },
      { stageName: "Qualified to Buy", count: 10, totalValue: 130000 },
      { stageName: "Presentation Scheduled", count: 9, totalValue: 117000 },
      { stageName: "Decision Maker Bought-In", count: 8, totalValue: 104000 },
      { stageName: "Contract Sent", count: 8, totalValue: 105000 },
    ],
  },
  closedWon30d: [
    { dealName: "Ironclad Ventures", amount: 21000, industry: "Finance", closeDate: "2026-03-08" },
    { dealName: "Northgate Systems", amount: 15600, industry: "Technology", closeDate: "2026-03-15" },
    { dealName: "Prism Digital", amount: 9800, industry: "Marketing", closeDate: "2026-03-20" },
  ],
  velocity: {
    stalledDeals: [
      { dealName: "Summit Capital", stageName: "Qualified to Buy", daysStalled: 19, amount: 28000 },
      { dealName: "Vertex Labs", stageName: "Presentation Scheduled", daysStalled: 15, amount: 17500 },
    ],
    totalStalledValue: 91000,
    stalledCount: 7,
  },
};

// ─── Meta Ads Mock ────────────────────────────────────────────────────────────

export const DEMO_META_ADS: MetaAdsSnapshot = {
  accounts: [
    {
      accountId: "act_demo_001",
      accountName: "Meridian Software — Main",
      currency: "USD",
      totalCampaigns: 6,
      activeCampaigns: 4,
    },
  ],
  campaigns: [
    {
      campaignName: "Q1 Lead Gen — Decision Makers",
      status: "ACTIVE",
      objective: "LEAD_GENERATION",
      spend: 4820,
      impressions: 312000,
      clicks: 4368,
      ctr: 1.4,
      cpc: 1.10,
      conversions: 87,
      costPerConversion: 55.4,
    },
    {
      campaignName: "Retargeting — Trial Users",
      status: "ACTIVE",
      objective: "CONVERSIONS",
      spend: 2140,
      impressions: 98000,
      clicks: 2940,
      ctr: 3.0,
      cpc: 0.73,
      conversions: 124,
      costPerConversion: 17.3,
    },
    {
      campaignName: "Brand Awareness — SaaS Founders",
      status: "ACTIVE",
      objective: "BRAND_AWARENESS",
      spend: 1200,
      impressions: 480000,
      clicks: 960,
      ctr: 0.2,
      cpc: 1.25,
      conversions: 12,
      costPerConversion: 100.0,
    },
    {
      campaignName: "Lookalike — Closed Won Customers",
      status: "ACTIVE",
      objective: "LEAD_GENERATION",
      spend: 3100,
      impressions: 201000,
      clicks: 3618,
      ctr: 1.8,
      cpc: 0.86,
      conversions: 68,
      costPerConversion: 45.6,
    },
  ],
  audience: {
    totalReach30d: 890000,
    totalSpend30d: 11260,
    averageCPM: 10.3,
    topObjectives: ["LEAD_GENERATION", "CONVERSIONS", "BRAND_AWARENESS"],
  },
};

// ─── Google Ads Mock ──────────────────────────────────────────────────────────

export const DEMO_GOOGLE_ADS: GoogleAdsSnapshot = {
  account: {
    customerId: "demo-customer",
    accountName: "Meridian Software",
    currencyCode: "USD",
    totalCampaigns: 7,
    activeCampaigns: 5,
  },
  campaigns: [
    {
      campaignName: "Search — B2B SaaS Keywords",
      status: "ENABLED",
      type: "SEARCH",
      spend: 5840,
      impressions: 48200,
      clicks: 2892,
      ctr: 6.0,
      cpc: 2.02,
      conversions: 144,
      costPerConversion: 40.6,
    },
    {
      campaignName: "Performance Max — All Channels",
      status: "ENABLED",
      type: "PERFORMANCE_MAX",
      spend: 4200,
      impressions: 620000,
      clicks: 4340,
      ctr: 0.7,
      cpc: 0.97,
      conversions: 98,
      costPerConversion: 42.9,
    },
    {
      campaignName: "Display — Competitor Retargeting",
      status: "ENABLED",
      type: "DISPLAY",
      spend: 1800,
      impressions: 890000,
      clicks: 1602,
      ctr: 0.18,
      cpc: 1.12,
      conversions: 31,
      costPerConversion: 58.1,
    },
    {
      campaignName: "YouTube — Product Demo",
      status: "ENABLED",
      type: "VIDEO",
      spend: 2100,
      impressions: 142000,
      clicks: 1278,
      ctr: 0.9,
      cpc: 1.64,
      conversions: 24,
      costPerConversion: 87.5,
    },
    {
      campaignName: "RLSA — High Intent Visitors",
      status: "ENABLED",
      type: "SEARCH",
      spend: 3200,
      impressions: 22400,
      clicks: 2688,
      ctr: 12.0,
      cpc: 1.19,
      conversions: 201,
      costPerConversion: 15.9,
    },
  ],
  spend: {
    totalSpend30d: 17140,
    totalImpressions30d: 1722600,
    totalClicks30d: 12800,
    totalConversions30d: 498,
    averageCPM: 9.95,
    topChannelTypes: ["SEARCH", "PERFORMANCE_MAX", "DISPLAY", "VIDEO"],
  },
};

// ─── GA4 Mock ─────────────────────────────────────────────────────────────────

export const DEMO_GA4: GA4Snapshot = {
  traffic: {
    totalUsers30d: 28400,
    totalSessions30d: 41200,
    totalPageviews30d: 118600,
    avgSessionDuration: 214,
    bounceRate: 42.3,
    newVsReturning: { newUsers: 17551, returningUsers: 10849 },
  },
  sources: [
    { source: "google", medium: "cpc", sessions: 12840, users: 9120, conversions: 498 },
    { source: "facebook", medium: "cpc", sessions: 7200, users: 5400, conversions: 211 },
    { source: "google", medium: "organic", sessions: 8640, users: 7200, conversions: 142 },
    { source: "direct", medium: "(none)", sessions: 6200, users: 4800, conversions: 88 },
    { source: "linkedin", medium: "social", sessions: 3100, users: 2600, conversions: 64 },
    { source: "email", medium: "email", sessions: 2120, users: 1840, conversions: 97 },
    { source: "referral", medium: "referral", sessions: 1100, users: 940, conversions: 22 },
  ],
  topPages: [
    { pagePath: "/", pageviews: 22400, avgTimeOnPage: 48, bounceRate: 58.2 },
    { pagePath: "/pricing", pageviews: 14800, avgTimeOnPage: 142, bounceRate: 31.4 },
    { pagePath: "/features", pageviews: 11200, avgTimeOnPage: 118, bounceRate: 38.7 },
    { pagePath: "/demo", pageviews: 8400, avgTimeOnPage: 196, bounceRate: 22.1 },
    { pagePath: "/blog/roi-calculator", pageviews: 6200, avgTimeOnPage: 284, bounceRate: 18.4 },
  ],
  conversions: {
    totalConversions30d: 1122,
    conversionRate: 2.72,
    topConversionEvents: [
      { eventName: "sign_up", count: 487 },
      { eventName: "demo_request", count: 312 },
      { eventName: "trial_start", count: 198 },
      { eventName: "pricing_view", count: 125 },
    ],
  },
};
