/**
 * Context Assembler — Socratic Intent Engine Orchestrator
 *
 * Given a user request and userId, this module:
 * 1. Detects connected tools
 * 2. Infers which tool categories are relevant via LLM
 * 3. Pulls live data from connected tools (HubSpot, etc.)
 * 4. Builds structured DataSourceCard[] from adapter snapshots
 * 5. Assembles CrossSourceInsight[] and SocraticQuestion[] via LLM
 * 6. Stores the context in the contextObjects table
 * 7. Returns a SocraticEngineResponse with structured + backward-compatible fields
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  userConnections,
  toolProviders,
  toolCategories,
  contextObjects,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getHubSpotSnapshot, getHubSpotDisplayMetrics, type HubSpotSnapshot } from "./hubspot";
import { getSalesforceSnapshot, getSalesforceDisplayMetrics, type SalesforceSnapshot } from "./salesforce";
import { getMetaAdsSnapshot, getMetaAdsDisplayMetrics, type MetaAdsSnapshot } from "./metaAds";
import { getGoogleAdsSnapshot, getGoogleAdsDisplayMetrics, type GoogleAdsSnapshot } from "./googleAds";
import { getTikTokAdsSnapshot, getTikTokAdsDisplayMetrics, type TikTokAdsSnapshot } from "./tiktokAds";
import { getGA4Snapshot, getGA4DisplayMetrics, type GA4Snapshot } from "./ga4";
import type { UserConnection } from "../../drizzle/schema";
import type {
  DataSourceCard,
  CrossSourceInsight,
  SocraticQuestion,
  SocraticEngineResponse,
} from "../../shared/types";
import {
  isDemoConnection,
  DEMO_SALESFORCE,
  DEMO_HUBSPOT,
  DEMO_META_ADS,
  DEMO_GOOGLE_ADS,
  DEMO_GA4,
} from "./demoMockData";

// ─── Legacy Type (backward compat) ──────────────────────────────────────────

export interface AssembledContext {
  contextId: number;
  questions: string[];
  insights: string[];
  contextSummary: string;
  suggestedParameters: Record<string, unknown>;
  liveState: Record<string, unknown>;
  hasLiveData: boolean;
  connectedProviders: string[];
  // New structured fields
  socratic: SocraticEngineResponse;
}

// ─── Internal LLM Types ─────────────────────────────────────────────────────

interface LLMCategoryInference {
  relevantCategories: string[];
  reasoning: string;
}

interface LLMSocraticAssembly {
  title: string;
  insights: Array<{
    text: string;
    severity: "info" | "warning" | "opportunity";
    relatedSources: string[];
  }>;
  questions: Array<{
    question: string;
    rationale: string;
    estimatedImpact: string;
    relatedSources: string[];
  }>;
  suggestedParameters: Record<string, unknown>;
  domain: string;
}

// ─── Category Inference ─────────────────────────────────────────────────────

async function inferRelevantCategories(
  requestText: string,
  connectedCategoryNames: string[],
  allCategoryNames: string[]
): Promise<string[]> {
  if (connectedCategoryNames.length === 0) return [];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a business intelligence router. Given a user's request, determine which tool categories are relevant for gathering live data context. Return ONLY categories the user actually has connected.

Connected categories: ${connectedCategoryNames.join(", ")}
All available categories: ${allCategoryNames.join(", ")}

Return JSON: { "relevantCategories": string[], "reasoning": string }
Only include categories from the connected list that are genuinely relevant to the request.`,
      },
      { role: "user", content: requestText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "category_inference",
        strict: true,
        schema: {
          type: "object",
          properties: {
            relevantCategories: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
          },
          required: ["relevantCategories", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(response.choices[0].message.content as string) as LLMCategoryInference;
  return parsed.relevantCategories;
}

// ─── Live Data Fetcher ──────────────────────────────────────────────────────

interface FetchResult {
  liveState: Record<string, unknown>;
  dataCards: DataSourceCard[];
}

async function fetchLiveData(
  relevantCategories: string[],
  connections: Array<UserConnection & { providerSlug: string; categorySlug: string }>
): Promise<FetchResult> {
  const liveState: Record<string, unknown> = {};
  const dataCards: DataSourceCard[] = [];

  for (const conn of connections) {
    if (!relevantCategories.includes(conn.categorySlug)) continue;
    if (conn.status !== "connected") continue;

    try {
      // Demo mode: return mock data instead of hitting real APIs
      if (isDemoConnection(conn.accessToken)) {
        if (conn.providerSlug === "hubspot") {
          liveState.hubspot = DEMO_HUBSPOT;
          dataCards.push(getHubSpotDisplayMetrics(DEMO_HUBSPOT as HubSpotSnapshot));
        } else if (conn.providerSlug === "salesforce") {
          liveState.salesforce = DEMO_SALESFORCE;
          dataCards.push(getSalesforceDisplayMetrics(DEMO_SALESFORCE as SalesforceSnapshot));
        } else if (conn.providerSlug === "meta_ads") {
          liveState.meta_ads = DEMO_META_ADS;
          dataCards.push(getMetaAdsDisplayMetrics(DEMO_META_ADS as MetaAdsSnapshot));
        } else if (conn.providerSlug === "google_ads") {
          liveState.google_ads = DEMO_GOOGLE_ADS;
          dataCards.push(getGoogleAdsDisplayMetrics(DEMO_GOOGLE_ADS as GoogleAdsSnapshot));
        } else if (conn.providerSlug === "ga4") {
          liveState.ga4 = DEMO_GA4;
          dataCards.push(getGA4DisplayMetrics(DEMO_GA4 as GA4Snapshot));
        }
        continue;
      }

      if (conn.providerSlug === "hubspot") {
        const snapshot = await getHubSpotSnapshot(conn);
        liveState.hubspot = snapshot;
        dataCards.push(getHubSpotDisplayMetrics(snapshot));
      } else if (conn.providerSlug === "salesforce") {
        const snapshot = await getSalesforceSnapshot(conn);
        liveState.salesforce = snapshot;
        dataCards.push(getSalesforceDisplayMetrics(snapshot));
      } else if (conn.providerSlug === "meta_ads") {
        const snapshot = await getMetaAdsSnapshot(conn);
        liveState.meta_ads = snapshot;
        dataCards.push(getMetaAdsDisplayMetrics(snapshot));
      } else if (conn.providerSlug === "google_ads") {
        const snapshot = await getGoogleAdsSnapshot(conn);
        liveState.google_ads = snapshot;
        dataCards.push(getGoogleAdsDisplayMetrics(snapshot));
      } else if (conn.providerSlug === "tiktok_ads") {
        const snapshot = await getTikTokAdsSnapshot(conn);
        liveState.tiktok_ads = snapshot;
        dataCards.push(getTikTokAdsDisplayMetrics(snapshot));
      } else if (conn.providerSlug === "ga4") {
        const snapshot = await getGA4Snapshot(conn);
        liveState.ga4 = snapshot;
        dataCards.push(getGA4DisplayMetrics(snapshot));
      }
      // Future: add mailchimp, stripe_connect, slack, etc.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ContextAssembler] Failed to fetch data from ${conn.providerSlug}:`, message);
      liveState[conn.providerSlug] = { error: message };
    }
  }

  return { liveState, dataCards };
}

// ─── Context Summary Builder (backward compat) ─────────────────────────────

function buildContextSummary(liveState: Record<string, unknown>): string {
  const parts: string[] = [];

  const hs = liveState.hubspot as HubSpotSnapshot | undefined;
  if (hs && !("error" in hs)) {
    const { contacts, pipeline, closedWon30d, velocity } = hs;
    parts.push(
      `HubSpot: ${contacts.totalContacts} contacts · ${pipeline.totalOpenDeals} open deals · $${Math.round(pipeline.totalPipelineValue / 1000)}K pipeline · ${closedWon30d.length} closed last 30d`
    );
    if (velocity.stalledCount > 0) {
      parts.push(`${velocity.stalledCount} stalled deals worth $${Math.round(velocity.totalStalledValue / 1000)}K`);
    }
  }

  const sf = liveState.salesforce as SalesforceSnapshot | undefined;
  if (sf && !("error" in sf)) {
    const { contacts, pipeline, closedWon30d, velocity } = sf;
    parts.push(
      `Salesforce: ${contacts.totalContacts} contacts · ${contacts.totalLeads} leads · ${pipeline.totalOpenOpportunities} open opps · $${Math.round(pipeline.totalPipelineValue / 1000)}K pipeline · ${closedWon30d.length} closed last 30d`
    );
    if (velocity.stalledCount > 0) {
      parts.push(`${velocity.stalledCount} stalled opps worth $${Math.round(velocity.totalStalledValue / 1000)}K`);
    }
  }

  const meta = liveState.meta_ads as MetaAdsSnapshot | undefined;
  if (meta && !("error" in meta)) {
    const activeCampaigns = meta.accounts.reduce((sum, a) => sum + a.activeCampaigns, 0);
    parts.push(
      `Meta Ads: ${meta.accounts.length} accounts · ${activeCampaigns} active campaigns · $${Math.round(meta.audience.totalSpend30d)} spend (30d) · ${Math.round(meta.audience.totalReach30d / 1000)}K reach`
    );
  }

  const gads = liveState.google_ads as GoogleAdsSnapshot | undefined;
  if (gads && !("error" in gads)) {
    parts.push(
      `Google Ads: ${gads.account.activeCampaigns} active campaigns · $${Math.round(gads.spend.totalSpend30d)} spend (30d) · ${gads.spend.totalClicks30d} clicks · ${Math.round(gads.spend.totalConversions30d)} conversions`
    );
  }

  const tt = liveState.tiktok_ads as TikTokAdsSnapshot | undefined;
  if (tt && !("error" in tt)) {
    parts.push(
      `TikTok Ads: ${tt.campaigns.length} campaigns · $${Math.round(tt.spend.totalSpend30d)} spend (30d) · ${tt.spend.totalClicks30d} clicks · ${Math.round(tt.spend.totalConversions30d)} conversions`
    );
  }

  const ga = liveState.ga4 as GA4Snapshot | undefined;
  if (ga && !("error" in ga)) {
    parts.push(
      `GA4: ${ga.traffic.totalUsers30d} users (30d) · ${ga.traffic.totalSessions30d} sessions · ${Math.round(ga.traffic.bounceRate * 100) / 100}% bounce · ${ga.conversions.totalConversions30d} conversions`
    );
  }

  return parts.join(" · ") || "No live data available";
}

// ─── LLM Socratic Assembly ──────────────────────────────────────────────────

async function assembleSocraticOutput(
  requestText: string,
  liveState: Record<string, unknown>,
  dataCards: DataSourceCard[]
): Promise<LLMSocraticAssembly> {
  const hasData = Object.keys(liveState).some(k => {
    const v = liveState[k];
    return v && typeof v === "object" && !("error" in v);
  });

  const sourceNames = dataCards.map(c => c.sourceName).join(", ");

  const systemPrompt = hasData
    ? `You are the Socratic Intent Engine for OpenCommand — a self-contextualizing intelligence platform. Your job is to analyze the user's live business data from multiple sources and generate strategic insights and Socratic questions that propose specific actions.

Connected sources: ${sourceNames}

Based on the REAL data from their actual business tools, generate a JSON response with:

1. "title": A concise 3-6 word title describing the analysis (e.g., "Full sales intelligence cross-reference", "Outbound sales optimization")

2. "insights": Array of 3-5 cross-source insights. Each insight MUST:
   - Reference specific numbers from the data (not vague statements)
   - Cross-reference data from at least 2 sources when possible
   - Include a severity: "info" (neutral observation), "warning" (needs attention), or "opportunity" (actionable upside)
   - List which sources the insight draws from in relatedSources (use source IDs: hubspot_crm, salesforce_crm, meta_ads, google_ads, tiktok_ads, google_analytics)

3. "questions": Array of 3-5 Socratic questions. Each question MUST:
   - Be phrased as "Should we..." to propose a specific executable action
   - Include a brief rationale grounded in the data
   - Include an estimated impact (dollar amount, percentage, or metric improvement)
   - List related source IDs
   - Be strategic, not administrative — these are executive-level decisions

4. "suggestedParameters": Object with pre-filled values based on the data

5. "domain": The business domain (e.g., "sales", "marketing", "operations", "finance")

Respond with ONLY valid JSON.`
    : `You are the Socratic Intent Engine for OpenCommand. The user has no connected tools. Ask smart generic clarifying questions to understand their goal.

Generate:
1. "title": A concise title for this analysis
2. "insights": Array of 2-3 general observations about the request type. Each with text, severity ("info"), and empty relatedSources.
3. "questions": Array of 3-5 clarifying questions phrased as "Should we..." proposals. Each with question, rationale, estimatedImpact, and empty relatedSources.
4. "suggestedParameters": Object with reasonable defaults
5. "domain": The business domain

Respond with ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: hasData
          ? `User's request: "${requestText}"\n\nLive data from their connected tools:\n${JSON.stringify(liveState, null, 2)}`
          : `User's request: "${requestText}"`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "socratic_assembly",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "opportunity"] },
                  relatedSources: { type: "array", items: { type: "string" } },
                },
                required: ["text", "severity", "relatedSources"],
                additionalProperties: false,
              },
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  rationale: { type: "string" },
                  estimatedImpact: { type: "string" },
                  relatedSources: { type: "array", items: { type: "string" } },
                },
                required: ["question", "rationale", "estimatedImpact", "relatedSources"],
                additionalProperties: false,
              },
            },
            suggestedParameters: { type: "object", additionalProperties: true },
            domain: { type: "string" },
          },
          required: ["title", "insights", "questions", "suggestedParameters", "domain"],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(response.choices[0].message.content as string) as LLMSocraticAssembly;
}

// ─── Main Assembler ─────────────────────────────────────────────────────────

export async function assembleContext(
  requestText: string,
  userId: number
): Promise<AssembledContext> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // 1. Get user's connected tools with provider and category slugs
  const rows = await db
    .select({
      connection: userConnections,
      providerSlug: toolProviders.slug,
      categorySlug: toolCategories.slug,
      categoryName: toolCategories.name,
    })
    .from(userConnections)
    .leftJoin(toolProviders, eq(userConnections.providerId, toolProviders.id))
    .leftJoin(toolCategories, eq(userConnections.categoryId, toolCategories.id))
    .where(and(eq(userConnections.userId, userId), eq(userConnections.status, "connected")));

  const connectedConnections = rows.map(r => ({
    ...r.connection,
    providerSlug: r.providerSlug ?? "",
    categorySlug: r.categorySlug ?? "",
    categoryName: r.categoryName ?? "",
  }));

  const connectedCategoryNames = Array.from(new Set(connectedConnections.map(c => c.categoryName).filter(Boolean)));
  const connectedProviders = connectedConnections.map(c => c.providerSlug).filter(Boolean);

  // 2. Infer relevant categories via LLM
  const allCategoriesRows = await db.select({ slug: toolCategories.slug, name: toolCategories.name }).from(toolCategories);
  const allCategoryNames = allCategoriesRows.map(c => c.name);

  const relevantCategories = connectedCategoryNames.length > 0
    ? await inferRelevantCategories(requestText, connectedCategoryNames, allCategoryNames)
    : [];

  // Map category names back to slugs for matching
  const relevantSlugs = relevantCategories.map(name => {
    const match = allCategoriesRows.find(c => c.name === name || c.slug === name);
    return match?.slug ?? name.toLowerCase().replace(/\s+/g, "_");
  });

  // 3. Pull live data from relevant connected tools + build data cards
  const { liveState, dataCards } = await fetchLiveData(relevantSlugs, connectedConnections);

  // 4. Assemble structured Socratic output via LLM
  const assembled = await assembleSocraticOutput(requestText, liveState, dataCards);

  const queryTimeMs = Date.now() - startTime;

  // 5. Store in contextObjects table
  const result = await db.insert(contextObjects).values({
    userId,
    requestText,
    inferredDomain: assembled.domain,
    inferredCategories: relevantSlugs,
    userProfile: { connectedTools: connectedProviders, connectedCategories: connectedCategoryNames },
    liveState,
    recentHistory: {},
    inferredInsights: assembled.insights.map(i => i.text),
    suggestedParameters: assembled.suggestedParameters,
    contextualizedQuestions: assembled.questions.map(q => q.question),
    status: "ready",
  });

  const contextId = Number((result as any)[0]?.insertId ?? 0);

  // 6. Build the structured SocraticEngineResponse
  const socratic: SocraticEngineResponse = {
    contextId,
    userRequest: requestText,
    title: assembled.title,
    sourceCount: dataCards.length,
    queryTimeMs,
    dataCards,
    insights: assembled.insights.map(i => ({
      text: i.text,
      severity: i.severity,
      relatedSources: i.relatedSources,
    })),
    questions: assembled.questions.map((q, idx) => ({
      id: `q-${contextId}-${idx}`,
      question: q.question,
      rationale: q.rationale,
      estimatedImpact: q.estimatedImpact,
      relatedSources: q.relatedSources,
    })),
    contextSummary: buildContextSummary(liveState),
    suggestedParameters: assembled.suggestedParameters,
    hasLiveData: dataCards.length > 0,
    connectedProviders,
  };

  // 7. Return backward-compatible + structured response
  return {
    contextId,
    questions: assembled.questions.map(q => q.question),
    insights: assembled.insights.map(i => i.text),
    contextSummary: buildContextSummary(liveState),
    suggestedParameters: assembled.suggestedParameters,
    liveState,
    hasLiveData: dataCards.length > 0,
    connectedProviders,
    socratic,
  };
}
