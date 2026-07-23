import type { CommandIntent } from "./types";

/**
 * Bounded command vocabulary. Recognized speech (or Command menu choices)
 * normalize to one of these typed intents — no LLM, no free-form parsing.
 * Voice may open surfaces and change lenses; it can never confirm execution.
 */

export interface CommandDefinition {
  intent: CommandIntent;
  /** Canonical phrase shown in the Command menu and captions. */
  phrase: string;
  /** What the user sees happen. */
  effect: string;
  /** Normalized trigger phrases (lowercase, punctuation stripped). */
  triggers: string[];
}

export const COMMANDS: CommandDefinition[] = [
  {
    intent: { type: "navigate", primary: "command-center", sub: "updates" },
    phrase: "Open Updates",
    effect: "Shows the Command Center updates feed",
    triggers: ["open updates", "show updates", "open command center", "go to command center", "show me what changed", "whats new"],
  },
  {
    intent: { type: "navigate", primary: "command-center", sub: "approvals" },
    phrase: "Show Approvals",
    effect: "Opens the approvals queue",
    triggers: ["show approvals", "open approvals", "go to approvals", "what needs my approval"],
  },
  {
    intent: { type: "navigate", primary: "command-center", sub: "recommendations" },
    phrase: "Show Recommendations",
    effect: "Opens ranked recommendations",
    triggers: ["show recommendations", "open recommendations", "go to recommendations"],
  },
  {
    intent: { type: "navigate", primary: "sigma", sub: "think" },
    phrase: "Open Think",
    effect: "Opens the Σ Think canvas",
    triggers: ["open think", "open sigma", "go to think", "analyze this", "open analysis"],
  },
  {
    intent: { type: "navigate", primary: "sigma", sub: "advisor" },
    phrase: "Open Advisor",
    effect: "Opens the Σ Advisor canvas",
    triggers: ["open advisor", "go to advisor", "ask advisor", "ask the advisors"],
  },
  {
    intent: { type: "navigate", primary: "workspace", sub: "workflows" },
    phrase: "Open Workflows",
    effect: "Shows running and completed workflows",
    triggers: ["open workflows", "show workflows", "go to workflows", "open workspace"],
  },
  {
    intent: { type: "navigate", primary: "workspace", sub: "audit-log" },
    phrase: "Open Audit Log",
    effect: "Shows the accountability record",
    triggers: ["open audit log", "show audit log", "open the audit log", "show me the receipts"],
  },
  {
    intent: { type: "persona-lens", personaId: "per-ledger" },
    phrase: "What does LEDGER see?",
    effect: "Opens Advisor with the LEDGER lens active",
    triggers: ["what does ledger see", "show ledger", "ledger lens", "show me the financials", "what does ledger think"],
  },
  {
    intent: { type: "persona-lens", personaId: "per-signal" },
    phrase: "What does SIGNAL see?",
    effect: "Opens Advisor with the SIGNAL lens active",
    triggers: ["what does signal see", "show signal", "signal lens", "what does signal think"],
  },
  {
    intent: { type: "persona-lens", personaId: "per-arch" },
    phrase: "What does ARCH see?",
    effect: "Opens Advisor with the ARCH lens active",
    triggers: ["what does arch see", "show arch", "arch lens", "what does arch think"],
  },
  {
    intent: { type: "persona-lens", personaId: "per-forge" },
    phrase: "What does FORGE see?",
    effect: "Opens Advisor with the FORGE lens active",
    triggers: ["what does forge see", "show forge", "forge lens", "what does forge think"],
  },
  {
    intent: { type: "board-synthesis" },
    phrase: "Show me where they disagree",
    effect: "Activates Board Synthesis with the conflict layer emphasized",
    triggers: [
      "show me where they disagree",
      "where do they disagree",
      "show the disagreement",
      "board synthesis",
      "open board synthesis",
      "show me the conflict",
    ],
  },
  {
    intent: { type: "compare-options" },
    phrase: "Compare the options",
    effect: "Reveals the comparison region on the active canvas",
    triggers: ["compare the options", "compare options", "show the comparison", "compare"],
  },
  {
    intent: { type: "summarize" },
    phrase: "Summarize this",
    effect: "Shows a concise visible summary with optional narration",
    triggers: ["summarize this", "summarize", "give me the summary", "brief me"],
  },
  {
    intent: { type: "act-in-do" },
    phrase: "Act in Do",
    effect: "Opens Do with the current context — never confirms execution",
    triggers: ["act in do", "open do", "take action", "act on this", "make it happen"],
  },
  {
    intent: { type: "open-preflight" },
    phrase: "Open preflight",
    effect: "Opens the execution review — never confirms execution",
    triggers: ["open preflight", "open the preflight", "show preflight", "review the plan"],
  },
];

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeUtterance(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map an utterance to a command. Exact trigger match first, then a
 * conservative containment match (utterance contains a full trigger).
 */
export function matchCommand(raw: string): CommandDefinition | null {
  const text = normalizeUtterance(raw);
  if (!text) return null;
  for (const cmd of COMMANDS) {
    if (cmd.triggers.some(t => t === text)) return cmd;
  }
  for (const cmd of COMMANDS) {
    if (cmd.triggers.some(t => text.includes(t))) return cmd;
  }
  return null;
}
