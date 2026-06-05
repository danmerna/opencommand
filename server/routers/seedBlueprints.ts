/**
 * Auto-seed 3 blueprint templates for a new user on first onboarding completion.
 */
import { blueprintTemplates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";

async function getDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Template Data ───────────────────────────────────────────────────────────

const tradingNodes = [
  { id: "trigger-1", type: "trigger", position: { x: 400, y: 40 }, data: { label: "Market Open Trigger", triggerType: "scheduled", schedule: "0 9 * * 1-5", description: "Fires at 9:00 AM Mon–Fri (market open)" }},
  { id: "workflow-1", type: "workflow", position: { x: 200, y: 160 }, data: { label: "Market Scan Workflow", description: "Scan Polymarket for high-confidence opportunities", parallelPaths: false, sequenceOrder: 1 }},
  { id: "workflow-2", type: "workflow", position: { x: 600, y: 160 }, data: { label: "Position Sizing Workflow", description: "Calculate optimal position size based on confidence and risk budget", parallelPaths: false, sequenceOrder: 2 }},
  { id: "agent-1", type: "agent", position: { x: 100, y: 300 }, data: { label: "Market Scanner", role: "Market Intelligence Agent", mission: "Monitor Polymarket for high-confidence prediction opportunities. Score each market by liquidity, volume, and edge.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "polymarket_api", "news_feed"], guardrails: ["Only scan markets with >$10K liquidity", "Minimum 65% confidence threshold"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-2", type: "agent", position: { x: 400, y: 300 }, data: { label: "Event Analyst", role: "Fundamental Analysis Agent", mission: "Analyze the underlying event for each flagged market. Assess probability using news, data, and historical patterns.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "news_feed", "data_api"], guardrails: ["Cross-reference minimum 3 sources", "Flag conflicting signals"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-3", type: "agent", position: { x: 700, y: 300 }, data: { label: "Position Manager", role: "Execution Agent", mission: "Execute approved trades on Polymarket within defined risk parameters. Track open positions and manage exits.", model: "gpt-4o", autonomyLevel: "L1", tools: ["polymarket_api", "portfolio_tracker"], guardrails: ["Max 15% portfolio in single market", "Stop-loss at -20% per position"], verifierModel: "claude-3-5-sonnet-20241022", useCouncil: true, quorum: "2/3" }},
  { id: "verify-1", type: "verification", position: { x: 100, y: 460 }, data: { label: "Scan Verification", verifierModel: "gpt-4o-mini", criteria: "Confirm opportunity meets liquidity and confidence thresholds", useCouncil: false }},
  { id: "verify-2", type: "verification", position: { x: 400, y: 460 }, data: { label: "Analysis Verification", verifierModel: "gpt-4o-mini", criteria: "Validate probability assessment and source quality", useCouncil: false }},
  { id: "verify-3", type: "verification", position: { x: 700, y: 460 }, data: { label: "Trade Verification (Council)", verifierModel: "claude-3-5-sonnet-20241022", criteria: "Final trade approval: risk/reward ratio, position size, market conditions", useCouncil: true, quorum: "2/3" }},
  { id: "hitl-1", type: "hitl", position: { x: 700, y: 580 }, data: { label: "Trade Approval Gate", mode: "ask_permission", description: "Require human approval before executing any trade.", urgency: "high", notificationChannel: "push" }},
  { id: "goal-1", type: "goal", position: { x: 400, y: 700 }, data: { label: "Profitability Goal", objective: "Generate positive returns from Polymarket prediction markets", kpis: ["Daily P&L > 0", "Win rate > 55%", "Max drawdown < 15%"], targetMetric: "Monthly ROI > 8%", trackingFrequency: "daily" }},
];

const tradingEdges = [
  { id: "e-t1-w1", source: "trigger-1", target: "workflow-1", label: "on open" },
  { id: "e-w1-a1", source: "workflow-1", target: "agent-1" },
  { id: "e-a1-v1", source: "agent-1", target: "verify-1", label: "verify scan" },
  { id: "e-v1-a2", source: "verify-1", target: "agent-2", label: "passed" },
  { id: "e-a2-v2", source: "agent-2", target: "verify-2", label: "verify analysis" },
  { id: "e-v2-w2", source: "verify-2", target: "workflow-2", label: "passed" },
  { id: "e-w2-a3", source: "workflow-2", target: "agent-3" },
  { id: "e-a3-v3", source: "agent-3", target: "verify-3", label: "verify trade" },
  { id: "e-v3-h1", source: "verify-3", target: "hitl-1", label: "council approved" },
  { id: "e-h1-g1", source: "hitl-1", target: "goal-1", label: "human approved" },
];

const contentNodes = [
  { id: "trigger-1", type: "trigger", position: { x: 400, y: 40 }, data: { label: "Daily Content Trigger", triggerType: "scheduled", schedule: "0 7 * * *", description: "Fires at 7:00 AM daily" }},
  { id: "workflow-1", type: "workflow", position: { x: 200, y: 160 }, data: { label: "Trend Research Workflow", description: "Identify trending topics and content opportunities", parallelPaths: false, sequenceOrder: 1 }},
  { id: "workflow-2", type: "workflow", position: { x: 600, y: 160 }, data: { label: "Content Creation Workflow", description: "Draft and optimize content for each platform", parallelPaths: true, sequenceOrder: 2 }},
  { id: "agent-1", type: "agent", position: { x: 100, y: 300 }, data: { label: "Trend Researcher", role: "Market Intelligence Agent", mission: "Identify trending topics, viral content formats, and audience signals across Twitter, LinkedIn, and newsletters.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "twitter_api", "google_trends"], guardrails: ["Only surface topics with >10K engagements", "Avoid controversial political topics"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-2", type: "agent", position: { x: 400, y: 300 }, data: { label: "Content Writer", role: "Creative Content Agent", mission: "Write platform-optimized content for Twitter threads, LinkedIn articles, and newsletter sections based on research.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "grammar_check"], guardrails: ["Max 280 chars per tweet", "LinkedIn posts under 1300 chars", "Match brand voice guidelines"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-3", type: "agent", position: { x: 700, y: 300 }, data: { label: "Publisher", role: "Distribution Agent", mission: "Schedule and publish approved content across all platforms at optimal posting times.", model: "gpt-4o-mini", autonomyLevel: "L1", tools: ["twitter_api", "linkedin_api", "mailchimp"], guardrails: ["Only publish after human approval", "Respect platform rate limits"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "verify-1", type: "verification", position: { x: 100, y: 460 }, data: { label: "Trend Verification", verifierModel: "gpt-4o-mini", criteria: "Confirm topics are relevant, timely, and brand-appropriate", useCouncil: false }},
  { id: "verify-2", type: "verification", position: { x: 400, y: 460 }, data: { label: "Content Quality Check", verifierModel: "claude-3-5-sonnet-20241022", criteria: "Verify content quality, brand voice, accuracy, and platform formatting", useCouncil: false }},
  { id: "verify-3", type: "verification", position: { x: 700, y: 460 }, data: { label: "Publish Verification", verifierModel: "gpt-4o-mini", criteria: "Final check: no errors, correct handles, links work, timing is optimal", useCouncil: false }},
  { id: "hitl-1", type: "hitl", position: { x: 400, y: 580 }, data: { label: "Content Review Gate", mode: "ask_permission", description: "Review all drafted content before publishing.", urgency: "medium", notificationChannel: "push" }},
  { id: "goal-1", type: "goal", position: { x: 400, y: 700 }, data: { label: "Engagement Goal", objective: "Grow audience and engagement across all content channels", kpis: ["Avg engagement rate > 3%", "10% WoW follower growth", "Newsletter open rate > 35%"], targetMetric: "1000 new followers/month", trackingFrequency: "weekly" }},
];

const contentEdges = [
  { id: "e-t1-w1", source: "trigger-1", target: "workflow-1", label: "daily" },
  { id: "e-w1-a1", source: "workflow-1", target: "agent-1" },
  { id: "e-a1-v1", source: "agent-1", target: "verify-1" },
  { id: "e-v1-a2", source: "verify-1", target: "agent-2", label: "passed" },
  { id: "e-a2-v2", source: "agent-2", target: "verify-2" },
  { id: "e-v2-h1", source: "verify-2", target: "hitl-1", label: "quality passed" },
  { id: "e-h1-w2", source: "hitl-1", target: "workflow-2", label: "approved" },
  { id: "e-w2-a3", source: "workflow-2", target: "agent-3" },
  { id: "e-a3-v3", source: "agent-3", target: "verify-3" },
  { id: "e-v3-g1", source: "verify-3", target: "goal-1", label: "published" },
];

const intelNodes = [
  { id: "trigger-1", type: "trigger", position: { x: 400, y: 40 }, data: { label: "Weekly Intel Trigger", triggerType: "scheduled", schedule: "0 6 * * 1", description: "Fires Monday 6:00 AM — start of the week" }},
  { id: "workflow-1", type: "workflow", position: { x: 200, y: 160 }, data: { label: "Competitor Monitoring Workflow", description: "Track competitor moves, product updates, and market signals", parallelPaths: true, sequenceOrder: 1 }},
  { id: "workflow-2", type: "workflow", position: { x: 600, y: 160 }, data: { label: "Intelligence Synthesis Workflow", description: "Synthesize findings into actionable briefing", parallelPaths: false, sequenceOrder: 2 }},
  { id: "agent-1", type: "agent", position: { x: 100, y: 300 }, data: { label: "Competitor Monitor", role: "Competitive Intelligence Agent", mission: "Track competitor websites, press releases, job postings, and social media for strategic signals.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "news_feed", "linkedin_scraper"], guardrails: ["Only use publicly available data", "Flag major product launches within 2 hours"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-2", type: "agent", position: { x: 400, y: 300 }, data: { label: "Market Analyst", role: "Data Analysis Agent", mission: "Analyze market trends, industry reports, and economic indicators relevant to the business.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["web_search", "data_api", "news_feed"], guardrails: ["Cite all sources", "Flag data older than 30 days"], verifierModel: "gpt-4o-mini", useCouncil: false }},
  { id: "agent-3", type: "agent", position: { x: 700, y: 300 }, data: { label: "Briefing Writer", role: "Executive Communications Agent", mission: "Synthesize all intelligence into a concise, actionable weekly briefing for leadership.", model: "claude-3-5-sonnet-20241022", autonomyLevel: "L2", tools: ["email_api"], guardrails: ["Max 500 words", "Lead with 3 key actions", "Include confidence levels"], verifierModel: "claude-3-5-sonnet-20241022", useCouncil: true, quorum: "2/3" }},
  { id: "verify-1", type: "verification", position: { x: 100, y: 460 }, data: { label: "Intel Verification", verifierModel: "gpt-4o-mini", criteria: "Verify sources are credible and data is current", useCouncil: false }},
  { id: "verify-2", type: "verification", position: { x: 400, y: 460 }, data: { label: "Analysis Verification", verifierModel: "gpt-4o-mini", criteria: "Confirm analysis is objective and well-supported", useCouncil: false }},
  { id: "verify-3", type: "verification", position: { x: 700, y: 460 }, data: { label: "Briefing Council Review", verifierModel: "claude-3-5-sonnet-20241022", criteria: "Ensure briefing is accurate, actionable, and appropriately concise", useCouncil: true, quorum: "2/3" }},
  { id: "hitl-1", type: "hitl", position: { x: 700, y: 580 }, data: { label: "Briefing Delivery Gate", mode: "notify_complete", description: "Review the weekly intelligence briefing before it's sent to leadership.", urgency: "low", notificationChannel: "email" }},
  { id: "goal-1", type: "goal", position: { x: 400, y: 700 }, data: { label: "Intelligence Goal", objective: "Deliver actionable weekly market intelligence to leadership", kpis: ["Briefing delivered every Monday by 9 AM", "At least 3 actionable insights per briefing", "Zero missed competitor launches"], targetMetric: "100% on-time delivery", trackingFrequency: "weekly" }},
];

const intelEdges = [
  { id: "e-t1-w1", source: "trigger-1", target: "workflow-1", label: "weekly" },
  { id: "e-w1-a1", source: "workflow-1", target: "agent-1" },
  { id: "e-w1-a2", source: "workflow-1", target: "agent-2" },
  { id: "e-a1-v1", source: "agent-1", target: "verify-1" },
  { id: "e-a2-v2", source: "agent-2", target: "verify-2" },
  { id: "e-v1-w2", source: "verify-1", target: "workflow-2", label: "passed" },
  { id: "e-v2-w2", source: "verify-2", target: "workflow-2", label: "passed" },
  { id: "e-w2-a3", source: "workflow-2", target: "agent-3" },
  { id: "e-a3-v3", source: "agent-3", target: "verify-3" },
  { id: "e-v3-h1", source: "verify-3", target: "hitl-1", label: "council approved" },
  { id: "e-h1-g1", source: "hitl-1", target: "goal-1", label: "delivered" },
];

const TEMPLATES = [
  {
    ticker: "POLYMARKET-ALPHA",
    title: "Prediction Market Trader",
    description: "Autonomous trading agent for Polymarket prediction markets.",
    category: "performance",
    objective: "Generate consistent positive returns from Polymarket prediction markets.",
    desiredFinalState: "A fully autonomous trading operation that generates monthly ROI > 8% with max drawdown < 15%.",
    estimatedRuntime: "~15 min per cycle",
    nodes: tradingNodes,
    edges: tradingEdges,
  },
  {
    ticker: "CONTENT-ENGINE",
    title: "Multi-Platform Content Engine",
    description: "Daily content creation and distribution across Twitter, LinkedIn, and newsletter.",
    category: "brand",
    objective: "Grow audience and engagement by publishing high-quality, trend-aligned content daily.",
    desiredFinalState: "1000+ new followers per month with >3% average engagement rate.",
    estimatedRuntime: "~45 min per cycle",
    nodes: contentNodes,
    edges: contentEdges,
  },
  {
    ticker: "MARKET-INTEL",
    title: "Market Intelligence Engine",
    description: "Weekly competitive intelligence and market analysis for leadership.",
    category: "growth",
    objective: "Deliver actionable weekly market intelligence to leadership.",
    desiredFinalState: "100% on-time weekly briefings with at least 3 actionable insights per report.",
    estimatedRuntime: "~2 hours per cycle",
    nodes: intelNodes,
    edges: intelEdges,
  },
];

/**
 * Seed the 3 starter blueprint templates for a new user.
 * Idempotent — skips if user already has templates with these tickers.
 */
export async function seedBlueprintsForNewUser(userId: number): Promise<void> {
  const db = await getDbOrThrow();

  for (const tmpl of TEMPLATES) {
    // Check if this user already has this template
    const existing = await db
      .select({ id: blueprintTemplates.id })
      .from(blueprintTemplates)
      .where(and(eq(blueprintTemplates.userId, userId), eq(blueprintTemplates.ticker, tmpl.ticker)))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(blueprintTemplates).values({
      userId,
      ticker: tmpl.ticker,
      title: tmpl.title,
      description: tmpl.description,
      category: tmpl.category as any,
      objective: tmpl.objective,
      desiredFinalState: tmpl.desiredFinalState,
      estimatedRuntime: tmpl.estimatedRuntime,
      nodes: tmpl.nodes as any,
      edges: tmpl.edges as any,
      status: "active",
      visibility: "private",
    });
  }
}
