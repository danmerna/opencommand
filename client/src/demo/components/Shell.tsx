import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  COMMAND_CENTER_SUBTABS,
  SIGMA_SUBTABS,
  WORKSPACE_SUBTABS,
  type PrimaryTab,
} from "../domain/types";
import { selectAttentionCount } from "../domain/selectors";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { useState } from "react";
import { CommandMenuButton, UndoToast, VoiceControl } from "./interaction";

const PRIMARY_TABS: { id: PrimaryTab; label: string; ariaLabel?: string; question: string; defaultSub: string }[] = [
  { id: "command-center", label: "Command Center", question: "What needs my attention?", defaultSub: "updates" },
  { id: "sigma", label: "Σ", ariaLabel: "Sigma — intelligence canvas", question: "What can intelligence help me understand or do?", defaultSub: "think" },
  { id: "workspace", label: "Workspace", question: "What has my organization built and run?", defaultSub: "blueprints" },
];

const SUBTAB_LABELS: Record<string, string> = {
  updates: "Updates",
  approvals: "Approvals",
  recommendations: "Recommendations",
  think: "Think",
  advisor: "Advisor",
  do: "Do",
  blueprints: "Blueprints",
  workflows: "Workflows",
  agents: "Agents",
  "audit-log": "Audit Log",
};

function subtabsFor(primary: PrimaryTab): readonly string[] {
  if (primary === "command-center") return COMMAND_CENTER_SUBTABS;
  if (primary === "sigma") return SIGMA_SUBTABS;
  return WORKSPACE_SUBTABS;
}

/**
 * Roving-tabindex tablist per the WAI-ARIA tabs pattern (manual activation):
 * arrows move focus, Enter/Space activates, the active tab controls the
 * main panel. Selection is URL-addressable and survives refresh.
 */
function TabRow<T extends string>({
  tabs,
  activeId,
  onActivate,
  listLabel,
  idPrefix,
  panelId,
  className,
  tabClassName,
  badgeFor,
}: {
  tabs: { id: T; label: string; ariaLabel?: string }[];
  activeId: T;
  onActivate: (id: T) => void;
  listLabel: string;
  idPrefix: string;
  panelId: string;
  className?: string;
  tabClassName?: (active: boolean) => string;
  badgeFor?: (id: T) => number | null;
}) {
  const refs = useRef<Map<T, HTMLButtonElement>>(new Map());

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const order = tabs.map(t => t.id);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % order.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + order.length) % order.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = order.length - 1;
    if (next !== null) {
      e.preventDefault();
      refs.current.get(order[next])?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={listLabel} className={cn("flex items-stretch gap-1 overflow-x-auto", className)}>
      {tabs.map((tab, i) => {
        const active = tab.id === activeId;
        const badge = badgeFor?.(tab.id) ?? null;
        return (
          <button
            key={tab.id}
            ref={el => {
              if (el) refs.current.set(tab.id, el);
            }}
            role="tab"
            id={`${idPrefix}-${tab.id}`}
            aria-selected={active}
            aria-controls={panelId}
            aria-label={tab.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onActivate(tab.id)}
            onKeyDown={e => {
              onKeyDown(e, i);
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate(tab.id);
              }
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              tabClassName ? tabClassName(active) : "",
            )}
          >
            {tab.label}
            {badge !== null && badge > 0 && (
              <span
                className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] text-accent-foreground"
                aria-label={`${badge} items need attention`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DemoShell({
  primary,
  sub,
  children,
}: {
  primary: PrimaryTab;
  sub: string;
  children: ReactNode;
}) {
  const [, navigate] = useLocation();
  const { state, dispatch } = useDemoStore();
  const announce = useAnnounce();
  const [resetOpen, setResetOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const activePrimary = PRIMARY_TABS.find(t => t.id === primary)!;
  const attention = selectAttentionCount(state);

  /* Move reading context to the panel when the surface changes. */
  const lastRoute = useRef(`${primary}/${sub}`);
  useEffect(() => {
    const route = `${primary}/${sub}`;
    if (route !== lastRoute.current) {
      lastRoute.current = route;
      announce(`${activePrimary.label === "Σ" ? "Sigma" : activePrimary.label} — ${SUBTAB_LABELS[sub] ?? sub}.`);
    }
  }, [primary, sub, activePrimary.label, announce]);

  const resetDemo = () => {
    dispatch({ type: "demo/reset" });
    setResetOpen(false);
    navigate("/demo/command-center/updates");
    announce("Demo reset to the canonical scenario.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#demo-panel"
        className="sr-only rounded bg-accent px-3 py-2 text-accent-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold tracking-tight">OpenCommand</h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">Johnson Tractor</span> · illustrative demo — all data and
              execution simulated
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VoiceControl />
            <CommandMenuButton />
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
              <RefreshCw aria-hidden />
              <span className="hidden sm:inline">Reset demo</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Product areas" className="mx-auto w-full max-w-6xl px-4">
          <TabRow
            tabs={PRIMARY_TABS.map(t => ({ id: t.id, label: t.label, ariaLabel: t.ariaLabel }))}
            activeId={primary}
            onActivate={id => navigate(`/demo/${id}/${PRIMARY_TABS.find(t => t.id === id)!.defaultSub}`)}
            listLabel="Primary areas"
            idPrefix="tab-primary"
            panelId="demo-panel"
            className="pb-0"
            badgeFor={id => (id === "command-center" ? attention : null)}
            tabClassName={active =>
              cn(
                "rounded-b-none border-b-2 px-3 pb-2 pt-1.5",
                active
                  ? "border-accent font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          />
        </nav>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <TabRow
            tabs={subtabsFor(primary).map(s => ({ id: s, label: SUBTAB_LABELS[s] }))}
            activeId={sub}
            onActivate={id => navigate(`/demo/${primary}/${id}`)}
            listLabel={`${activePrimary.label === "Σ" ? "Sigma" : activePrimary.label} sections`}
            idPrefix={`tab-${primary}`}
            panelId="demo-panel"
            tabClassName={active =>
              cn(
                "text-[13px]",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          />
          <p className="hidden text-xs italic text-muted-foreground lg:block">{activePrimary.question}</p>
        </div>
      </div>

      <main
        ref={mainRef}
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`tab-${primary}-${sub}`}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 focus-visible:outline-none"
      >
        {children}
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-2.5 text-[11px] text-muted-foreground">
          Chatbot-free IntelligenceOS demo · every action here is simulated — no external system is
          read or written · voice is optional and every gesture has a visible and keyboard
          equivalent
        </p>
      </footer>

      <UndoToast />

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset the demo?</DialogTitle>
            <DialogDescription>
              Restores the canonical Johnson Tractor scenario — triage, analyses, approvals,
              workflows, and receipts all return to the demo morning.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Keep working
            </Button>
            <Button onClick={resetDemo}>Reset demo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
