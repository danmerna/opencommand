import { invokeLLM } from "../../_core/llm";

/**
 * Executive Board thinking with 5-4-3-2-1 time horizons
 * CEO (5-year), CFO (4-month), CMO (3-week), CTO (2-day), Morning Briefing (1-day)
 */

export interface BoardMember {
  role: "ceo" | "cfo" | "cmo" | "cto" | "briefing";
  name: string;
  timeHorizon: "5-year" | "4-month" | "3-week" | "2-day" | "1-day";
  focus: string;
}

export const BOARD_MEMBERS: Record<string, BoardMember> = {
  ceo: {
    role: "ceo",
    name: "CEO",
    timeHorizon: "5-year",
    focus: "Strategic vision, market positioning, long-term growth",
  },
  cfo: {
    role: "cfo",
    name: "CFO",
    timeHorizon: "4-month",
    focus: "Financial health, cash flow, quarterly performance",
  },
  cmo: {
    role: "cmo",
    name: "CMO",
    timeHorizon: "3-week",
    focus: "Campaign performance, lead generation, customer acquisition",
  },
  cto: {
    role: "cto",
    name: "CTO",
    timeHorizon: "2-day",
    focus: "System reliability, technical debt, infrastructure",
  },
  briefing: {
    role: "briefing",
    name: "Morning Briefing",
    timeHorizon: "1-day",
    focus: "Daily operations, immediate actions, urgent items",
  },
};

export interface BoardQuestion {
  question: string;
  context: Record<string, any>;
  companyData: Record<string, any>;
}

export interface BoardThought {
  role: string;
  timeHorizon: string;
  perspective: string;
  recommendation: string;
  confidence: number;
  rationale: string[];
}

/**
 * Get CEO perspective (5-year strategic view)
 */
export async function getCEOPerspective(question: BoardQuestion): Promise<BoardThought> {
  const systemPrompt = `You are the CEO of the company. Think strategically about long-term implications (5-year horizon).
Consider market positioning, competitive advantage, and strategic opportunities.
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Strategic Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}

Provide your 5-year strategic perspective and recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ceo_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              rationale: { type: "array", items: { type: "string" } },
            },
            required: ["perspective", "recommendation", "confidence", "rationale"],
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
      role: "CEO",
      timeHorizon: "5-year",
      ...data,
    };
  } catch (error) {
    console.error("[Board] CEO perspective failed:", error);
    throw error;
  }
}

/**
 * Get CFO perspective (4-month financial view)
 */
export async function getCFOPerspective(question: BoardQuestion): Promise<BoardThought> {
  const systemPrompt = `You are the CFO of the company. Think about financial implications over 4 months.
Consider cash flow, profitability, budget impact, and financial risks.
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Financial Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}

Provide your 4-month financial perspective and recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cfo_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              rationale: { type: "array", items: { type: "string" } },
            },
            required: ["perspective", "recommendation", "confidence", "rationale"],
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
      role: "CFO",
      timeHorizon: "4-month",
      ...data,
    };
  } catch (error) {
    console.error("[Board] CFO perspective failed:", error);
    throw error;
  }
}

/**
 * Get CMO perspective (3-week marketing/sales view)
 */
export async function getCMOPerspective(question: BoardQuestion): Promise<BoardThought> {
  const systemPrompt = `You are the CMO of the company. Think about marketing and sales implications over 3 weeks.
Consider lead generation, customer acquisition, campaign performance, and market trends.
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Marketing Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}

Provide your 3-week marketing perspective and recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cmo_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              rationale: { type: "array", items: { type: "string" } },
            },
            required: ["perspective", "recommendation", "confidence", "rationale"],
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
      role: "CMO",
      timeHorizon: "3-week",
      ...data,
    };
  } catch (error) {
    console.error("[Board] CMO perspective failed:", error);
    throw error;
  }
}

/**
 * Get CTO perspective (2-day technical view)
 */
export async function getCTOPerspective(question: BoardQuestion): Promise<BoardThought> {
  const systemPrompt = `You are the CTO of the company. Think about technical implications over 2 days.
Consider system reliability, technical debt, infrastructure, security, and performance.
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Technical Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}

Provide your 2-day technical perspective and recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cto_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              rationale: { type: "array", items: { type: "string" } },
            },
            required: ["perspective", "recommendation", "confidence", "rationale"],
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
      role: "CTO",
      timeHorizon: "2-day",
      ...data,
    };
  } catch (error) {
    console.error("[Board] CTO perspective failed:", error);
    throw error;
  }
}

/**
 * Get Morning Briefing perspective (1-day operational view)
 */
export async function getBriefingPerspective(question: BoardQuestion): Promise<BoardThought> {
  const systemPrompt = `You are the Morning Briefing agent. Think about immediate operational implications over 1 day.
Consider urgent actions, immediate risks, and today's priorities.
Provide a clear recommendation with confidence level (0-100).
Format your response as JSON: { perspective, recommendation, confidence, rationale: [reasons] }`;

  const userPrompt = `Operational Question: ${question.question}

Current Context:
${JSON.stringify(question.context, null, 2)}

Company Data:
${JSON.stringify(question.companyData, null, 2)}

Provide your 1-day operational perspective and recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "briefing_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              perspective: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              rationale: { type: "array", items: { type: "string" } },
            },
            required: ["perspective", "recommendation", "confidence", "rationale"],
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
      role: "Morning Briefing",
      timeHorizon: "1-day",
      ...data,
    };
  } catch (error) {
    console.error("[Board] Briefing perspective failed:", error);
    throw error;
  }
}

/**
 * Get full board cascade (all 5 perspectives in sequence)
 */
export async function getBoardCascade(question: BoardQuestion): Promise<BoardThought[]> {
  console.log("[Board] Starting cascade for question:", question.question);

  const thoughts: BoardThought[] = [];

  try {
    // CEO (5-year)
    const ceoPerspective = await getCEOPerspective(question);
    thoughts.push(ceoPerspective);
    console.log("[Board] CEO perspective complete");
  } catch (error) {
    console.error("[Board] CEO failed:", error);
  }

  try {
    // CFO (4-month)
    const cfoPersp = await getCFOPerspective(question);
    thoughts.push(cfoPersp);
    console.log("[Board] CFO perspective complete");
  } catch (error) {
    console.error("[Board] CFO failed:", error);
  }

  try {
    // CMO (3-week)
    const cmoPersp = await getCMOPerspective(question);
    thoughts.push(cmoPersp);
    console.log("[Board] CMO perspective complete");
  } catch (error) {
    console.error("[Board] CMO failed:", error);
  }

  try {
    // CTO (2-day)
    const ctoPersp = await getCTOPerspective(question);
    thoughts.push(ctoPersp);
    console.log("[Board] CTO perspective complete");
  } catch (error) {
    console.error("[Board] CTO failed:", error);
  }

  try {
    // Morning Briefing (1-day)
    const briefingPersp = await getBriefingPerspective(question);
    thoughts.push(briefingPersp);
    console.log("[Board] Briefing perspective complete");
  } catch (error) {
    console.error("[Board] Briefing failed:", error);
  }

  return thoughts;
}
