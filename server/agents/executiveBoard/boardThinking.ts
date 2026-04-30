import { invokeLLM } from "../../_core/llm";

/**
 * Executive Board thinking with 5-4-3-2-1-Σ Temporal Cascade
 * 
 * ARCH  (CEO)  — 5 Years  — Vision & Market Position
 * LEDGER (CFO) — 4 Months — Quarterly Feasibility
 * SIGNAL (CMO) — 3 Weeks  — Market Timing
 * FORGE  (CTO) — 2 Days   — Sprint Execution
 * YOU          — NOW      — The Decision
 * Σ (SIGMA)    — AFTER    — Highest-Leverage Move (synthesizes all perspectives)
 * 
 * Each executive inherits context from the one above.
 * Σ goes last, inheriting ALL perspectives, and distills them into
 * the single highest-leverage, most impactful action you can take right now.
 */

export interface BoardMember {
  role: "ceo" | "cfo" | "cmo" | "cto" | "briefing" | "sigma";
  name: string;
  codename: string;
  timeHorizon: "5-year" | "4-month" | "3-week" | "2-day" | "now" | "sigma";
  focus: string;
  color: string;
}

export const BOARD_MEMBERS: Record<string, BoardMember> = {
  ceo: {
    role: "ceo",
    name: "CEO",
    codename: "ARCH",
    timeHorizon: "5-year",
    focus: "Vision & Market Position — long-term strategic direction",
    color: "#9B59B6", // purple
  },
  cfo: {
    role: "cfo",
    name: "CFO",
    codename: "LEDGER",
    timeHorizon: "4-month",
    focus: "Quarterly Feasibility — financial health, cash flow, budget impact",
    color: "#D4A017", // gold
  },
  cmo: {
    role: "cmo",
    name: "CMO",
    codename: "SIGNAL",
    timeHorizon: "3-week",
    focus: "Market Timing — campaigns, lead generation, customer acquisition",
    color: "#2ECC71", // green
  },
  cto: {
    role: "cto",
    name: "CTO",
    codename: "FORGE",
    timeHorizon: "2-day",
    focus: "Sprint Execution — system reliability, technical debt, infrastructure",
    color: "#3498DB", // blue
  },
  briefing: {
    role: "briefing",
    name: "Morning Briefing",
    codename: "YOU",
    timeHorizon: "now",
    focus: "The Decision — immediate actions, urgent items, today's priorities",
    color: "#BDC3C7", // silver
  },
  sigma: {
    role: "sigma",
    name: "Σ",
    codename: "SIGMA",
    timeHorizon: "sigma",
    focus: "Highest-Leverage Move — synthesize all perspectives into one actionable recommendation",
    color: "#00D4AA", // sigma green
  },
};

export interface BoardQuestion {
  question: string;
  context: Record<string, any>;
  companyData: Record<string, any>;
}

export interface BoardThought {
  role: string;
  codename: string;
  timeHorizon: string;
  perspective: string;
  recommendation: string;
  confidence: number;
  rationale: string[];
}

export interface SigmaThought extends BoardThought {
  highestLeverageAction: string;
  expectedImpact: string;
  timeToExecute: string;
  riskLevel: "low" | "medium" | "high";
  prerequisitesMet: boolean;
  blockersIfAny: string[];
}

const BOARD_THOUGHT_SCHEMA = {
  type: "object" as const,
  properties: {
    perspective: { type: "string" as const },
    recommendation: { type: "string" as const },
    confidence: { type: "number" as const },
    rationale: { type: "array" as const, items: { type: "string" as const } },
  },
  required: ["perspective", "recommendation", "confidence", "rationale"] as const,
  additionalProperties: false as const,
};

async function getExecutivePerspective(
  member: BoardMember,
  question: BoardQuestion,
  priorThoughts: BoardThought[] = []
): Promise<BoardThought> {
  const priorContext = priorThoughts.length > 0
    ? `\n\nPrior Executive Perspectives (inherited context):\n${priorThoughts.map(t =>
        `${t.codename} (${t.role}, ${t.timeHorizon}): ${t.recommendation} [Confidence: ${t.confidence}%]`
      ).join("\n")}`
    : "";

  const systemPrompt = `You are ${member.codename}, the ${member.name} of the company. Your focus is: ${member.focus}.
Think about implications within your ${member.timeHorizon} time horizon.
${priorContext ? "You have inherited context from the executives above you in the cascade. Consider their perspectives but add your unique lens." : "You are the first in the cascade. Set the strategic frame."}
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}
${priorContext}

Provide your ${member.timeHorizon} perspective and recommendation as ${member.codename}.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: `${member.role}_thought`,
          strict: true,
          schema: BOARD_THOUGHT_SCHEMA,
        },
      },
    });

    const contentStr = response.choices[0]?.message?.content;
    if (!contentStr || typeof contentStr !== "string") {
      throw new Error("Invalid LLM response");
    }

    const data = JSON.parse(contentStr);
    return {
      role: member.name,
      codename: member.codename,
      timeHorizon: member.timeHorizon,
      ...data,
    };
  } catch (error) {
    console.error(`[Board] ${member.codename} perspective failed:`, error);
    throw error;
  }
}

/**
 * Get ARCH (CEO) perspective — 5-year strategic view
 */
export async function getCEOPerspective(question: BoardQuestion, priorThoughts: BoardThought[] = []): Promise<BoardThought> {
  return getExecutivePerspective(BOARD_MEMBERS.ceo, question, priorThoughts);
}

/**
 * Get LEDGER (CFO) perspective — 4-month financial view
 */
export async function getCFOPerspective(question: BoardQuestion, priorThoughts: BoardThought[] = []): Promise<BoardThought> {
  return getExecutivePerspective(BOARD_MEMBERS.cfo, question, priorThoughts);
}

/**
 * Get SIGNAL (CMO) perspective — 3-week market timing view
 */
export async function getCMOPerspective(question: BoardQuestion, priorThoughts: BoardThought[] = []): Promise<BoardThought> {
  return getExecutivePerspective(BOARD_MEMBERS.cmo, question, priorThoughts);
}

/**
 * Get FORGE (CTO) perspective — 2-day sprint execution view
 */
export async function getCTOPerspective(question: BoardQuestion, priorThoughts: BoardThought[] = []): Promise<BoardThought> {
  return getExecutivePerspective(BOARD_MEMBERS.cto, question, priorThoughts);
}

/**
 * Get Morning Briefing perspective — NOW operational view
 */
export async function getBriefingPerspective(question: BoardQuestion, priorThoughts: BoardThought[] = []): Promise<BoardThought> {
  return getExecutivePerspective(BOARD_MEMBERS.briefing, question, priorThoughts);
}

/**
 * Get Σ (SIGMA) perspective — the FINAL executive in the cascade.
 * 
 * Σ inherits ALL prior perspectives and synthesizes them into the single
 * highest-leverage, most impactful action you can take RIGHT NOW.
 * 
 * Σ does not add another time horizon — it collapses all horizons into one move.
 */
export async function getSigmaPerspective(
  question: BoardQuestion,
  priorThoughts: BoardThought[]
): Promise<SigmaThought> {
  const allPerspectives = priorThoughts.map(t =>
    `${t.codename} (${t.role}, ${t.timeHorizon}):
  Perspective: ${t.perspective}
  Recommendation: ${t.recommendation}
  Confidence: ${t.confidence}%
  Rationale: ${t.rationale.join("; ")}`
  ).join("\n\n");

  const systemPrompt = `You are Σ (Sigma) — the synthesis executive. You are the final voice in the 5-4-3-2-1-Σ Temporal Cascade.

You have just received perspectives from every executive in the cascade:
- ARCH (CEO, 5-year vision)
- LEDGER (CFO, 4-month feasibility)
- SIGNAL (CMO, 3-week market timing)
- FORGE (CTO, 2-day sprint execution)
- The user's immediate decision context (NOW)

Your job is NOT to add another perspective. Your job is to COLLAPSE all perspectives into the single highest-leverage action the user can take RIGHT NOW.

Rules:
1. The action must be executable immediately (not "plan to..." or "consider..." — an actual move)
2. It must account for all time horizons (doesn't sacrifice 5-year vision for 2-day convenience)
3. It must be specific (not "improve marketing" but "send the TractorHouse lead response to the John Deere 8R inquiry within 2 hours")
4. State the expected impact clearly
5. State how long it will take to execute
6. Identify any blockers
7. Your confidence should reflect the CONSENSUS across all executives (high agreement = high confidence)

Format your response as JSON.`;

  const userPrompt = `Original Question: ${question.question}

Company Context:
${JSON.stringify(question.companyData, null, 2)}

All Executive Perspectives:
${allPerspectives}

Now synthesize. What is the single highest-leverage move right now?`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sigma_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string", description: "Brief synthesis of all executive views" },
              recommendation: { type: "string", description: "The full recommendation narrative" },
              confidence: { type: "number", description: "0-100 based on executive consensus" },
              rationale: { type: "array", items: { type: "string" }, description: "Key reasons from across all perspectives" },
              highestLeverageAction: { type: "string", description: "The ONE specific action to take right now" },
              expectedImpact: { type: "string", description: "What this action will produce" },
              timeToExecute: { type: "string", description: "How long this action takes (e.g., '30 minutes', '2 hours')" },
              riskLevel: { type: "string", enum: ["low", "medium", "high"], description: "Risk level of the action" },
              prerequisitesMet: { type: "boolean", description: "Whether all prerequisites are in place to act now" },
              blockersIfAny: { type: "array", items: { type: "string" }, description: "Any blockers preventing immediate execution" },
            },
            required: [
              "perspective", "recommendation", "confidence", "rationale",
              "highestLeverageAction", "expectedImpact", "timeToExecute",
              "riskLevel", "prerequisitesMet", "blockersIfAny"
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const contentStr = response.choices[0]?.message?.content;
    if (!contentStr || typeof contentStr !== "string") {
      throw new Error("Invalid LLM response");
    }

    const data = JSON.parse(contentStr);
    return {
      role: "Σ",
      codename: "SIGMA",
      timeHorizon: "sigma",
      ...data,
    };
  } catch (error) {
    console.error("[Board] Σ perspective failed:", error);
    throw error;
  }
}

/**
 * Get full board cascade (5-4-3-2-1-Σ)
 * 
 * Each executive inherits context from all prior executives.
 * Σ goes LAST and synthesizes everything into one highest-leverage action.
 */
export async function getBoardCascade(question: BoardQuestion): Promise<(BoardThought | SigmaThought)[]> {
  console.log("[Board] Starting 5-4-3-2-1-Σ cascade for question:", question.question);

  const thoughts: BoardThought[] = [];

  // 5 — ARCH (CEO, 5-year)
  try {
    const archPerspective = await getCEOPerspective(question, []);
    thoughts.push(archPerspective);
    console.log("[Board] ARCH (CEO) perspective complete");
  } catch (error) {
    console.error("[Board] ARCH failed:", error);
  }

  // 4 — LEDGER (CFO, 4-month) — inherits ARCH
  try {
    const ledgerPerspective = await getCFOPerspective(question, thoughts);
    thoughts.push(ledgerPerspective);
    console.log("[Board] LEDGER (CFO) perspective complete");
  } catch (error) {
    console.error("[Board] LEDGER failed:", error);
  }

  // 3 — SIGNAL (CMO, 3-week) — inherits ARCH + LEDGER
  try {
    const signalPerspective = await getCMOPerspective(question, thoughts);
    thoughts.push(signalPerspective);
    console.log("[Board] SIGNAL (CMO) perspective complete");
  } catch (error) {
    console.error("[Board] SIGNAL failed:", error);
  }

  // 2 — FORGE (CTO, 2-day) — inherits ARCH + LEDGER + SIGNAL
  try {
    const forgePerspective = await getCTOPerspective(question, thoughts);
    thoughts.push(forgePerspective);
    console.log("[Board] FORGE (CTO) perspective complete");
  } catch (error) {
    console.error("[Board] FORGE failed:", error);
  }

  // 1 — YOU (NOW) — inherits all 4 executives
  try {
    const briefingPerspective = await getBriefingPerspective(question, thoughts);
    thoughts.push(briefingPerspective);
    console.log("[Board] YOU (Briefing) perspective complete");
  } catch (error) {
    console.error("[Board] Briefing failed:", error);
  }

  // Σ — SIGMA (AFTER) — inherits ALL perspectives, synthesizes into one move
  try {
    const sigmaPerspective = await getSigmaPerspective(question, thoughts);
    thoughts.push(sigmaPerspective);
    console.log("[Board] Σ (SIGMA) synthesis complete — highest-leverage action identified");
  } catch (error) {
    console.error("[Board] Σ failed:", error);
  }

  return thoughts;
}
