/**
 * Typed domain model for the OpenCommand IntelligenceOS demo.
 *
 * Everything here is illustrative, deterministic fixture-driven state.
 * No real external system is read or written.
 */

/* ---------------------------------- IDs ---------------------------------- */

export type UpdateId = `upd-${string}`;
export type EvidenceId = `evd-${string}`;
export type PersonaId = `per-${string}`;
export type RecommendationId = `rec-${string}`;
export type ThinkResultId = `thk-${string}`;
export type AdvisorSessionId = `adv-${string}`;
export type DoPlanId = `plan-${string}`;
export type ApprovalId = `apr-${string}`;
export type BlueprintId = `bp-${string}`;
export type WorkflowId = `wfl-${string}`;
export type AgentId = `agt-${string}`;
export type AuditEntryId = `aud-${string}`;
export type ReceiptId = `rcp-${string}`;

/** Any object that can be referenced across tabs. */
export type ObjectRef =
  | { kind: "update"; id: UpdateId }
  | { kind: "evidence"; id: EvidenceId }
  | { kind: "persona"; id: PersonaId }
  | { kind: "recommendation"; id: RecommendationId }
  | { kind: "think-result"; id: ThinkResultId }
  | { kind: "advisor-session"; id: AdvisorSessionId }
  | { kind: "do-plan"; id: DoPlanId }
  | { kind: "approval"; id: ApprovalId }
  | { kind: "blueprint"; id: BlueprintId }
  | { kind: "workflow"; id: WorkflowId }
  | { kind: "agent"; id: AgentId }
  | { kind: "receipt"; id: ReceiptId };

/* -------------------------------- Sources -------------------------------- */

export type SourceSystem =
  | "gmail"
  | "tractorhouse"
  | "anvil-pro"
  | "iron-comps"
  | "quickbooks"
  | "inventory"
  | "slack"
  | "opencommand";

export interface EvidenceItem {
  id: EvidenceId;
  source: SourceSystem;
  /** Short label, e.g. "TractorHouse comp listings". */
  label: string;
  /** Exact factual statement this evidence contributes. */
  fact: string;
  /** Monospace-friendly exact value, e.g. "$18,400 / mo". */
  value?: string;
  /** Illustrative capture time (ISO). */
  observedAt: string;
}

/* -------------------------------- Updates -------------------------------- */

export type UpdateCategory =
  | "market"
  | "lead"
  | "operations"
  | "finance"
  | "system-analysis"
  | "approval-request"
  | "workflow-exception"
  | "outcome";

export type UpdateUrgency = "high" | "medium" | "low";

export type UpdateStatus =
  | "new"
  | "expanded"
  | "triaged"
  | "deferred"
  | "dismissed"
  | "resolved";

export interface Update {
  id: UpdateId;
  title: string;
  source: SourceSystem;
  timestamp: string;
  category: UpdateCategory;
  urgency: UpdateUrgency;
  /** 0..1 */
  confidence: number;
  implication: string;
  status: UpdateStatus;
  /** Built-in persona accountable for surfacing this, if any. */
  accountablePersonaId?: PersonaId;
  evidenceIds: EvidenceId[];
  relatedRefs: ObjectRef[];
}

/* -------------------------------- Personas -------------------------------- */

/** Marketplace-ready, versioned Advisor persona. Built-in values only. */
export interface AdvisorPersona {
  /* Identity */
  id: PersonaId;
  slug: string;
  name: string;
  title: string;
  brandRole: string;
  icon: string;
  creator: string;
  publisher: string;
  origin: "built-in" | "installed";
  /* Versioning */
  version: string;
  compatibility: string;
  updateState: "current" | "update-available" | "deprecated";
  /* Strategic contract */
  domains: string[];
  methods: string[];
  characteristicQuestion: string;
  requiredInputs: string[];
  limitations: string[];
  /* Presentation */
  accentHex: string;
  motif: string;
  tone: string;
  vocabulary: string[];
  voiceEnabled: boolean;
  /* Context and trust */
  requestedDataScopes: SourceSystem[];
  verification: "verified-publisher" | "unverified";
  provenance: string;
  /* Commerce placeholders — truthful non-commerce defaults only. */
  license: "built-in" | "unlicensed";
  priceModel: "included" | "unset";
  entitlement: "included" | "none";
  /* Reputation placeholders — never rendered as fake social proof. */
  rating: null;
  reviewCount: null;
  installCount: null;
}

/** One persona's structured read of the active decision. */
export interface PersonaPerspective {
  personaId: PersonaId;
  position: string;
  evidenceIds: EvidenceId[];
  assumptions: string[];
  keyQuestion: string;
  principalRisk: string;
  suggestedMove: string;
  /** Suggested price adjustment in percent (negative = cut). */
  suggestedAdjustmentPct: number;
  /** 0..1 */
  confidence: number;
  conflictsWith: { personaId: PersonaId; about: string }[];
}

/* ------------------------------ Think results ------------------------------ */

export type ThinkStatus =
  | "empty"
  | "generating"
  | "ready"
  | "modified"
  | "saved"
  | "error";

export type VisualRecipeKind =
  | "comparison"
  | "evidence-map"
  | "timeline"
  | "causal-chain"
  | "scenario-model"
  | "constraint-band"
  | "risk-matrix";

export interface ThinkResult {
  id: ThinkResultId;
  status: ThinkStatus;
  question: string;
  sourceUpdateId: UpdateId | null;
  recipe: VisualRecipeKind;
  /** Which sources are in scope (filterable). */
  dataScope: SourceSystem[];
  evidenceIds: EvidenceId[];
  assumptions: string[];
  /** Operator-scrubbed price adjustment in percent (negative = cut). */
  adjustmentPct: number;
  /** The recommended default the scrub can be reset to. */
  defaultAdjustmentPct: number;
  savedAt: string | null;
}

/* ----------------------------- Advisor sessions ----------------------------- */

export type AdvisorSelectionState =
  | "neutral"
  | "single"
  | "multi"
  | "board-synthesis"
  | "saved";

export interface AdvisorSession {
  id: AdvisorSessionId;
  state: AdvisorSelectionState;
  selectedPersonaIds: PersonaId[];
  /** Whether the disagreement layer is emphasized on the canvas. */
  conflictEmphasis: boolean;
  sourceThinkResultId: ThinkResultId | null;
  sourceUpdateId: UpdateId | null;
  savedAt: string | null;
}

/* ----------------------------- Recommendations ----------------------------- */

export type RecommendationStatus =
  | "proposed"
  | "modified"
  | "queued"
  | "approved"
  | "deferred"
  | "handed-to-do";

export type RecommendationCreatorMode =
  | "system"
  | "think"
  | "advisor"
  | "board-synthesis";

export interface Recommendation {
  id: RecommendationId;
  title: string;
  proposedMove: string;
  /** e.g. "reprice → feature → automate → close" */
  sequence: string[];
  impactSummary: string;
  /** 0..1 */
  confidence: number;
  principalRisk: string;
  status: RecommendationStatus;
  creatorMode: RecommendationCreatorMode;
  selectedPersonaIds: PersonaId[];
  evidenceIds: EvidenceId[];
  sourceUpdateId: UpdateId | null;
  sourceThinkResultId: ThinkResultId | null;
  sourceAdvisorSessionId: AdvisorSessionId | null;
  /** Operator's modified adjustment, if changed from proposal. */
  adjustmentPct: number;
  operatorModified: boolean;
  /** Display order in the Recommendations list (0 = top priority). */
  priority: number;
}

/* --------------------------------- Agents --------------------------------- */

export interface AgentRecord {
  id: AgentId;
  name: string;
  role: string;
  capabilities: string[];
  /** Illustrative tools the agent operates. */
  tools: string[];
  dataScope: SourceSystem[];
  commandBoundary: string[];
  /** e.g. "240 photos / day" */
  throughput: string;
  costNote: string;
  approvalNote: string;
  safeguards: string[];
  activity: { at: string; entry: string }[];
  assignedWorkflowIds: WorkflowId[];
  status: "available" | "assigned" | "running" | "idle";
}

/* ------------------------------- Do / Preflight ------------------------------- */

export type DoPlanStatus =
  | "draft"
  | "reviewing"
  | "awaiting-approval"
  | "confirmed"
  | "cancelled";

export interface PlanStep {
  id: string;
  title: string;
  agentId: AgentId | null;
  detail: string;
  /** Simulated system the step touches. */
  systems: SourceSystem[];
  isCheckpoint: boolean;
}

export interface DoPlan {
  id: DoPlanId;
  status: DoPlanStatus;
  goal: string;
  selectedOption: string;
  adjustmentPct: number;
  agentTeamIds: AgentId[];
  steps: PlanStep[];
  requiredData: SourceSystem[];
  tools: string[];
  guardrails: string[];
  approvals: string[];
  expectedOutcome: string;
  exceptionBehavior: string;
  receiptDefinition: string;
  reversibilityNote: string;
  sourceRecommendationId: RecommendationId | null;
  sourceThinkResultId: ThinkResultId | null;
  sourceAdvisorSessionId: AdvisorSessionId | null;
  blueprintId: BlueprintId | null;
  /** True while the 5s post-confirm undo window is open. */
  undoWindowOpen: boolean;
}

export interface Approval {
  id: ApprovalId;
  title: string;
  decision: string;
  whyRequired: string;
  scope: string;
  affectedSystems: SourceSystem[];
  economicEffect: string;
  commandBoundary: string;
  reversibility: string;
  approver: string;
  deadline: string | null;
  status: "pending" | "approved" | "rejected" | "deferred";
  planId: DoPlanId | null;
  workflowId: WorkflowId | null;
  contextTrail: ObjectRef[];
}

/* -------------------------------- Blueprint -------------------------------- */

export interface Blueprint {
  id: BlueprintId;
  name: string;
  goal: string;
  version: string;
  creator: string;
  publisher: string;
  origin: "built-in" | "installed";
  compatibility: string;
  agentTeamIds: AgentId[];
  steps: { title: string; detail: string }[];
  dataSources: SourceSystem[];
  tools: string[];
  guardrails: string[];
  approvals: string[];
  expectedOutcome: string;
  provenance: string;
  /* Marketplace placeholders — truthful non-commerce defaults only. */
  license: "built-in" | "unlicensed";
  priceModel: "included" | "unset";
  entitlement: "included" | "none";
  updateState: "current" | "update-available" | "deprecated";
}

/* -------------------------------- Workflows -------------------------------- */

export type WorkflowStatus =
  | "idle"
  | "queued"
  | "running"
  | "checkpoint"
  | "paused"
  | "completed"
  | "failed";

export type TaskStatus = "pending" | "running" | "checkpoint" | "done" | "failed";

export interface WorkflowTask {
  id: string;
  title: string;
  agentId: AgentId | null;
  detail: string;
  systems: SourceSystem[];
  isCheckpoint: boolean;
  status: TaskStatus;
  /** Deterministic simulated result once done. */
  result: string | null;
  completedAt: string | null;
}

export interface WorkflowInstance {
  id: WorkflowId;
  name: string;
  status: WorkflowStatus;
  planId: DoPlanId;
  blueprintId: BlueprintId | null;
  approvalId: ApprovalId;
  agentIds: AgentId[];
  tasks: WorkflowTask[];
  startedAt: string | null;
  completedAt: string | null;
  receiptId: ReceiptId | null;
}

/* --------------------------------- Receipt --------------------------------- */

export type ReceiptStatus = "unavailable" | "generated" | "viewed";

export interface ProofOfOutcome {
  id: ReceiptId;
  status: ReceiptStatus;
  workflowId: WorkflowId;
  originalUpdateId: UpdateId;
  thinkResultId: ThinkResultId | null;
  advisorSessionId: AdvisorSessionId | null;
  personaIds: PersonaId[];
  recommendationId: RecommendationId | null;
  operatorModification: string;
  preflightScope: string;
  approvalId: ApprovalId;
  approver: string;
  simulatedTasks: { title: string; result: string }[];
  expectedResult: string;
  simulatedActualResult: string;
  remainingException: string;
  generatedAt: string;
}

/* -------------------------------- Audit log -------------------------------- */

export type AuditEventType =
  | "update-created"
  | "update-triaged"
  | "think-analysis"
  | "persona-selected"
  | "advisor-synthesis"
  | "recommendation-created"
  | "recommendation-modified"
  | "approval-decision"
  | "do-preflight"
  | "workflow-transition"
  | "workflow-exception"
  | "proof-of-outcome";

export interface AuditEntry {
  id: AuditEntryId;
  at: string;
  type: AuditEventType;
  summary: string;
  objectRef: ObjectRef;
  /** The prior event in this object's lineage, if any. */
  causedBy: AuditEntryId | null;
}

/* ---------------------------------- Voice ---------------------------------- */

export type VoiceStatus =
  | "unsupported"
  | "idle"
  | "requesting-permission"
  | "listening"
  | "recognized"
  | "no-match"
  | "error";

/** Bounded command vocabulary — every voice intent maps to a typed action. */
export type CommandIntent =
  | { type: "navigate"; primary: PrimaryTab; sub: string }
  | { type: "persona-lens"; personaId: PersonaId }
  | { type: "board-synthesis" }
  | { type: "show-disagreement" }
  | { type: "compare-options" }
  | { type: "summarize" }
  | { type: "act-in-do" }
  | { type: "open-preflight" };

/* -------------------------------- Navigation -------------------------------- */

export type PrimaryTab = "command-center" | "sigma" | "workspace";

export const COMMAND_CENTER_SUBTABS = ["updates", "approvals", "recommendations"] as const;
export const SIGMA_SUBTABS = ["think", "advisor", "do"] as const;
export const WORKSPACE_SUBTABS = ["blueprints", "workflows", "agents", "audit-log"] as const;

export type CommandCenterSubtab = (typeof COMMAND_CENTER_SUBTABS)[number];
export type SigmaSubtab = (typeof SIGMA_SUBTABS)[number];
export type WorkspaceSubtab = (typeof WORKSPACE_SUBTABS)[number];
