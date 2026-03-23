/**
 * Context Assembler — Socratic Intent Engine Orchestrator
 *
 * Given a user request and userId, this module:
 * 1. Detects connected tools
 * 2. Infers which tool categories are relevant via LLM
 * 3. Pulls live data from connected tools (HubSpot, etc.)
 * 4. Assembles a rich context object via LLM
 * 5. Stores the context in the contextObjects table
 * 6. Returns data-informed Socratic questions
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
import { getHubSpotSnapshot, type HubSpotSnapshot } from "./hubspot";
import type { UserConnection } from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssembledContext {
  contextId: number;
  questions: string[];
  insights: string[];
  contextSummary: string;
  suggestedParameters: Record<string, unknown>;
  liveState: Record<string, unknown>;
  hasLiveData: boolean;
  connectedProviders: string[];
}

interface LLMCategoryInference {
  relevantCategories: string[];
  reasoning: string;
}

interface LLMContextAssembly {
  insights: string[];
  questions: string[];
  suggestedParameters: Record<string, unknown>;
  domain: string;
}

// ─── Category Inference ───────────────────────────────────────────────────────

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

// ─── Live Data Fetcher ────────────────────────────────────────────────────────

async function fetchLiveData(
  relevantCategories: string[],
  connections: Array<UserConnection & { providerSlug: string; categorySlug: string }>
): Promise<Record<string, unknown>> {
  const liveState: Record<string, unknown> = {};

  for (const conn of connections) {
    if (!relevantCategories.includes(conn.categorySlug)) continue;
    if (conn.status !== "connected") continue;

    try {
      if (conn.providerSlug === "hubspot") {
        const snapshot: HubSpotSnapshot = await getHubSpotSnapshot(conn);
        liveState.hubspot = snapshot;
      }
      // Future: add mailchimp, stripe_connect, slack, etc.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ContextAssembler] Failed to fetch data from ${conn.providerSlug}:`, message);
      liveState[conn.providerSlug] = { error: message };
    }
  }

  return liveState;
}

// ─── Context Summary Builder ──────────────────────────────────────────────────

function buildContextSummary(liveState: Record<string, unknown>): string {
  const parts: string[] = [];

  const hs = liveState.hubspot as HubSpotSnapshot | undefined;
  if (hs) {
    const { contacts, pipeline, closedWon30d, velocity } = hs;
    parts.push(
      `HubSpot: ${contacts.totalContacts} contacts · ${pipeline.totalOpenDeals} open deals · $${Math.round(pipeline.totalPipelineValue / 1000)}K pipeline · ${closedWon30d.length} closed last 30d`
    );
    if (velocity.stalledCount > 0) {
      parts.push(`${velocity.stalledCount} stalled deals worth $${Math.round(velocity.totalStalledValue / 1000)}K`);
    }
  }

  return parts.join(" · ") || "No live data available";
}

// ─── LLM Context Assembly ─────────────────────────────────────────────────────

async function assembleLLMContext(
  requestText: string,
  liveState: Record<string, unknown>
): Promise<LLMContextAssembly> {
  const hasData = Object.keys(liveState).length > 0;

  const systemPrompt = hasData
    ? `You are the Socratic Intent Engine for OpenCommand. Your job is to ask the smartest possible clarifying questions before any work begins. You have access to the user's live business data from their connected tools.

Based on this REAL data from their actual business tools, generate a JSON response with:
1. "insights": Array of 3-5 specific patterns or observations you identified in their data. Be specific with numbers.
2. "questions": Array of 3-5 clarifying questions that demonstrate you already understand their business. Reference specific numbers, segments, patterns from the data. Do NOT ask generic questions — instead ask things like "Your pipeline shows $847K across 47 deals, with 80% of recent wins coming from manufacturing. Should we target that segment, or are you looking to diversify?"
3. "suggestedParameters": Object with pre-filled values you'd recommend based on the data (targetSegment, estimatedBudget, recommendedChannel, timeframe, etc.)
4. "domain": The business domain of the request (e.g., "sales/marketing", "operations", "finance")

Respond with ONLY valid JSON, no markdown formatting.`
    : `You are the Socratic Intent Engine for OpenCommand. The user has no connected tools, so ask smart generic clarifying questions to understand their goal.

Generate:
1. "insights": Array of 2-3 general observations about the type of request
2. "questions": Array of 3-5 clarifying questions to understand scope, budget, timeline, and success criteria
3. "suggestedParameters": Object with reasonable default parameters
4. "domain": The business domain of the request

Respond with ONLY valid JSON, no markdown formatting.`;

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
        name: "context_assembly",
        strict: true,
        schema: {
          type: "object",
          properties: {
            insights: { type: "array", items: { type: "string" } },
            questions: { type: "array", items: { type: "string" } },
            suggestedParameters: { type: "object", additionalProperties: true },
            domain: { type: "string" },
          },
          required: ["insights", "questions", "suggestedParameters", "domain"],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(response.choices[0].message.content as string) as LLMContextAssembly;
}

// ─── Main Assembler ───────────────────────────────────────────────────────────

export async function assembleContext(
  requestText: string,
  userId: number
): Promise<AssembledContext> {
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

  // 3. Pull live data from relevant connected tools
  const liveState = await fetchLiveData(relevantSlugs, connectedConnections);

  // 4. Assemble context via LLM
  const assembled = await assembleLLMContext(requestText, liveState);

  // 5. Store in contextObjects table
  const result = await db.insert(contextObjects).values({
    userId,
    requestText,
    inferredDomain: assembled.domain,
    inferredCategories: relevantSlugs,
    userProfile: { connectedTools: connectedProviders, connectedCategories: connectedCategoryNames },
    liveState,
    recentHistory: {},
    inferredInsights: assembled.insights,
    suggestedParameters: assembled.suggestedParameters,
    contextualizedQuestions: assembled.questions,
    status: "ready",
  });

  const contextId = Number((result as any)[0]?.insertId ?? 0);

  return {
    contextId,
    questions: assembled.questions,
    insights: assembled.insights,
    contextSummary: buildContextSummary(liveState),
    suggestedParameters: assembled.suggestedParameters,
    liveState,
    hasLiveData: Object.keys(liveState).length > 0,
    connectedProviders,
  };
}
