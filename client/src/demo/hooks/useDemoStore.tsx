import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { demoReducer, type DemoAction } from "../domain/reducer";
import { initialDemoState, type DemoState } from "../domain/state";

/** Callers may omit `at`; the store stamps the current time on dispatch. */
type WithOptionalAt<T> = T extends { at: string } ? Omit<T, "at"> & { at?: string } : T;
export type DemoDispatchInput = WithOptionalAt<DemoAction>;

interface DemoStore {
  state: DemoState;
  dispatch: (action: WithOptionalAt<DemoAction>) => void;
}

const DemoStoreContext = createContext<DemoStore | null>(null);

const STORAGE_KEY = "oc-demo-state-v1";

function loadPersisted(): DemoState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDemoState();
    const parsed = JSON.parse(raw) as { version: number; state: DemoState };
    if (parsed.version !== 1 || !Array.isArray(parsed.state?.updates)) return initialDemoState();
    const state = parsed.state;
    /* Never resurrect a transient undo window across reloads. A plan caught
       mid-window reverts to awaiting-approval (its timer died with the page),
       so the operator re-confirms deliberately rather than the demo hanging. */
    const revertedPlanIds = new Set(
      state.plans.filter(p => p.undoWindowOpen).map(p => p.id),
    );
    return {
      ...state,
      pendingUndo: null,
      plans: state.plans.map(p =>
        p.undoWindowOpen ? { ...p, status: "awaiting-approval", undoWindowOpen: false } : p,
      ),
      approvals: state.approvals.map(a =>
        a.planId && revertedPlanIds.has(a.planId) && a.status === "approved"
          ? { ...a, status: "pending" }
          : a,
      ),
    };
  } catch {
    return initialDemoState();
  }
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(demoReducer, undefined, loadPersisted);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
    } catch {
      /* Storage may be unavailable (private mode); the demo still works. */
    }
  }, [state]);

  const store = useMemo<DemoStore>(
    () => ({
      state,
      dispatch: action => {
        const stamped = { at: new Date().toISOString(), ...action } as DemoAction;
        rawDispatch(stamped);
      },
    }),
    [state],
  );

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStore {
  const store = useContext(DemoStoreContext);
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return store;
}
