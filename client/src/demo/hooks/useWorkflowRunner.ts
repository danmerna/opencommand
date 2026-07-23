import { useEffect, useRef } from "react";
import { useDemoStore } from "./useDemoStore";
import { selectActivePlan, selectActiveWorkflow } from "../domain/selectors";

const UNDO_WINDOW_MS = 5000;
const STEP_INTERVAL_MS = 1800;

/**
 * Drives the deterministic simulation clock:
 * - closes the post-confirm undo window after 5 seconds,
 * - starts a queued workflow,
 * - advances running tasks on a fixed cadence (pauses and checkpoints halt it).
 * All transitions themselves live in the reducer; this hook only ticks.
 */
export function useWorkflowRunner(): void {
  const { state, dispatch } = useDemoStore();
  const plan = selectActivePlan(state);
  const workflow = selectActiveWorkflow(state);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Undo window after hold-confirm. */
  const undoOpen = Boolean(plan?.undoWindowOpen && state.pendingUndo?.kind === "execution-confirm");
  useEffect(() => {
    if (!undoOpen) return;
    undoTimer.current = setTimeout(() => dispatch({ type: "undo/commit" }), UNDO_WINDOW_MS);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [undoOpen, dispatch]);

  /* Start queued workflows shortly after creation. */
  const queuedId = workflow?.status === "queued" ? workflow.id : null;
  useEffect(() => {
    if (!queuedId) return;
    const timer = setTimeout(() => dispatch({ type: "workflow/start", id: queuedId }), 700);
    return () => clearTimeout(timer);
  }, [queuedId, dispatch]);

  /* Advance running workflows on a fixed cadence. */
  const runningId = workflow?.status === "running" ? workflow.id : null;
  const taskFingerprint = workflow?.tasks.map(t => t.status).join(",");
  useEffect(() => {
    if (!runningId) return;
    const timer = setTimeout(
      () => dispatch({ type: "workflow/advance", id: runningId }),
      STEP_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [runningId, taskFingerprint, dispatch]);
}
