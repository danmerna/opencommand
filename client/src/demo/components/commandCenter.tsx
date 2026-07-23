import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  ListChecks,
  Pencil,
  Play,
  Sigma,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Approval, Recommendation, Update } from "../domain/types";
import {
  describeRef,
  refPath,
  selectCheckpointWorkflow,
  selectOrderedRecommendations,
  selectOrderedUpdates,
  selectPendingApprovals,
} from "../domain/selectors";
import { EVIDENCE_BY_ID, SOURCE_LABELS } from "../fixtures/evidence";
import { PERSONA_BY_ID } from "../fixtures/personas";
import { fmtPct, SCENARIO } from "../fixtures/scenario";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { useNarration } from "../hooks/useSpeech";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSwipe } from "../hooks/useSwipe";
import {
  ConfidencePill,
  EmptyState,
  MonoValue,
  PanelCard,
  SectionLabel,
  SourceChip,
  StatusBadge,
  UrgencyDot,
} from "./bits";
import { ScrubSlider } from "./interaction";

/* --------------------------------- Updates --------------------------------- */

const CATEGORY_LABELS: Record<Update["category"], string> = {
  market: "Market signal",
  lead: "Lead",
  operations: "Operations",
  finance: "Finance",
  "system-analysis": "System analysis",
  "approval-request": "Approval request",
  "workflow-exception": "Workflow exception",
  outcome: "Outcome",
};

const STATUS_TONES: Record<Update["status"], "neutral" | "accent" | "success" | "warning"> = {
  new: "accent",
  expanded: "accent",
  triaged: "neutral",
  deferred: "warning",
  dismissed: "neutral",
  resolved: "success",
};

function UpdateCard({ update, firstSwipeHintShown }: { update: Update; firstSwipeHintShown: boolean }) {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const triage = (disposition: "triaged" | "deferred" | "dismissed") => {
    dispatch({ type: "update/triage", id: update.id, disposition });
  };

  const { swipe, handlers, threshold } = useSwipe(
    () => triage("deferred"),
    () => triage("triaged"),
  );

  const analyze = () => {
    dispatch({ type: "think/analyze", updateId: update.id });
    navigate("/demo/sigma/think");
    announce(`Analyzing in Sigma: ${update.title}`);
  };

  const settled = update.status === "dismissed" || update.status === "resolved" || update.status === "deferred";
  const persona = update.accountablePersonaId ? PERSONA_BY_ID[update.accountablePersonaId] : null;
  const isOutcome = update.category === "outcome";

  const onCardKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      triage("triaged");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      triage("deferred");
    }
  };

  return (
    <li className="relative">
      {swipe.dragging && Math.abs(swipe.offsetX) > 12 && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 flex items-center px-4 font-mono text-xs",
            swipe.offsetX > 0 ? "left-0 text-emerald-300" : "right-0 text-amber-300",
          )}
        >
          {swipe.offsetX > 0
            ? `→ queue${Math.abs(swipe.offsetX) >= threshold ? " (release)" : ""}`
            : `defer ←${Math.abs(swipe.offsetX) >= threshold ? " (release)" : ""}`}
        </div>
      )}
      <PanelCard
        {...handlers}
        onKeyDown={onCardKeyDown}
        tabIndex={0}
        role="group"
        aria-label={`${CATEGORY_LABELS[update.category]}: ${update.title}. ${settled ? `Status ${update.status}.` : "Arrow right queues, arrow left defers."}`}
        className={cn(
          "touch-pan-y p-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          settled && "opacity-60",
          isOutcome && "border-emerald-400/30",
          !reducedMotion && !swipe.dragging && "transition-transform duration-150",
        )}
        style={{ transform: swipe.dragging ? `translateX(${swipe.offsetX * 0.35}px)` : undefined }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <SourceChip source={update.source} />
              <StatusBadge tone={isOutcome ? "success" : "neutral"}>{CATEGORY_LABELS[update.category]}</StatusBadge>
              <StatusBadge tone={STATUS_TONES[update.status]}>{update.status}</StatusBadge>
            </div>
            <h3 className="text-sm font-medium text-foreground">{update.title}</h3>
            <p className="text-xs text-muted-foreground">{update.implication}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <UrgencyDot urgency={update.urgency} />
            <ConfidencePill value={update.confidence} />
            {persona && (
              <span className="font-mono text-[10px]" style={{ color: persona.accentHex }}>
                {persona.name} watching
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {!isOutcome && !settled && (
            <>
              <Button size="sm" onClick={analyze}>
                <Sigma aria-hidden />
                Analyze in Σ
              </Button>
              <Button size="sm" variant="outline" onClick={() => triage("triaged")}>
                <ListChecks aria-hidden />
                Queue
              </Button>
              <Button size="sm" variant="outline" onClick={() => triage("deferred")}>
                <CalendarClock aria-hidden />
                Defer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => triage("dismissed")}>
                <X aria-hidden />
                Dismiss
              </Button>
            </>
          )}
          {update.evidenceIds.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSourceOpen(o => !o)} aria-expanded={sourceOpen}>
              <ExternalLink aria-hidden />
              View source
            </Button>
          )}
          {update.relatedRefs.map(ref => (
            <Button key={`${ref.kind}-${ref.id}`} size="sm" variant="ghost" onClick={() => navigate(refPath(ref))}>
              {describeRef(state, ref)}
            </Button>
          ))}
          {(update.status === "new" || update.status === "expanded") && !isOutcome && (
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={expanded}
              onClick={() => {
                setExpanded(o => !o);
                if (!expanded) dispatch({ type: "update/expand", id: update.id });
              }}
            >
              <ChevronDown aria-hidden className={cn(expanded && "rotate-180")} />
              {expanded ? "Less" : "Details"}
            </Button>
          )}
        </div>

        {sourceOpen && (
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
            {update.evidenceIds.map(id => {
              const e = EVIDENCE_BY_ID[id];
              if (!e) return null;
              return (
                <li key={id} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    <span className="font-mono text-secondary-foreground">{SOURCE_LABELS[e.source]}</span> — {e.fact}
                  </span>
                  {e.value && <MonoValue className="shrink-0 text-[11px]">{e.value}</MonoValue>}
                </li>
              );
            })}
          </ul>
        )}

        {expanded && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Captured <MonoValue className="text-[11px]">{new Date(update.timestamp).toLocaleString()}</MonoValue> from{" "}
            {SOURCE_LABELS[update.source]}. {firstSwipeHintShown ? "" : "Tip: swipe right to queue, left to defer — or use the buttons and arrow keys."}
          </p>
        )}
      </PanelCard>
    </li>
  );
}

export function UpdatesView() {
  const { state } = useDemoStore();
  const narration = useNarration();
  const updates = selectOrderedUpdates(state);
  const attention = updates.filter(u => u.status === "new" || u.status === "expanded");

  const briefText = useMemo(() => {
    const parts = attention.map(u => u.title).slice(0, 4);
    return parts.length
      ? `Good morning, Taylor. ${parts.length} change${parts.length > 1 ? "s" : ""} need attention: ${parts.join(". ")}.`
      : "Good morning, Taylor. Nothing new needs your attention.";
  }, [attention]);

  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <section aria-labelledby="updates-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="updates-heading" className="text-lg font-semibold tracking-tight">
            Overnight changes
          </h2>
          <p className="text-xs text-muted-foreground">
            {attention.length} of {updates.length} need judgment · swipe, buttons, and arrow keys
            all triage the same way
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setBriefOpen(o => !o);
            if (briefOpen) narration.cancel();
          }}
          aria-expanded={briefOpen}
        >
          <Volume2 aria-hidden />
          Brief me
        </Button>
      </div>

      {briefOpen && (
        <PanelCard className="flex flex-col gap-2 p-4">
          <SectionLabel>Morning brief — captions always visible</SectionLabel>
          <p className="text-sm text-foreground">{briefText}</p>
          <div className="flex gap-2">
            {narration.supported && (
              <Button size="sm" variant="outline" onClick={() => (narration.speaking ? narration.cancel() : narration.speak(briefText))}>
                {narration.speaking ? <VolumeX aria-hidden /> : <Play aria-hidden />}
                {narration.speaking ? "Stop narration" : "Narrate"}
              </Button>
            )}
            {!narration.supported && (
              <p className="text-xs text-muted-foreground">Narration is unavailable in this browser — the caption above is the complete brief.</p>
            )}
          </div>
        </PanelCard>
      )}

      <ul className="flex flex-col gap-3">
        {updates.map((u, i) => (
          <UpdateCard key={u.id} update={u} firstSwipeHintShown={i !== 0} />
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------- Approvals -------------------------------- */

function ApprovalCard({ approval }: { approval: Approval }) {
  const [, navigate] = useLocation();
  const { state } = useDemoStore();

  const rows: { label: string; value: string }[] = [
    { label: "Decision", value: approval.decision },
    { label: "Why approval is required", value: approval.whyRequired },
    { label: "Exact scope", value: approval.scope },
    { label: "Economic effect", value: approval.economicEffect },
    { label: "Command boundary", value: approval.commandBoundary },
    { label: "Reversibility", value: approval.reversibility },
  ];

  return (
    <PanelCard className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{approval.title}</h3>
        <div className="flex items-center gap-2">
          <StatusBadge tone={approval.status === "pending" ? "warning" : approval.status === "approved" ? "success" : "neutral"}>
            {approval.status}
          </StatusBadge>
          <span className="text-[11px] text-muted-foreground">
            Approver: <MonoValue className="text-[11px]">{approval.approver}</MonoValue>
            {approval.deadline ? ` · due ${approval.deadline}` : " · no deadline"}
          </span>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        {rows.map(r => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</dt>
            <dd className="text-secondary-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <SectionLabel className="mr-1">Affected systems</SectionLabel>
        {approval.affectedSystems.map(s => (
          <SourceChip key={s} source={s} />
        ))}
      </div>

      {approval.contextTrail.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <SectionLabel className="mr-1">Context trail</SectionLabel>
          {approval.contextTrail.map(ref => (
            <Button key={`${ref.kind}-${ref.id}`} size="sm" variant="ghost" onClick={() => navigate(refPath(ref))}>
              {describeRef(state, ref)}
            </Button>
          ))}
        </div>
      )}

      {approval.status === "pending" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/demo/sigma/do")}>
            Review in preflight
          </Button>
          <p className="self-center text-[11px] text-muted-foreground">
            Approval happens through the deliberate hold control in the preflight — never one click.
          </p>
        </div>
      )}
      {approval.status === "approved" && approval.workflowId && (
        <Button size="sm" variant="outline" onClick={() => navigate(`/demo/workspace/workflows?object=${approval.workflowId}`)}>
          View workflow
        </Button>
      )}
    </PanelCard>
  );
}

export function ApprovalsView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const pending = selectPendingApprovals(state);
  const checkpointWf = selectCheckpointWorkflow(state);
  const settled = state.approvals.filter(a => a.status !== "pending");

  return (
    <section aria-labelledby="approvals-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="approvals-heading" className="text-lg font-semibold tracking-tight">
          Approvals
        </h2>
        <p className="text-xs text-muted-foreground">
          The single queue for human checkpoints — preflights, workflow checkpoints, and consequential decisions.
        </p>
      </div>

      {checkpointWf && (
        <PanelCard className="flex flex-col gap-2 border-amber-400/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Workflow checkpoint: featured listing set</h3>
            <StatusBadge tone="warning">awaiting review</StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            “{checkpointWf.name}” paused mid-run for Taylor to review the featured listing set before
            it publishes. Approving resumes the run; the workflow trace shows exactly what completed.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => dispatch({ type: "workflow/approve-checkpoint", id: checkpointWf.id })}>
              Approve checkpoint
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/demo/workspace/workflows?object=${checkpointWf.id}`)}>
              Inspect the run first
            </Button>
          </div>
        </PanelCard>
      )}

      {pending.length === 0 && !checkpointWf && (
        <EmptyState
          title="Nothing is waiting on you"
          hint="Consequential actions appear here with their full scope and boundaries before anything runs. Start from an Update — analyze it in Σ, then act in Do."
        />
      )}

      {pending.map(a => (
        <ApprovalCard key={a.id} approval={a} />
      ))}

      {settled.length > 0 && (
        <>
          <SectionLabel>Decided</SectionLabel>
          {settled.map(a => (
            <ApprovalCard key={a.id} approval={a} />
          ))}
        </>
      )}
    </section>
  );
}

/* ------------------------------ Recommendations ------------------------------ */

function RecommendationCard({ rec, isFirst, isLast }: { rec: Recommendation; isFirst: boolean; isLast: boolean }) {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const [modifyOpen, setModifyOpen] = useState(false);

  const move = (direction: "up" | "down") => {
    dispatch({ type: "recommendation/reorder", id: rec.id, direction });
    announce(`Moved ${direction}.`);
  };

  const actInDo = () => {
    dispatch({ type: "do/open", recommendationId: rec.id });
    navigate("/demo/sigma/do");
  };

  return (
    <li>
      <PanelCard className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={rec.status === "approved" ? "success" : rec.status === "deferred" ? "warning" : "accent"}>
                {rec.status}
              </StatusBadge>
              <StatusBadge>{rec.creatorMode}</StatusBadge>
              {rec.operatorModified && <StatusBadge tone="warning">operator-modified</StatusBadge>}
            </div>
            <h3 className="text-sm font-medium">{rec.title}</h3>
            <p className="text-xs text-muted-foreground">{rec.proposedMove}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <ConfidencePill value={rec.confidence} />
            <MonoValue className="text-xs text-accent">{fmtPct(rec.adjustmentPct)}</MonoValue>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted-foreground">
          {rec.sequence.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>→</span>}
              <span className="rounded border border-border px-1.5 py-0.5 text-secondary-foreground">{s}</span>
            </span>
          ))}
        </div>

        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Impact</dt>
            <dd className="text-secondary-foreground">{rec.impactSummary}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Principal risk</dt>
            <dd className="text-secondary-foreground">{rec.principalRisk}</dd>
          </div>
        </dl>

        {rec.selectedPersonaIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <SectionLabel>Lenses</SectionLabel>
            {rec.selectedPersonaIds.map(pid => {
              const p = PERSONA_BY_ID[pid];
              return (
                <span key={pid} className="font-mono" style={{ color: p.accentHex }}>
                  {p.name}
                </span>
              );
            })}
          </div>
        )}

        {modifyOpen && (
          <div className="border-t border-border pt-3">
            <ScrubSlider
              idPrefix={`rec-${rec.id}`}
              value={rec.adjustmentPct}
              defaultValue={SCENARIO.proposal.recommendedAdjustmentPct}
              onChange={pct => dispatch({ type: "recommendation/modify", id: rec.id, adjustmentPct: pct })}
              onReset={() =>
                dispatch({
                  type: "recommendation/modify",
                  id: rec.id,
                  adjustmentPct: SCENARIO.proposal.recommendedAdjustmentPct,
                })
              }
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <Button size="sm" onClick={actInDo} disabled={rec.status === "approved"}>
            Act in Do
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/demo/sigma/think")}>
            Analyze in Think
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/demo/sigma/advisor")}>
            Ask Advisor
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModifyOpen(o => !o)} aria-expanded={modifyOpen}>
            <Pencil aria-hidden />
            Modify
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "recommendation/defer", id: rec.id })}>
            Later
          </Button>
          <span className="ml-auto flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => move("up")} disabled={isFirst} aria-label="Move up in priority">
              <ArrowUp aria-hidden />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => move("down")} disabled={isLast} aria-label="Move down in priority">
              <ArrowDown aria-hidden />
            </Button>
          </span>
        </div>
      </PanelCard>
    </li>
  );
}

export function RecommendationsView() {
  const { state } = useDemoStore();
  const [, navigate] = useLocation();
  const recs = selectOrderedRecommendations(state);

  return (
    <section aria-labelledby="recs-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="recs-heading" className="text-lg font-semibold tracking-tight">
          Recommendations
        </h2>
        <p className="text-xs text-muted-foreground">
          Ranked, inspectable proposals. Nothing executes from here — every move passes through Do
          and its preflight.
        </p>
      </div>

      {recs.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          hint="Create one from a Think analysis or an Advisor synthesis — start by analyzing the combine pricing update in Σ."
          action={
            <Button size="sm" onClick={() => navigate("/demo/command-center/updates")}>
              Go to Updates
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recs.map((r, i) => (
            <RecommendationCard key={r.id} rec={r} isFirst={i === 0} isLast={i === recs.length - 1} />
          ))}
        </ul>
      )}
    </section>
  );
}
