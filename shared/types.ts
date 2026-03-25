/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ─── Socratic Intent Engine Types ────────────────────────────────────────────

export interface DataSourceMetric {
  label: string;
  value: string;
}

export interface DataSourceCard {
  sourceId: string;
  sourceName: string;
  sourceColor: string;
  metrics: DataSourceMetric[];
}

export interface CrossSourceInsight {
  text: string;
  severity: "info" | "warning" | "opportunity";
  relatedSources: string[];
}

export interface SocraticQuestion {
  id: string;
  question: string;
  rationale: string;
  estimatedImpact: string;
  relatedSources: string[];
}

export interface SocraticEngineResponse {
  contextId: number;
  userRequest: string;
  title: string;
  sourceCount: number;
  queryTimeMs: number;
  dataCards: DataSourceCard[];
  insights: CrossSourceInsight[];
  questions: SocraticQuestion[];
  // Backward-compatible fields
  contextSummary: string;
  suggestedParameters: Record<string, unknown>;
  hasLiveData: boolean;
  connectedProviders: string[];
}
