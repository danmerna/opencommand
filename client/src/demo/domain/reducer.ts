import type {
  AdvisorSession,
  Approval,
  AuditEntry,
  AuditEventType,
  DoPlan,
  ObjectRef,
  PersonaId,
  ProofOfOutcome,
  Recommendation,
  SourceSystem,
  ThinkResult,
  Update,
  UpdateId,
  WorkflowInstance,
} from "./types";
import { clampAdjustment } from "./calc";
import { SCENARIO, fmtPct } from "../fixtures/scenario";
import { SYNTHESIS } from "../fixtures/personas";
import { EVIDENCE_BY_ID } from "../fixtures/evidence";
import { buildPlanSteps, stepsToTasks, taskResult } from "../fixtures/workflowTemplate";
import { initialDemoState, type DemoState } from "./state";

const ALL_PERSONAS: PersonaId[] = ["per-arch", "per-ledger", "per-signal", "per-forge"];

export type DemoAction =
  /* Updates + triage */
  | { type: "update/expand"; id: UpdateId }
  | { type: "update/triage"; id: UpdateId; disposition: "triaged" | "deferred" | "dismissed"; at: string }
  /* Undo */
  | { type: "undo/revert" }
  | { type: "undo/commit"; at: string }
  /* Think */
  | { type: "think/analyze"; updateId: UpdateId; at: string }
  | { type: "think/ready" }
  | { type: "think/error"; message?: string }
  | { type: "think/recover" }
  | { type: "think/toggle-scope"; source: SourceSystem }
  | { type: "think/scrub"; adjustmentPct: number }
  | { type: "think/reset-scrub" }
  | { type: "think/save"; at: string }
  /* Advisor */
  | { type: "advisor/open"; at: string }
  | { type: "advisor/ensure-persona"; personaId: PersonaId; at: string }
  | { type: "advisor/toggle-persona"; personaId: PersonaId; at: string }
  | { type: "advisor/clear-personas" }
  | { type: "advisor/board-synthesis"; at: string }
  | { type: "advisor/emphasize-conflict"; on: boolean }
  | { type: "advisor/save"; at: string }
  /* Recommendations */
  | { type: "recommendation/create"; at: string }
  | { type: "recommendation/modify"; id: string; adjustmentPct: number; at: string }
  | { type: "recommendation/queue"; id: string; at: string }
  | { type: "recommendation/defer"; id: string; at: string }
  | { type: "recommendation/reorder"; id: string; direction: "up" | "down" }
  /* Do */
  | { type: "do/open"; recommendationId?: string; at: string }
  | { type: "do/set-adjustment"; adjustmentPct: number }
  | { type: "do/toggle-photo-agent" }
  | { type: "do/open-preflight"; at: string }
  | { type: "do/cancel"; at: string }
  | { type: "do/hold-confirmed"; at: string }
  | { type: "do/commit-execution"; at: string }
  /* Workflow simulation */
  | { type: "workflow/start"; id: string; at: string }
  | { type: "workflow/advance"; id: string; at: string }
  | { type: "workflow/approve-checkpoint"; id: string; at: string }
  | { type: "workflow/toggle-pause"; id: string; at: string }
  /* Receipts */
  | { type: "receipt/view"; id: string }
  /* Reset */
  | { type: "demo/reset" };

/* ------------------------------ helpers ------------------------------ */

function refEq(a: ObjectRef, b: ObjectRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

function audit(
  state: DemoState,
  at: string,
  type: AuditEventType,
  summary: string,
  objectRef: ObjectRef,
  causedByRef?: ObjectRef,
): DemoState {
  const searchRef = causedByRef ?? objectRef;
  const prior = [...state.audit].reverse().find(e => refEq(e.objectRef, searchRef));
  const entry: AuditEntry = {
    id: `aud-${state.seq}`,
    at,
    type,
    summary,
    objectRef,
    causedBy: prior?.id ?? null,
  };
  return { ...state, audit: [...state.audit, entry], seq: state.seq + 1 };
}

function activeThink(state: DemoState): ThinkResult | null {
  return state.thinkResults.find(t => t.id === state.activeThinkId) ?? null;
}

function activeAdvisor(state: DemoState): AdvisorSession | null {
  return state.advisorSessions.find(a => a.id === state.activeAdvisorId) ?? null;
}

function activePlan(state: DemoState): DoPlan | null {
  return state.plans.find(p => p.id === state.activePlanId) ?? null;
}

function patchThink(state: DemoState, patch: Partial<ThinkResult>): DemoState {
  return {
    ...state,
    thinkResults: state.thinkResults.map(t => (t.id === state.activeThinkId ? { ...t, ...patch } : t)),
  };
}

function patchAdvisor(state: DemoState, patch: Partial<AdvisorSession>): DemoState {
  return {
    ...state,
    advisorSessions: state.advisorSessions.map(a =>
      a.id === state.activeAdvisorId ? { ...a, ...patch } : a,
    ),
  };
}

function patchPlan(state: DemoState, patch: Partial<DoPlan>): DemoState {
  return {
    ...state,
    plans: state.plans.map(p => (p.id === state.activePlanId ? { ...p, ...patch } : p)),
  };
}

function patchWorkflow(state: DemoState, id: string, patch: Partial<WorkflowInstance>): DemoState {
  return { ...state, workflows: state.workflows.map(w => (w.id === id ? { ...w, ...patch } : w)) };
}

function selectionState(ids: PersonaId[]): AdvisorSession["state"] {
  if (ids.length === 0) return "neutral";
  if (ids.length === 1) return "single";
  if (ids.length === 4) return "board-synthesis";
  return "multi";
}

/* ------------------------------ reducer ------------------------------ */

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "demo/reset":
      return initialDemoState();

    /* ---------------------------- updates ---------------------------- */

    case "update/expand":
      return {
        ...state,
        updates: state.updates.map(u =>
          u.id === action.id && u.status === "new" ? { ...u, status: "expanded" } : u,
        ),
      };

    case "update/triage": {
      const update = state.updates.find(u => u.id === action.id);
      if (!update) return state;
      const labels = { triaged: "queued", deferred: "deferred", dismissed: "dismissed" } as const;
      let next: DemoState = {
        ...state,
        updates: state.updates.map(u =>
          u.id === action.id ? { ...u, status: action.disposition } : u,
        ),
        pendingUndo: {
          kind: "update-triage",
          label: `Update ${labels[action.disposition]}`,
          updateId: action.id,
          prevStatus: update.status,
        },
      };
      next = audit(
        next,
        action.at,
        "update-triaged",
        `Update ${labels[action.disposition]}: ${update.title}`,
        { kind: "update", id: action.id },
      );
      return next;
    }

    /* ------------------------------ undo ------------------------------ */

    case "undo/revert": {
      const undo = state.pendingUndo;
      if (!undo) return state;
      if (undo.kind === "update-triage") {
        return {
          ...state,
          pendingUndo: null,
          updates: state.updates.map(u =>
            u.id === undo.updateId ? { ...u, status: undo.prevStatus } : u,
          ),
        };
      }
      if (undo.kind === "recommendation-defer") {
        return {
          ...state,
          pendingUndo: null,
          recommendations: state.recommendations.map(r =>
            r.id === undo.recommendationId ? { ...r, status: undo.prevStatus } : r,
          ),
        };
      }
      /* execution-confirm: reopen review, approval back to pending */
      const plan = activePlan(state);
      if (!plan) return { ...state, pendingUndo: null };
      return {
        ...patchPlan(
          {
            ...state,
            pendingUndo: null,
            approvals: state.approvals.map(a =>
              a.planId === plan.id && a.status === "approved" ? { ...a, status: "pending" } : a,
            ),
          },
          { status: "awaiting-approval", undoWindowOpen: false },
        ),
      };
    }

    case "undo/commit": {
      const undo = state.pendingUndo;
      if (!undo) return state;
      if (undo.kind === "execution-confirm") {
        return demoReducer({ ...state, pendingUndo: null }, { type: "do/commit-execution", at: action.at });
      }
      return { ...state, pendingUndo: null };
    }

    /* ------------------------------ think ------------------------------ */

    case "think/analyze": {
      const update = state.updates.find(u => u.id === action.updateId);
      if (!update) return state;
      const id = `thk-${state.seq}`;
      const think: ThinkResult = {
        id: id as ThinkResult["id"],
        status: "generating",
        question: `${update.title} — how should ${SCENARIO.dealer} respond?`,
        sourceUpdateId: update.id,
        recipe: update.id === "upd-combine-pricing" ? "scenario-model" : "evidence-map",
        dataScope: Array.from(
          new Set(
            update.evidenceIds
              .map(eid => EVIDENCE_BY_ID[eid]?.source)
              .filter((s): s is SourceSystem => Boolean(s)),
          ),
        ),
        evidenceIds: [...update.evidenceIds],
        assumptions: [
          "Harvest demand holds through the window",
          "Competitor pricing stays at the observed level",
        ],
        adjustmentPct: SCENARIO.proposal.recommendedAdjustmentPct,
        defaultAdjustmentPct: SCENARIO.proposal.recommendedAdjustmentPct,
        savedAt: null,
      };
      let next: DemoState = {
        ...state,
        thinkResults: [...state.thinkResults, think],
        activeThinkId: id,
        activeUpdateId: update.id,
        seq: state.seq + 1,
        returnTo: { label: "Back to Updates", path: "/demo/command-center/updates" },
        updates: state.updates.map(u =>
          u.id === update.id && (u.status === "new" || u.status === "expanded")
            ? { ...u, status: "triaged" }
            : u,
        ),
      };
      next = audit(
        next,
        action.at,
        "think-analysis",
        `Think analysis opened for: ${update.title}`,
        { kind: "think-result", id: id as ThinkResult["id"] },
        { kind: "update", id: update.id },
      );
      return next;
    }

    case "think/ready": {
      const think = activeThink(state);
      if (!think || think.status !== "generating") return state;
      return patchThink(state, { status: "ready" });
    }

    case "think/error":
      return state.activeThinkId ? patchThink(state, { status: "error" }) : state;

    case "think/recover":
      return { ...state, activeThinkId: null };

    case "think/toggle-scope": {
      const think = activeThink(state);
      if (!think) return state;
      const inScope = think.dataScope.includes(action.source);
      /* Keep at least one source in scope. */
      if (inScope && think.dataScope.length === 1) return state;
      return patchThink(state, {
        dataScope: inScope
          ? think.dataScope.filter(s => s !== action.source)
          : [...think.dataScope, action.source],
      });
    }

    case "think/scrub": {
      const think = activeThink(state);
      if (!think || (think.status !== "ready" && think.status !== "modified" && think.status !== "saved"))
        return state;
      const pct = clampAdjustment(action.adjustmentPct);
      return patchThink(state, {
        adjustmentPct: pct,
        status: pct === think.defaultAdjustmentPct ? "ready" : "modified",
      });
    }

    case "think/reset-scrub": {
      const think = activeThink(state);
      if (!think) return state;
      return patchThink(state, { adjustmentPct: think.defaultAdjustmentPct, status: "ready" });
    }

    case "think/save": {
      const think = activeThink(state);
      if (!think || think.status === "empty" || think.status === "generating") return state;
      let next = patchThink(state, { status: "saved", savedAt: action.at });
      next = audit(
        next,
        action.at,
        "think-analysis",
        `Think result saved at ${fmtPct(think.adjustmentPct)} adjustment.`,
        { kind: "think-result", id: think.id },
      );
      return next;
    }

    /* ----------------------------- advisor ----------------------------- */

    case "advisor/open": {
      const existing = activeAdvisor(state);
      const think = activeThink(state);
      if (existing && existing.sourceThinkResultId === (think?.id ?? null)) return state;
      const id = `adv-${state.seq}`;
      const session: AdvisorSession = {
        id: id as AdvisorSession["id"],
        state: "neutral",
        selectedPersonaIds: [],
        conflictEmphasis: false,
        sourceThinkResultId: think?.id ?? null,
        sourceUpdateId: state.activeUpdateId,
        savedAt: null,
      };
      return {
        ...state,
        advisorSessions: [...state.advisorSessions, session],
        activeAdvisorId: id,
        seq: state.seq + 1,
      };
    }

    case "advisor/ensure-persona": {
      /* Voice/command path: open a session if needed, then guarantee the
         lens is active — never a silent no-op on a fresh session. */
      const opened = demoReducer(state, { type: "advisor/open", at: action.at });
      const session = activeAdvisor(opened);
      if (!session || session.selectedPersonaIds.includes(action.personaId)) return opened;
      return demoReducer(opened, {
        type: "advisor/toggle-persona",
        personaId: action.personaId,
        at: action.at,
      });
    }

    case "advisor/toggle-persona": {
      const session = activeAdvisor(state);
      if (!session) return state;
      const selected = session.selectedPersonaIds.includes(action.personaId)
        ? session.selectedPersonaIds.filter(p => p !== action.personaId)
        : [...session.selectedPersonaIds, action.personaId];
      let next = patchAdvisor(state, {
        selectedPersonaIds: selected,
        state: selectionState(selected),
        conflictEmphasis: session.conflictEmphasis && selected.length >= 2,
      });
      next = audit(
        next,
        action.at,
        "persona-selected",
        `Advisor lenses: ${selected.length ? selected.map(p => p.replace("per-", "").toUpperCase()).join(", ") : "neutral Σ"}.`,
        { kind: "advisor-session", id: session.id },
      );
      return next;
    }

    case "advisor/clear-personas": {
      const session = activeAdvisor(state);
      if (!session) return state;
      return patchAdvisor(state, { selectedPersonaIds: [], state: "neutral", conflictEmphasis: false });
    }

    case "advisor/board-synthesis": {
      const session = activeAdvisor(state);
      if (!session) return state;
      let next = patchAdvisor(state, {
        selectedPersonaIds: [...ALL_PERSONAS],
        state: "board-synthesis",
      });
      next = audit(
        next,
        action.at,
        "advisor-synthesis",
        "Board Synthesis activated: ARCH, LEDGER, SIGNAL, FORGE reconciled on the shared canvas.",
        { kind: "advisor-session", id: session.id },
      );
      return next;
    }

    case "advisor/emphasize-conflict": {
      const session = activeAdvisor(state);
      if (!session) return state;
      return patchAdvisor(state, { conflictEmphasis: action.on });
    }

    case "advisor/save": {
      const session = activeAdvisor(state);
      if (!session) return state;
      let next = patchAdvisor(state, { state: "saved", savedAt: action.at });
      next = audit(
        next,
        action.at,
        "advisor-synthesis",
        "Advisor session saved to the decision trail.",
        { kind: "advisor-session", id: session.id },
      );
      return next;
    }

    /* -------------------------- recommendations -------------------------- */

    case "recommendation/create": {
      const think = activeThink(state);
      const session = activeAdvisor(state);
      const id = `rec-${state.seq}` as Recommendation["id"];
      const personaIds = session?.selectedPersonaIds ?? [];
      const rec: Recommendation = {
        id,
        title: "Reprice combines for the harvest window",
        proposedMove: SYNTHESIS.reconciledMove,
        sequence: [...SCENARIO.proposal.sequence],
        impactSummary: `Projected to move ${SCENARIO.proposal.unitsRepriced} of ${SCENARIO.combines.total} units inside the ${SCENARIO.market.harvestWindowWeeks}-week window.`,
        confidence: SYNTHESIS.reconciledConfidence,
        principalRisk: SYNTHESIS.unresolvedRisk,
        status: "proposed",
        creatorMode:
          session?.state === "board-synthesis" ? "board-synthesis"
          : personaIds.length > 0 ? "advisor"
          : think ? "think"
          : "system",
        selectedPersonaIds: [...personaIds],
        evidenceIds: think ? [...think.evidenceIds] : [],
        sourceUpdateId: state.activeUpdateId,
        sourceThinkResultId: think?.id ?? null,
        sourceAdvisorSessionId: session?.id ?? null,
        adjustmentPct: think?.adjustmentPct ?? SCENARIO.proposal.recommendedAdjustmentPct,
        operatorModified: think ? think.adjustmentPct !== think.defaultAdjustmentPct : false,
        priority: state.recommendations.length,
      };
      let next: DemoState = {
        ...state,
        recommendations: [...state.recommendations, rec],
        seq: state.seq + 1,
      };
      next = audit(
        next,
        action.at,
        "recommendation-created",
        `Recommendation created (${rec.creatorMode}) at ${fmtPct(rec.adjustmentPct)}: ${rec.title}`,
        { kind: "recommendation", id },
        session ? { kind: "advisor-session", id: session.id } : think ? { kind: "think-result", id: think.id } : undefined,
      );
      return next;
    }

    case "recommendation/modify": {
      const rec = state.recommendations.find(r => r.id === action.id);
      if (!rec) return state;
      const pct = clampAdjustment(action.adjustmentPct);
      let next: DemoState = {
        ...state,
        recommendations: state.recommendations.map(r =>
          r.id === action.id
            ? { ...r, adjustmentPct: pct, status: "modified", operatorModified: true }
            : r,
        ),
      };
      next = audit(
        next,
        action.at,
        "recommendation-modified",
        `Recommendation adjusted by operator to ${fmtPct(pct)}.`,
        { kind: "recommendation", id: rec.id },
      );
      return next;
    }

    case "recommendation/queue": {
      const rec = state.recommendations.find(r => r.id === action.id);
      if (!rec) return state;
      let next: DemoState = {
        ...state,
        recommendations: state.recommendations.map(r =>
          r.id === action.id ? { ...r, status: "queued" } : r,
        ),
      };
      next = audit(next, action.at, "recommendation-modified", "Recommendation queued for action.", {
        kind: "recommendation",
        id: rec.id,
      });
      return next;
    }

    case "recommendation/defer": {
      const rec = state.recommendations.find(r => r.id === action.id);
      if (!rec) return state;
      return {
        ...state,
        recommendations: state.recommendations.map(r =>
          r.id === action.id ? { ...r, status: "deferred" } : r,
        ),
        pendingUndo: {
          kind: "recommendation-defer",
          label: "Recommendation deferred",
          recommendationId: rec.id,
          prevStatus: rec.status,
        },
      };
    }

    case "recommendation/reorder": {
      const sorted = [...state.recommendations].sort((a, b) => a.priority - b.priority);
      const idx = sorted.findIndex(r => r.id === action.id);
      if (idx < 0) return state;
      const swapWith = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return state;
      const reordered = [...sorted];
      [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
      return {
        ...state,
        recommendations: state.recommendations.map(r => ({
          ...r,
          priority: reordered.findIndex(x => x.id === r.id),
        })),
      };
    }

    /* -------------------------------- do -------------------------------- */

    case "do/open": {
      const rec = action.recommendationId
        ? state.recommendations.find(r => r.id === action.recommendationId)
        : null;
      /* Reuse a live draft for the same source instead of duplicating. */
      const existing = activePlan(state);
      if (
        existing &&
        existing.status !== "cancelled" &&
        existing.sourceRecommendationId === (rec?.id ?? existing.sourceRecommendationId)
      ) {
        return state;
      }
      const think = activeThink(state);
      const session = activeAdvisor(state);
      const adjustment = rec?.adjustmentPct ?? think?.adjustmentPct ?? SCENARIO.proposal.recommendedAdjustmentPct;
      const id = `plan-${state.seq}` as DoPlan["id"];
      const plan: DoPlan = {
        id,
        status: "draft",
        goal: state.blueprint.goal,
        selectedOption: SYNTHESIS.reconciledMove,
        adjustmentPct: adjustment,
        agentTeamIds: ["agt-listing", "agt-photo", "agt-lead"],
        steps: buildPlanSteps(adjustment),
        requiredData: ["tractorhouse", "inventory", "gmail", "quickbooks"],
        tools: [...state.blueprint.tools],
        guardrails: [...state.blueprint.guardrails],
        approvals: [...state.blueprint.approvals],
        expectedOutcome: state.blueprint.expectedOutcome,
        exceptionBehavior: "Pause the run and surface an exception Update; no partial publishes.",
        receiptDefinition:
          "Proof of Outcome linking signal, decision, approval, tasks, and simulated results.",
        reversibilityNote:
          "Listing prices can be restored to list in one run; photos retain originals; no external commitments are made.",
        sourceRecommendationId: rec?.id ?? null,
        sourceThinkResultId: rec?.sourceThinkResultId ?? think?.id ?? null,
        sourceAdvisorSessionId: rec?.sourceAdvisorSessionId ?? session?.id ?? null,
        blueprintId: state.blueprint.id,
        undoWindowOpen: false,
      };
      let next: DemoState = {
        ...state,
        plans: [...state.plans, plan],
        activePlanId: id,
        seq: state.seq + 1,
        recommendations: rec
          ? state.recommendations.map(r => (r.id === rec.id ? { ...r, status: "handed-to-do" } : r))
          : state.recommendations,
        returnTo: rec
          ? { label: "Back to Recommendations", path: "/demo/command-center/recommendations" }
          : state.returnTo,
      };
      return next;
    }

    case "do/set-adjustment": {
      const plan = activePlan(state);
      if (!plan || (plan.status !== "draft" && plan.status !== "reviewing")) return state;
      const pct = clampAdjustment(action.adjustmentPct);
      return patchPlan(state, { adjustmentPct: pct, steps: buildPlanSteps(pct).filter(s => plan.steps.some(p => p.id === s.id)) });
    }

    case "do/toggle-photo-agent": {
      const plan = activePlan(state);
      if (!plan || (plan.status !== "draft" && plan.status !== "reviewing")) return state;
      const hasPhoto = plan.agentTeamIds.includes("agt-photo");
      return patchPlan(state, {
        agentTeamIds: hasPhoto
          ? plan.agentTeamIds.filter(a => a !== "agt-photo")
          : ["agt-listing", "agt-photo", "agt-lead"],
        steps: hasPhoto
          ? plan.steps.filter(s => s.id !== "step-photos")
          : buildPlanSteps(plan.adjustmentPct),
      });
    }

    case "do/open-preflight": {
      const plan = activePlan(state);
      if (!plan || plan.status === "cancelled" || plan.status === "confirmed") return state;
      const aprId = `apr-${state.seq}` as Approval["id"];
      const trail: ObjectRef[] = [];
      if (plan.sourceRecommendationId)
        trail.push({ kind: "recommendation", id: plan.sourceRecommendationId as Recommendation["id"] });
      if (plan.sourceAdvisorSessionId)
        trail.push({ kind: "advisor-session", id: plan.sourceAdvisorSessionId as AdvisorSession["id"] });
      if (plan.sourceThinkResultId)
        trail.push({ kind: "think-result", id: plan.sourceThinkResultId as ThinkResult["id"] });
      if (state.activeUpdateId) trail.push({ kind: "update", id: state.activeUpdateId });
      const existing = state.approvals.find(a => a.planId === plan.id);
      const approval: Approval = existing ?? {
        id: aprId,
        title: "Combine reprice execution",
        decision: `Reprice ${SCENARIO.proposal.unitsRepriced} combine listings at ${fmtPct(plan.adjustmentPct)} and run the ${plan.steps.length}-step plan.`,
        whyRequired: "Changes public listing prices and contacts leads (simulated) — consequential and outward-facing.",
        scope: `${SCENARIO.proposal.unitsRepriced} of ${SCENARIO.combines.total} combines; ${SCENARIO.proposal.unitsHeldAtList} premium units excluded.`,
        affectedSystems: ["tractorhouse", "inventory", "gmail", "slack"],
        economicEffect: `List adjustment ${fmtPct(plan.adjustmentPct)} across the repriced set; margin traded for carrying-cost and auction-risk avoidance.`,
        commandBoundary:
          "Agents act only within the approved adjustment and unit set; outbound replies remain approval-gated.",
        reversibility: plan.reversibilityNote,
        approver: SCENARIO.operator,
        deadline: null,
        status: "pending",
        planId: plan.id,
        workflowId: null,
        contextTrail: trail,
      };
      let next: DemoState = {
        ...state,
        approvals: existing ? state.approvals : [...state.approvals, approval],
        seq: existing ? state.seq : state.seq + 1,
      };
      next = patchPlan(next, { status: "awaiting-approval" });
      next = audit(
        next,
        action.at,
        "do-preflight",
        `Execution preflight opened at ${fmtPct(plan.adjustmentPct)} — awaiting Taylor's approval.`,
        { kind: "do-plan", id: plan.id },
      );
      return next;
    }

    case "do/cancel": {
      const plan = activePlan(state);
      if (!plan || plan.status === "confirmed") return state;
      let next = patchPlan(state, { status: "cancelled", undoWindowOpen: false });
      next = {
        ...next,
        approvals: next.approvals.map(a =>
          a.planId === plan.id && a.status === "pending" ? { ...a, status: "rejected" } : a,
        ),
        activePlanId: null,
      };
      next = audit(next, action.at, "approval-decision", "Execution cancelled before confirmation — no actions taken.", {
        kind: "do-plan",
        id: plan.id,
      });
      return next;
    }

    case "do/hold-confirmed": {
      const plan = activePlan(state);
      if (!plan || plan.status !== "awaiting-approval") return state;
      let next = patchPlan(state, { status: "confirmed", undoWindowOpen: true });
      next = {
        ...next,
        approvals: next.approvals.map(a =>
          a.planId === plan.id ? { ...a, status: "approved" } : a,
        ),
        pendingUndo: { kind: "execution-confirm", label: "Execution approved" },
      };
      next = audit(
        next,
        action.at,
        "approval-decision",
        `Taylor approved the combine reprice execution at ${fmtPct(plan.adjustmentPct)} (hold-to-confirm).`,
        { kind: "do-plan", id: plan.id },
      );
      return next;
    }

    case "do/commit-execution": {
      const plan = activePlan(state);
      if (!plan || plan.status !== "confirmed") return state;
      const approval = state.approvals.find(a => a.planId === plan.id);
      if (!approval) return state;
      const wfId = `wfl-${state.seq}` as WorkflowInstance["id"];
      const workflow: WorkflowInstance = {
        id: wfId,
        name: "Harvest window combine reprice",
        status: "queued",
        planId: plan.id,
        blueprintId: plan.blueprintId,
        approvalId: approval.id,
        agentIds: [...plan.agentTeamIds],
        tasks: stepsToTasks(plan.steps),
        startedAt: null,
        completedAt: null,
        receiptId: null,
      };
      let next: DemoState = {
        ...state,
        workflows: [...state.workflows, workflow],
        seq: state.seq + 1,
        approvals: state.approvals.map(a =>
          a.id === approval.id ? { ...a, workflowId: wfId } : a,
        ),
        agents: state.agents.map(a =>
          plan.agentTeamIds.includes(a.id)
            ? { ...a, status: "assigned", assignedWorkflowIds: [...a.assignedWorkflowIds, wfId] }
            : a,
        ),
        pendingUndo: null,
      };
      next = patchPlan(next, { undoWindowOpen: false });
      next = audit(
        next,
        action.at,
        "workflow-transition",
        "Workflow created and queued from the approved plan.",
        { kind: "workflow", id: wfId },
        { kind: "do-plan", id: plan.id },
      );
      return next;
    }

    /* ----------------------------- workflow ----------------------------- */

    case "workflow/start": {
      const wf = state.workflows.find(w => w.id === action.id);
      if (!wf || wf.status !== "queued") return state;
      let next = patchWorkflow(state, wf.id, {
        status: "running",
        startedAt: action.at,
        tasks: wf.tasks.map((t, i) => (i === 0 ? { ...t, status: "running" } : t)),
      });
      next = {
        ...next,
        agents: next.agents.map(a =>
          wf.agentIds.includes(a.id) ? { ...a, status: "running" } : a,
        ),
      };
      next = audit(next, action.at, "workflow-transition", "Workflow started.", {
        kind: "workflow",
        id: wf.id,
      });
      return next;
    }

    case "workflow/advance": {
      const wf = state.workflows.find(w => w.id === action.id);
      if (!wf || (wf.status !== "running" && wf.status !== "checkpoint")) return state;
      const idx = wf.tasks.findIndex(t => t.status === "running" || t.status === "checkpoint");
      if (idx < 0) return state;
      const current = wf.tasks[idx];
      if (current.isCheckpoint && current.status !== "done") {
        /* Reached the human checkpoint: pause and require approval. */
        if (wf.status !== "checkpoint") {
          let next = patchWorkflow(state, wf.id, {
            status: "checkpoint",
            tasks: wf.tasks.map((t, i) => (i === idx ? { ...t, status: "checkpoint" } : t)),
          });
          next = audit(
            next,
            action.at,
            "workflow-transition",
            `Checkpoint reached: ${current.title}`,
            { kind: "workflow", id: wf.id },
          );
          return next;
        }
        return state;
      }
      const plan = state.plans.find(p => p.id === wf.planId);
      const doneTasks = wf.tasks.map((t, i) =>
        i === idx
          ? { ...t, status: "done" as const, result: taskResult(t.id, plan?.adjustmentPct ?? 0), completedAt: action.at }
          : t,
      );
      const nextIdx = idx + 1;
      if (nextIdx >= wf.tasks.length) {
        return completeWorkflow(state, wf.id, doneTasks, action.at);
      }
      return patchWorkflow(state, wf.id, {
        tasks: doneTasks.map((t, i) => (i === nextIdx ? { ...t, status: "running" } : t)),
      });
    }

    case "workflow/approve-checkpoint": {
      const wf = state.workflows.find(w => w.id === action.id);
      if (!wf || wf.status !== "checkpoint") return state;
      const idx = wf.tasks.findIndex(t => t.status === "checkpoint");
      if (idx < 0) return state;
      const plan = state.plans.find(p => p.id === wf.planId);
      const doneTasks = wf.tasks.map((t, i) =>
        i === idx
          ? { ...t, status: "done" as const, result: taskResult(t.id, plan?.adjustmentPct ?? 0), completedAt: action.at }
          : t,
      );
      const nextIdx = idx + 1;
      let next: DemoState;
      if (nextIdx >= wf.tasks.length) {
        next = completeWorkflow(state, wf.id, doneTasks, action.at);
      } else {
        next = patchWorkflow(state, wf.id, {
          status: "running",
          tasks: doneTasks.map((t, i) => (i === nextIdx ? { ...t, status: "running" } : t)),
        });
      }
      next = audit(
        next,
        action.at,
        "workflow-transition",
        "Checkpoint approved by Taylor — run resumed.",
        { kind: "workflow", id: wf.id },
      );
      return next;
    }

    case "workflow/toggle-pause": {
      const wf = state.workflows.find(w => w.id === action.id);
      if (!wf) return state;
      if (wf.status === "running") {
        let next = patchWorkflow(state, wf.id, { status: "paused" });
        next = audit(next, action.at, "workflow-transition", "Workflow paused by operator.", {
          kind: "workflow",
          id: wf.id,
        });
        return next;
      }
      if (wf.status === "paused") {
        let next = patchWorkflow(state, wf.id, { status: "running" });
        next = audit(next, action.at, "workflow-transition", "Workflow resumed by operator.", {
          kind: "workflow",
          id: wf.id,
        });
        return next;
      }
      return state;
    }

    /* ----------------------------- receipts ----------------------------- */

    case "receipt/view":
      return {
        ...state,
        receipts: state.receipts.map(r =>
          r.id === action.id && r.status === "generated" ? { ...r, status: "viewed" } : r,
        ),
      };

    default:
      return state;
  }
}

/* -------------------- completion: receipt + outcome -------------------- */

function completeWorkflow(
  state: DemoState,
  workflowId: string,
  finishedTasks: WorkflowInstance["tasks"],
  at: string,
): DemoState {
  const wf = state.workflows.find(w => w.id === workflowId);
  if (!wf) return state;
  const plan = state.plans.find(p => p.id === wf.planId);
  const approval = state.approvals.find(a => a.id === wf.approvalId);
  const rec = plan?.sourceRecommendationId
    ? state.recommendations.find(r => r.id === plan.sourceRecommendationId)
    : null;
  const think = plan?.sourceThinkResultId
    ? state.thinkResults.find(t => t.id === plan.sourceThinkResultId)
    : null;
  const session = plan?.sourceAdvisorSessionId
    ? state.advisorSessions.find(a => a.id === plan.sourceAdvisorSessionId)
    : null;
  const originUpdateId = (rec?.sourceUpdateId ?? think?.sourceUpdateId ?? state.activeUpdateId ?? "upd-combine-pricing") as UpdateId;
  const receiptId = `rcp-${state.seq}` as ProofOfOutcome["id"];
  const adjustment = plan?.adjustmentPct ?? 0;

  const receipt: ProofOfOutcome = {
    id: receiptId,
    status: "generated",
    workflowId: wf.id,
    originalUpdateId: originUpdateId,
    thinkResultId: think?.id ?? null,
    advisorSessionId: session?.id ?? null,
    personaIds: session?.selectedPersonaIds ?? [],
    recommendationId: rec?.id ?? null,
    operatorModification:
      think && think.adjustmentPct !== think.defaultAdjustmentPct
        ? `Operator scrubbed the adjustment from ${fmtPct(think.defaultAdjustmentPct)} to ${fmtPct(think.adjustmentPct)}.`
        : "Operator accepted the reconciled adjustment without modification.",
    preflightScope: approval?.scope ?? "",
    approvalId: (approval?.id ?? "apr-unknown") as ProofOfOutcome["approvalId"],
    approver: approval?.approver ?? SCENARIO.operator,
    simulatedTasks: finishedTasks.map(t => ({ title: t.title, result: t.result ?? "Completed." })),
    expectedResult: plan?.expectedOutcome ?? "",
    simulatedActualResult: `${SCENARIO.proposal.unitsRepriced} listings repriced ${fmtPct(adjustment)}, ${SCENARIO.proposal.featuredUnits} featured with enhanced photos, lead drafting active in ${SCENARIO.leadResponse.avgResponseInRun} average — all simulated.`,
    remainingException: `${SCENARIO.photo.conditionFlagsInRun} photo frame flagged by the condition-preservation check awaits re-shoot.`,
    generatedAt: at,
  };

  const outcomeUpdate: Update = {
    id: `upd-outcome-${state.seq}` as UpdateId,
    title: `Combine reprice executed: ${SCENARIO.proposal.unitsRepriced} listings updated ${fmtPct(adjustment)}`,
    source: "opencommand",
    timestamp: at,
    category: "outcome",
    urgency: "low",
    confidence: 1,
    implication: "Workflow completed with Proof of Outcome — one photo re-shoot exception remains.",
    status: "new",
    accountablePersonaId: undefined,
    evidenceIds: [],
    relatedRefs: [
      { kind: "workflow", id: wf.id },
      { kind: "receipt", id: receiptId },
    ],
  };

  let next: DemoState = {
    ...state,
    workflows: state.workflows.map(w =>
      w.id === wf.id
        ? { ...w, status: "completed" as const, tasks: finishedTasks, completedAt: at, receiptId }
        : w,
    ),
    receipts: [...state.receipts, receipt],
    updates: [
      outcomeUpdate,
      ...state.updates.map(u => (u.id === originUpdateId ? { ...u, status: "resolved" as const } : u)),
    ],
    recommendations: rec
      ? state.recommendations.map(r => (r.id === rec.id ? { ...r, status: "approved" as const } : r))
      : state.recommendations,
    agents: state.agents.map(a =>
      wf.agentIds.includes(a.id) ? { ...a, status: "available" as const } : a,
    ),
    seq: state.seq + 2,
  };
  next = audit(next, at, "workflow-transition", "Workflow completed — all tasks finished.", {
    kind: "workflow",
    id: wf.id,
  });
  next = audit(
    next,
    at,
    "proof-of-outcome",
    "Proof of Outcome generated, linking signal, decision, approval, tasks, and simulated result.",
    { kind: "receipt", id: receiptId },
    { kind: "workflow", id: wf.id },
  );
  return next;
}
