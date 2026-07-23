import { describe, expect, it } from "vitest";
import {
  breachesMarginFloor,
  clampAdjustment,
  scenarioReadout,
  unitsMoved,
} from "./calc";
import { matchCommand, normalizeUtterance } from "./commands";
import { demoReducer, type DemoAction } from "./reducer";
import { initialDemoState, type DemoState } from "./state";
import {
  selectActiveAdvisor,
  selectActivePlan,
  selectActiveThink,
  selectActiveWorkflow,
  selectAttentionCount,
  selectOrderedRecommendations,
  selectOrderedUpdates,
  selectPendingApprovals,
} from "./selectors";
import { SCENARIO } from "../fixtures/scenario";

const T = "2026-07-23T09:00:00.000Z";

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce(demoReducer, state);
}

/* --------------------------- scenario calc --------------------------- */

describe("scenario calculations", () => {
  it("moves 5 units at list price and 12 at the recommended cut", () => {
    expect(unitsMoved(0)).toBe(SCENARIO.movement.unitsAtListPrice);
    expect(unitsMoved(SCENARIO.proposal.recommendedAdjustmentPct)).toBe(
      SCENARIO.movement.unitsAtRecommended,
    );
  });

  it("caps units at the window maximum for deep cuts", () => {
    expect(unitsMoved(-8)).toBe(SCENARIO.movement.maxUnitsInWindow);
  });

  it("is monotonic: deeper cuts never move fewer units", () => {
    let prev = unitsMoved(0);
    for (let pct = 0; pct >= -8; pct -= 0.5) {
      const now = unitsMoved(pct);
      expect(now).toBeGreaterThanOrEqual(prev);
      prev = now;
    }
  });

  it("flags the LEDGER margin floor only below −7.5%", () => {
    expect(breachesMarginFloor(-7.5)).toBe(false);
    expect(breachesMarginFloor(-7.6)).toBe(true);
    expect(breachesMarginFloor(-4)).toBe(false);
  });

  it("clamps scrub values into the modeled range", () => {
    expect(clampAdjustment(-12)).toBe(-8);
    expect(clampAdjustment(3)).toBe(0);
    expect(clampAdjustment(-5.55)).toBe(-5.5);
  });

  it("produces a self-consistent readout at the recommended value", () => {
    const r = scenarioReadout(SCENARIO.proposal.recommendedAdjustmentPct);
    expect(r.unitsMoved).toBe(12);
    expect(r.breachesFloor).toBe(false);
    expect(r.marginImpact).toBeLessThan(0);
    expect(r.carryingSavings).toBeGreaterThan(0);
    expect(r.projectedRevenue).toBeGreaterThan(0);
  });

  it("models the reconciled −5.5% as the best net position", () => {
    const atZero = scenarioReadout(0).netPosition;
    const atLedger = scenarioReadout(SCENARIO.proposal.ledgerPreferredPct).netPosition;
    const atReconciled = scenarioReadout(SCENARIO.proposal.recommendedAdjustmentPct).netPosition;
    const atSignal = scenarioReadout(SCENARIO.proposal.signalPreferredPct).netPosition;
    expect(atZero).toBe(0);
    expect(atReconciled).toBeGreaterThan(atLedger);
    expect(atReconciled).toBeGreaterThan(atSignal);
    expect(atReconciled).toBeGreaterThan(0);
  });
});

/* ------------------------------ commands ------------------------------ */

describe("voice command mapping", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeUtterance("  What does LEDGER see?! ")).toBe("what does ledger see");
  });

  it("maps bounded phrases to typed intents", () => {
    expect(matchCommand("Open Advisor")?.intent).toEqual({
      type: "navigate",
      primary: "sigma",
      sub: "advisor",
    });
    expect(matchCommand("what does ledger see")?.intent).toEqual({
      type: "persona-lens",
      personaId: "per-ledger",
    });
    expect(matchCommand("Show me where they disagree!")?.intent).toEqual({
      type: "board-synthesis",
    });
    expect(matchCommand("act in do")?.intent).toEqual({ type: "act-in-do" });
  });

  it("matches triggers embedded in longer utterances", () => {
    expect(matchCommand("please open preflight now")?.intent).toEqual({ type: "open-preflight" });
  });

  it("returns null for out-of-vocabulary utterances", () => {
    expect(matchCommand("write me a poem about tractors")).toBeNull();
    expect(matchCommand("")).toBeNull();
  });
});

/* --------------------------- updates + undo --------------------------- */

describe("update triage and undo", () => {
  it("starts with four new prioritized updates", () => {
    const s = initialDemoState();
    expect(s.updates).toHaveLength(4);
    expect(s.updates.every(u => u.status === "new")).toBe(true);
    expect(selectOrderedUpdates(s)[0].id).toBe("upd-combine-pricing");
  });

  it("triages with a reversible undo window", () => {
    let s = run(initialDemoState(), {
      type: "update/triage",
      id: "upd-service-anvil",
      disposition: "dismissed",
      at: T,
    });
    expect(s.updates.find(u => u.id === "upd-service-anvil")?.status).toBe("dismissed");
    expect(s.pendingUndo?.kind).toBe("update-triage");

    const reverted = demoReducer(s, { type: "undo/revert" });
    expect(reverted.updates.find(u => u.id === "upd-service-anvil")?.status).toBe("new");
    expect(reverted.pendingUndo).toBeNull();

    const committed = demoReducer(s, { type: "undo/commit", at: T });
    expect(committed.updates.find(u => u.id === "upd-service-anvil")?.status).toBe("dismissed");
    expect(committed.pendingUndo).toBeNull();
  });

  it("records triage in the audit log", () => {
    const s = run(initialDemoState(), {
      type: "update/triage",
      id: "upd-qb-floorplan",
      disposition: "deferred",
      at: T,
    });
    const entry = s.audit.at(-1)!;
    expect(entry.type).toBe("update-triaged");
    expect(entry.causedBy).toBe("aud-created-upd-qb-floorplan");
  });
});

/* -------------------------------- think -------------------------------- */

describe("think analysis", () => {
  const analyzed = () =>
    run(initialDemoState(), { type: "think/analyze", updateId: "upd-combine-pricing", at: T });

  it("opens generating with the update's evidence and scope preselected", () => {
    const s = analyzed();
    const think = selectActiveThink(s)!;
    expect(think.status).toBe("generating");
    expect(think.sourceUpdateId).toBe("upd-combine-pricing");
    expect(think.recipe).toBe("scenario-model");
    expect(think.evidenceIds).toContain("evd-th-birkeys");
    expect(think.dataScope).toEqual(
      expect.arrayContaining(["tractorhouse", "inventory", "iron-comps", "quickbooks"]),
    );
    expect(s.activeUpdateId).toBe("upd-combine-pricing");
  });

  it("moves through ready → modified → ready on scrub and reset", () => {
    let s = run(analyzed(), { type: "think/ready" });
    expect(selectActiveThink(s)!.status).toBe("ready");
    s = demoReducer(s, { type: "think/scrub", adjustmentPct: -6.8 });
    expect(selectActiveThink(s)!.status).toBe("modified");
    expect(selectActiveThink(s)!.adjustmentPct).toBe(-6.8);
    s = demoReducer(s, { type: "think/reset-scrub" });
    expect(selectActiveThink(s)!.status).toBe("ready");
    expect(selectActiveThink(s)!.adjustmentPct).toBe(SCENARIO.proposal.recommendedAdjustmentPct);
  });

  it("keeps at least one source in scope", () => {
    let s = run(analyzed(), { type: "think/ready" });
    const scope = selectActiveThink(s)!.dataScope;
    for (const src of scope) s = demoReducer(s, { type: "think/toggle-scope", source: src });
    expect(selectActiveThink(s)!.dataScope).toHaveLength(1);
  });

  it("saves with a timestamp and audit entry", () => {
    const s = run(analyzed(), { type: "think/ready" }, { type: "think/save", at: T });
    expect(selectActiveThink(s)!.status).toBe("saved");
    expect(selectActiveThink(s)!.savedAt).toBe(T);
    expect(s.audit.at(-1)!.type).toBe("think-analysis");
  });
});

/* ------------------------------- advisor ------------------------------- */

describe("advisor sessions", () => {
  const withAdvisor = () =>
    run(
      initialDemoState(),
      { type: "think/analyze", updateId: "upd-combine-pricing", at: T },
      { type: "think/ready" },
      { type: "advisor/open", at: T },
    );

  it("opens neutral with the Think context attached", () => {
    const s = withAdvisor();
    const session = selectActiveAdvisor(s)!;
    expect(session.state).toBe("neutral");
    expect(session.sourceThinkResultId).toBe(s.activeThinkId);
    expect(session.sourceUpdateId).toBe("upd-combine-pricing");
  });

  it("transitions neutral → single → multi → board-synthesis", () => {
    let s = run(withAdvisor(), { type: "advisor/toggle-persona", personaId: "per-ledger", at: T });
    expect(selectActiveAdvisor(s)!.state).toBe("single");
    s = demoReducer(s, { type: "advisor/toggle-persona", personaId: "per-signal", at: T });
    expect(selectActiveAdvisor(s)!.state).toBe("multi");
    s = demoReducer(s, { type: "advisor/board-synthesis", at: T });
    const session = selectActiveAdvisor(s)!;
    expect(session.state).toBe("board-synthesis");
    expect(session.selectedPersonaIds).toHaveLength(4);
  });

  it("ensure-persona opens a session and activates the lens in one step", () => {
    /* Voice path with no session open at all. */
    let s = run(initialDemoState(), { type: "advisor/ensure-persona", personaId: "per-ledger", at: T });
    expect(selectActiveAdvisor(s)!.selectedPersonaIds).toEqual(["per-ledger"]);
    /* Idempotent when already active. */
    s = demoReducer(s, { type: "advisor/ensure-persona", personaId: "per-ledger", at: T });
    expect(selectActiveAdvisor(s)!.selectedPersonaIds).toEqual(["per-ledger"]);
    /* Adds without removing when another lens is on. */
    s = demoReducer(s, { type: "advisor/ensure-persona", personaId: "per-signal", at: T });
    expect(selectActiveAdvisor(s)!.state).toBe("multi");
  });

  it("deselecting all four personas returns to neutral", () => {
    let s = run(withAdvisor(), { type: "advisor/board-synthesis", at: T });
    for (const p of ["per-arch", "per-ledger", "per-signal", "per-forge"] as const) {
      s = demoReducer(s, { type: "advisor/toggle-persona", personaId: p, at: T });
    }
    expect(selectActiveAdvisor(s)!.state).toBe("neutral");
  });

  it("saving preserves the session in the decision trail", () => {
    const s = run(withAdvisor(), { type: "advisor/board-synthesis", at: T }, { type: "advisor/save", at: T });
    expect(selectActiveAdvisor(s)!.state).toBe("saved");
    expect(s.audit.at(-1)!.type).toBe("advisor-synthesis");
  });
});

/* --------------------------- recommendations --------------------------- */

describe("recommendations", () => {
  const fullContext = () =>
    run(
      initialDemoState(),
      { type: "think/analyze", updateId: "upd-combine-pricing", at: T },
      { type: "think/ready" },
      { type: "think/scrub", adjustmentPct: -5.5 },
      { type: "advisor/open", at: T },
      { type: "advisor/toggle-persona", personaId: "per-ledger", at: T },
      { type: "advisor/toggle-persona", personaId: "per-signal", at: T },
      { type: "advisor/board-synthesis", at: T },
      { type: "recommendation/create", at: T },
    );

  it("captures full lineage from update, think, and advisor", () => {
    const s = fullContext();
    const rec = s.recommendations[0];
    expect(rec.creatorMode).toBe("board-synthesis");
    expect(rec.sourceUpdateId).toBe("upd-combine-pricing");
    expect(rec.sourceThinkResultId).toBe(s.activeThinkId);
    expect(rec.sourceAdvisorSessionId).toBe(s.activeAdvisorId);
    expect(rec.selectedPersonaIds).toHaveLength(4);
    expect(rec.sequence).toEqual(["reprice", "feature", "automate", "close"]);
  });

  it("modify changes the adjustment and marks operator modification", () => {
    let s = fullContext();
    const id = s.recommendations[0].id;
    s = demoReducer(s, { type: "recommendation/modify", id, adjustmentPct: -6, at: T });
    const rec = s.recommendations[0];
    expect(rec.adjustmentPct).toBe(-6);
    expect(rec.status).toBe("modified");
    expect(rec.operatorModified).toBe(true);
  });

  it("defer is undoable", () => {
    let s = fullContext();
    const id = s.recommendations[0].id;
    s = demoReducer(s, { type: "recommendation/defer", id, at: T });
    expect(s.recommendations[0].status).toBe("deferred");
    s = demoReducer(s, { type: "undo/revert" });
    expect(s.recommendations[0].status).toBe("proposed");
  });

  it("reorders priorities with move up/down", () => {
    let s = run(fullContext(), { type: "recommendation/create", at: T });
    const [first, second] = selectOrderedRecommendations(s);
    s = demoReducer(s, { type: "recommendation/reorder", id: second.id, direction: "up" });
    expect(selectOrderedRecommendations(s)[0].id).toBe(second.id);
    expect(selectOrderedRecommendations(s)[1].id).toBe(first.id);
  });
});

/* ------------------------- do plan + preflight ------------------------- */

function throughDoOpen(): DemoState {
  let s = run(
    initialDemoState(),
    { type: "think/analyze", updateId: "upd-combine-pricing", at: T },
    { type: "think/ready" },
    { type: "advisor/open", at: T },
    { type: "advisor/toggle-persona", personaId: "per-ledger", at: T },
    { type: "advisor/toggle-persona", personaId: "per-signal", at: T },
    { type: "advisor/board-synthesis", at: T },
    { type: "recommendation/create", at: T },
  );
  const recId = s.recommendations[0].id;
  return demoReducer(s, { type: "do/open", recommendationId: recId, at: T });
}

describe("do plan and preflight", () => {
  it("builds an editable draft plan and hands the recommendation to Do", () => {
    const s = throughDoOpen();
    const plan = selectActivePlan(s)!;
    expect(plan.status).toBe("draft");
    expect(plan.agentTeamIds).toEqual(["agt-listing", "agt-photo", "agt-lead"]);
    expect(plan.steps.map(x => x.id)).toContain("step-checkpoint");
    expect(plan.blueprintId).toBe("bp-harvest-reprice");
    expect(s.recommendations[0].status).toBe("handed-to-do");
  });

  it("toggling the photo agent removes its step and restores it", () => {
    let s = throughDoOpen();
    s = demoReducer(s, { type: "do/toggle-photo-agent" });
    expect(selectActivePlan(s)!.steps.some(x => x.id === "step-photos")).toBe(false);
    s = demoReducer(s, { type: "do/toggle-photo-agent" });
    expect(selectActivePlan(s)!.steps.some(x => x.id === "step-photos")).toBe(true);
  });

  it("opening preflight creates a pending approval with a context trail", () => {
    const s = run(throughDoOpen(), { type: "do/open-preflight", at: T });
    expect(selectActivePlan(s)!.status).toBe("awaiting-approval");
    const approvals = selectPendingApprovals(s);
    expect(approvals).toHaveLength(1);
    expect(approvals[0].contextTrail.map(r => r.kind)).toEqual(
      expect.arrayContaining(["recommendation", "advisor-session", "think-result", "update"]),
    );
    expect(approvals[0].approver).toBe("Taylor");
  });

  it("hold-confirm approves with an undo window that can revert", () => {
    let s = run(throughDoOpen(), { type: "do/open-preflight", at: T }, { type: "do/hold-confirmed", at: T });
    expect(selectActivePlan(s)!.status).toBe("confirmed");
    expect(selectActivePlan(s)!.undoWindowOpen).toBe(true);
    expect(s.approvals.find(a => a.planId === s.activePlanId)?.status).toBe("approved");

    const reverted = demoReducer(s, { type: "undo/revert" });
    expect(selectActivePlan(reverted)!.status).toBe("awaiting-approval");
    expect(reverted.approvals.find(a => a.planId === reverted.activePlanId)?.status).toBe("pending");
  });

  it("cancel abandons the plan without side effects", () => {
    const s = run(throughDoOpen(), { type: "do/open-preflight", at: T }, { type: "do/cancel", at: T });
    expect(s.activePlanId).toBeNull();
    expect(selectActiveWorkflow(s)).toBeNull();
    expect(s.approvals.filter(a => a.status === "rejected")).toHaveLength(1);
  });
});

/* --------------------------- workflow lifecycle --------------------------- */

function throughCommit(): DemoState {
  return run(
    throughDoOpen(),
    { type: "do/open-preflight", at: T },
    { type: "do/hold-confirmed", at: T },
    { type: "undo/commit", at: T },
  );
}

describe("workflow lifecycle", () => {
  it("commit creates a queued workflow with assigned agents", () => {
    const s = throughCommit();
    const wf = selectActiveWorkflow(s)!;
    expect(wf.status).toBe("queued");
    expect(wf.agentIds).toEqual(["agt-listing", "agt-photo", "agt-lead"]);
    expect(s.agents.find(a => a.id === "agt-photo")?.status).toBe("assigned");
    expect(s.agents.find(a => a.id === "agt-photo")?.assignedWorkflowIds).toContain(wf.id);
  });

  it("runs deterministically to the checkpoint, pauses, then completes", () => {
    let s = throughCommit();
    const wfId = selectActiveWorkflow(s)!.id;
    s = demoReducer(s, { type: "workflow/start", id: wfId, at: T });
    expect(selectActiveWorkflow(s)!.status).toBe("running");

    for (let i = 0; i < 10 && selectActiveWorkflow(s)!.status === "running"; i++) {
      s = demoReducer(s, { type: "workflow/advance", id: wfId, at: T });
    }
    expect(selectActiveWorkflow(s)!.status).toBe("checkpoint");

    s = demoReducer(s, { type: "workflow/approve-checkpoint", id: wfId, at: T });
    for (let i = 0; i < 10 && selectActiveWorkflow(s); i++) {
      s = demoReducer(s, { type: "workflow/advance", id: wfId, at: T });
    }
    const wf = s.workflows.find(w => w.id === wfId)!;
    expect(wf.status).toBe("completed");
    expect(wf.tasks.every(t => t.status === "done" && t.result)).toBe(true);
    expect(wf.receiptId).toBeTruthy();
  });

  it("pause and resume work while running", () => {
    let s = throughCommit();
    const wfId = selectActiveWorkflow(s)!.id;
    s = run(
      s,
      { type: "workflow/start", id: wfId, at: T },
      { type: "workflow/toggle-pause", id: wfId, at: T },
    );
    expect(s.workflows.find(w => w.id === wfId)!.status).toBe("paused");
    s = demoReducer(s, { type: "workflow/toggle-pause", id: wfId, at: T });
    expect(s.workflows.find(w => w.id === wfId)!.status).toBe("running");
  });
});

/* ----------------------- completion + accountability ----------------------- */

function completedState(): DemoState {
  let s = throughCommit();
  const wfId = selectActiveWorkflow(s)!.id;
  s = demoReducer(s, { type: "workflow/start", id: wfId, at: T });
  for (let i = 0; i < 20 && s.workflows.find(w => w.id === wfId)!.status !== "completed"; i++) {
    const status = s.workflows.find(w => w.id === wfId)!.status;
    s = demoReducer(
      s,
      status === "checkpoint"
        ? { type: "workflow/approve-checkpoint", id: wfId, at: T }
        : { type: "workflow/advance", id: wfId, at: T },
    );
  }
  return s;
}

describe("proof of outcome and accountability", () => {
  it("generates a receipt tracing the complete lineage", () => {
    const s = completedState();
    expect(s.receipts).toHaveLength(1);
    const r = s.receipts[0];
    expect(r.status).toBe("generated");
    expect(r.originalUpdateId).toBe("upd-combine-pricing");
    expect(r.thinkResultId).toBe(s.activeThinkId);
    expect(r.advisorSessionId).toBe(s.activeAdvisorId);
    expect(r.personaIds).toHaveLength(4);
    expect(r.recommendationId).toBe(s.recommendations[0].id);
    expect(r.approver).toBe("Taylor");
    expect(r.simulatedTasks.length).toBeGreaterThanOrEqual(4);
    expect(r.remainingException).toContain("re-shoot");
  });

  it("creates an outcome update and resolves the original", () => {
    const s = completedState();
    const outcome = s.updates.find(u => u.category === "outcome")!;
    expect(outcome.status).toBe("new");
    expect(outcome.relatedRefs.map(x => x.kind)).toEqual(
      expect.arrayContaining(["workflow", "receipt"]),
    );
    expect(s.updates.find(u => u.id === "upd-combine-pricing")!.status).toBe("resolved");
  });

  it("keeps every audit causedBy reference resolvable", () => {
    const s = completedState();
    const ids = new Set(s.audit.map(e => e.id));
    for (const entry of s.audit) {
      if (entry.causedBy) expect(ids.has(entry.causedBy)).toBe(true);
    }
    const types = s.audit.map(e => e.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "update-created",
        "think-analysis",
        "persona-selected",
        "advisor-synthesis",
        "recommendation-created",
        "do-preflight",
        "approval-decision",
        "workflow-transition",
        "proof-of-outcome",
      ]),
    );
  });

  it("marks the receipt viewed on inspection", () => {
    let s = completedState();
    s = demoReducer(s, { type: "receipt/view", id: s.receipts[0].id });
    expect(s.receipts[0].status).toBe("viewed");
  });

  it("attention count reflects new updates and pending approvals", () => {
    const fresh = initialDemoState();
    expect(selectAttentionCount(fresh)).toBe(4);
    const s = completedState();
    /* outcome update is new; original approvals consumed */
    expect(selectAttentionCount(s)).toBe(4);
  });

  it("reset restores the canonical scenario", () => {
    const s = demoReducer(completedState(), { type: "demo/reset" });
    expect(s.updates).toHaveLength(4);
    expect(s.recommendations).toHaveLength(0);
    expect(s.receipts).toHaveLength(0);
    expect(s.workflows).toHaveLength(1);
    expect(s.workflows[0].status).toBe("failed");
  });
});
