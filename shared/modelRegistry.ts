/**
 * Model Registry — Dynamic Workflow Framework
 *
 * Implements role-based model routing following the "Open Agent Workflows" pattern:
 * - Coordinator: highest reliability model (handles strategic decisions, 5% of tokens)
 * - Implementer: best model for the specific task type (does the actual work)
 * - Verifier: cross-checks implementer output (different model family for diversity)
 * - Fixer/Synthesizer: cheap model that reconciles verifier feedback
 *
 * Each agent in a blueprint can be assigned a specific model, or use the
 * role-based default for its workflow position.
 */

// ─── Model Definitions ───────────────────────────────────────────────────────

export interface ModelDefinition {
  id: string;
  name: string;
  provider: "anthropic" | "google" | "openai";
  tier: "premium" | "standard" | "economy";
  /** Approximate cost per 1M input tokens in USD */
  costPerMillionInput: number;
  /** Approximate cost per 1M output tokens in USD */
  costPerMillionOutput: number;
  /** Context window size in tokens */
  contextWindow: number;
  /** Best-suited workflow roles */
  recommendedRoles: WorkflowRole[];
  /** Strengths description */
  strengths: string;
  /** Whether this model supports vision/image input */
  supportsVision: boolean;
  /** Whether this model supports structured JSON output */
  supportsStructuredOutput: boolean;
}

export type WorkflowRole =
  | "coordinator"
  | "implementer"
  | "verifier"
  | "fixer"
  | "web_research"
  | "vision"
  | "computer_use"
  | "bulk_worker";

export type TaskCategory =
  | "strategy"
  | "coding"
  | "writing"
  | "analysis"
  | "research"
  | "creative"
  | "data_processing"
  | "customer_support"
  | "sales"
  | "marketing"
  | "finance"
  | "general";

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    provider: "anthropic",
    tier: "premium",
    costPerMillionInput: 15.0,
    costPerMillionOutput: 75.0,
    contextWindow: 200000,
    recommendedRoles: ["coordinator", "vision", "implementer"],
    strengths: "Highest reliability for strategic decisions, vision tasks, complex reasoning",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    tier: "premium",
    costPerMillionInput: 15.0,
    costPerMillionOutput: 75.0,
    contextWindow: 200000,
    recommendedRoles: ["coordinator", "vision", "implementer"],
    strengths: "High reliability, strong reasoning, vision capability",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    tier: "standard",
    costPerMillionInput: 3.0,
    costPerMillionOutput: 15.0,
    contextWindow: 200000,
    recommendedRoles: ["verifier", "implementer"],
    strengths: "Balanced cost/performance, excellent for verification and mid-complexity tasks",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    tier: "economy",
    costPerMillionInput: 0.8,
    costPerMillionOutput: 4.0,
    contextWindow: 200000,
    recommendedRoles: ["fixer", "bulk_worker", "verifier"],
    strengths: "Fast and cheap — ideal for synthesis, fixing, and high-volume parallel work",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    tier: "premium",
    costPerMillionInput: 12.0,
    costPerMillionOutput: 60.0,
    contextWindow: 128000,
    recommendedRoles: ["web_research", "computer_use", "implementer"],
    strengths: "Best web research (90.1% BrowseComp), computer use (78.7% OSWorld), long-context retrieval",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    tier: "premium",
    costPerMillionInput: 10.0,
    costPerMillionOutput: 50.0,
    contextWindow: 128000,
    recommendedRoles: ["coordinator", "implementer"],
    strengths: "Strong general-purpose reasoning, reliable for complex multi-step tasks",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    tier: "standard",
    costPerMillionInput: 1.5,
    costPerMillionOutput: 6.0,
    contextWindow: 128000,
    recommendedRoles: ["verifier", "implementer", "bulk_worker"],
    strengths: "Cost-efficient mid-tier, good for verification and standard implementation",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    tier: "economy",
    costPerMillionInput: 0.3,
    costPerMillionOutput: 1.2,
    contextWindow: 128000,
    recommendedRoles: ["fixer", "bulk_worker"],
    strengths: "Cheapest option — makes 300+ parallel agents economically viable",
    supportsVision: false,
    supportsStructuredOutput: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "google",
    tier: "premium",
    costPerMillionInput: 7.0,
    costPerMillionOutput: 28.0,
    contextWindow: 2000000,
    recommendedRoles: ["coordinator", "implementer", "web_research"],
    strengths: "Massive 2M context window, strong reasoning, good for large document analysis",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "google",
    tier: "standard",
    costPerMillionInput: 0.5,
    costPerMillionOutput: 1.5,
    contextWindow: 1000000,
    recommendedRoles: ["verifier", "bulk_worker", "fixer"],
    strengths: "Extremely fast and cheap with large context — ideal for parallel verification",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    tier: "economy",
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
    contextWindow: 1000000,
    recommendedRoles: ["fixer", "bulk_worker"],
    strengths: "Ultra-cheap with 1M context — best for high-volume simple tasks",
    supportsVision: true,
    supportsStructuredOutput: true,
  },
];

// ─── Role-Based Defaults ─────────────────────────────────────────────────────

/**
 * Default model for each workflow role.
 * Following the "dynamic workflow" framework:
 * - Coordinator handles 5% of tokens but needs max reliability
 * - Bulk workers handle 95% of tokens and need max cost efficiency
 */
export const ROLE_DEFAULTS: Record<WorkflowRole, string> = {
  coordinator: "claude-opus-4-7",
  implementer: "gpt-5-mini",
  verifier: "claude-sonnet-4-6",
  fixer: "claude-haiku-4-5",
  web_research: "gpt-5.5",
  vision: "claude-opus-4-7",
  computer_use: "gpt-5.5",
  bulk_worker: "gpt-5-nano",
};

/**
 * Default model for each task category (when no specific role is assigned).
 * Optimizes for cost by selecting economical models for simpler jobs.
 */
export const TASK_CATEGORY_DEFAULTS: Record<TaskCategory, string> = {
  strategy: "claude-opus-4-7",
  coding: "claude-sonnet-4-6",
  writing: "gpt-5-mini",
  analysis: "gemini-3.1-pro-preview",
  research: "gpt-5.5",
  creative: "claude-opus-4-7",
  data_processing: "gemini-2.5-flash",
  customer_support: "gpt-5-mini",
  sales: "gpt-5-mini",
  marketing: "claude-sonnet-4-6",
  finance: "claude-sonnet-4-6",
  general: "gemini-2.5-flash",
};

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function getModelsByRole(role: WorkflowRole): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.recommendedRoles.includes(role));
}

export function getModelsByTier(tier: ModelDefinition["tier"]): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.tier === tier);
}

export function getModelsByProvider(provider: ModelDefinition["provider"]): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

export function getDefaultModelForRole(role: WorkflowRole): string {
  return ROLE_DEFAULTS[role];
}

export function getDefaultModelForTask(category: TaskCategory): string {
  return TASK_CATEGORY_DEFAULTS[category];
}

/**
 * Estimate cost for a given model and token usage.
 * Returns cost in USD.
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  return (
    (inputTokens / 1_000_000) * model.costPerMillionInput +
    (outputTokens / 1_000_000) * model.costPerMillionOutput
  );
}

/**
 * Get a human-readable tier badge color for UI display.
 */
export function getTierColor(tier: ModelDefinition["tier"]): string {
  switch (tier) {
    case "premium":
      return "text-amber-400 border-amber-500/30";
    case "standard":
      return "text-blue-400 border-blue-500/30";
    case "economy":
      return "text-emerald-400 border-emerald-500/30";
  }
}

/**
 * Get provider icon/color for UI display.
 */
export function getProviderColor(provider: ModelDefinition["provider"]): string {
  switch (provider) {
    case "anthropic":
      return "#d97706"; // amber/orange for Anthropic
    case "openai":
      return "#10b981"; // green for OpenAI
    case "google":
      return "#3b82f6"; // blue for Google
  }
}
