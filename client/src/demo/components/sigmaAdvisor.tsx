import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { GitBranch, Info, Play, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdvisorPersona, PersonaPerspective } from "../domain/types";
import { selectActiveAdvisor, selectActiveThink, selectActiveUpdate } from "../domain/selectors";
import { EVIDENCE_BY_ID, SOURCE_LABELS } from "../fixtures/evidence";
import { PERSONAS, PERSONA_BY_ID, PERSPECTIVE_BY_PERSONA, SYNTHESIS } from "../fixtures/personas";
import { SCENARIO, fmtPct } from "../fixtures/scenario";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { ConfidencePill, EmptyState, PanelCard, SectionLabel, SourceChip, StatusBadge } from "./bits";
import { ScrubSlider, useUiSignal } from "./interaction";
import { CanvasHeader, ConstraintBand, OptionComparisonAt } from "./sigmaShared";

const STATE_LABELS: Record<string, string> = {
  neutral: "neutral Σ",
  single: "single lens",
  multi: "multi-lens",
  "board-synthesis": "Board Synthesis",
  saved: "saved",
};

function PersonaChip({
  persona,
  selected,
  onToggle,
  onInfo,
}: {
  persona: AdvisorPersona;
  selected: boolean;
  onToggle: () => void;
  onInfo: () => void;
}) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-md border" style={{ borderColor: selected ? persona.accentHex : "var(--color-border)" }}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span aria-hidden style={{ color: persona.accentHex }}>{persona.icon}</span>
        <span className="font-mono font-medium">{persona.name}</span>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">{persona.title}</span>
      </button>
      <button
        type="button"
        onClick={onInfo}
        aria-label={`About the ${persona.name} persona`}
        className="border-l border-border px-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Info size={12} aria-hidden />
      </button>
    </span>
  );
}

/** Marketplace-ready metadata — truthful built-in values, no commerce UI. */
function PersonaDetail({ persona, onClose }: { persona: AdvisorPersona; onClose: () => void }) {
  return (
    <PanelCard className="flex flex-col gap-3 p-4" style={{ borderColor: `${persona.accentHex}55` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden style={{ color: persona.accentHex }}>{persona.icon}</span>
            <span className="font-mono">{persona.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{persona.title} · v{persona.version}</span>
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">{persona.brandRole}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2">
        <Meta label="Creator / publisher" value={`${persona.creator} (${persona.verification === "verified-publisher" ? "verified" : "unverified"})`} />
        <Meta label="Origin" value={`${persona.origin} · license ${persona.license} · entitlement ${persona.entitlement}`} />
        <Meta label="Methods" value={persona.methods.join(", ")} />
        <Meta label="Domains" value={persona.domains.join(", ")} />
        <Meta label="Provenance" value={persona.provenance} />
        <Meta label="Limitations" value={persona.limitations.join("; ")} />
      </dl>
      <div className="flex flex-wrap items-center gap-1.5">
        <SectionLabel className="mr-1">Requested data scopes</SectionLabel>
        {persona.requestedDataScopes.map(s => (
          <SourceChip key={s} source={s} />
        ))}
      </div>
    </PanelCard>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-secondary-foreground">{value}</dd>
    </div>
  );
}

function PerspectiveCard({
  perspective,
  conflictEmphasis,
}: {
  perspective: PersonaPerspective;
  conflictEmphasis: boolean;
}) {
  const persona = PERSONA_BY_ID[perspective.personaId];
  const hasConflict = perspective.conflictsWith.length > 0;
  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border bg-card p-4",
        conflictEmphasis && hasConflict ? "border-amber-400/60" : "border-border",
      )}
      aria-label={`${persona.name} perspective`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ color: persona.accentHex }}>{persona.icon}</span>
          <span className="font-mono text-sm font-semibold" style={{ color: persona.accentHex }}>
            {persona.name}
          </span>
          <span className="text-[11px] text-muted-foreground">{persona.title}</span>
        </span>
        <ConfidencePill value={perspective.confidence} />
      </header>
      <p className="text-xs text-foreground">{perspective.position}</p>
      <dl className="flex flex-col gap-1.5 text-[11px]">
        <Meta label="Key question" value={perspective.keyQuestion} />
        <Meta label="Assumptions" value={perspective.assumptions.join("; ")} />
        <Meta label="Principal risk" value={perspective.principalRisk} />
        <Meta label="Suggested move" value={`${perspective.suggestedMove} (${fmtPct(perspective.suggestedAdjustmentPct)})`} />
      </dl>
      <div className="flex flex-wrap items-center gap-1.5">
        <SectionLabel className="mr-1">Evidence used</SectionLabel>
        {Array.from(new Set(perspective.evidenceIds.map(id => EVIDENCE_BY_ID[id]?.source).filter(Boolean))).map(source => (
          <SourceChip key={source} source={source} />
        ))}
      </div>
      {hasConflict && (
        <p className={cn("rounded border px-2 py-1 text-[11px]", conflictEmphasis ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-border text-muted-foreground")}>
          Conflicts with{" "}
          {perspective.conflictsWith
            .map(c => `${PERSONA_BY_ID[c.personaId].name} on ${c.about}`)
            .join("; ")}
        </p>
      )}
    </article>
  );
}

export function AdvisorView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const { signal } = useUiSignal();
  const session = selectActiveAdvisor(state);
  const think = selectActiveThink(state);
  const update = selectActiveUpdate(state);
  const [detailPersonaId, setDetailPersonaId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const conflictRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!signal) return;
    if (signal.kind === "compare") setCompareOpen(true);
  }, [signal]);

  useEffect(() => {
    if (session?.conflictEmphasis) conflictRef.current?.scrollIntoView({ block: "nearest" });
  }, [session?.conflictEmphasis]);

  if (!session) {
    return (
      <section aria-labelledby="advisor-heading" className="flex flex-col gap-4">
        <h2 id="advisor-heading" className="sr-only">
          Advisor
        </h2>
        <EmptyState
          title="No Advisor session open"
          hint={
            think
              ? "Open a session to apply optional persona lenses to the active combine decision."
              : "Advisor works best with a decision on the canvas. Analyze an update in Think first, or open a neutral session."
          }
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => dispatch({ type: "advisor/open" })}>
                <Users aria-hidden />
                Open Advisor session
              </Button>
              {!think && (
                <Button size="sm" variant="outline" onClick={() => navigate("/demo/sigma/think")}>
                  Go to Think
                </Button>
              )}
            </div>
          }
        />
      </section>
    );
  }

  const selected = session.selectedPersonaIds;
  const perspectives = selected.map(id => PERSPECTIVE_BY_PERSONA[id]).filter(Boolean);
  const isBoard = session.state === "board-synthesis" || (session.state === "saved" && selected.length === 4);
  const currentPct = think?.adjustmentPct ?? SCENARIO.proposal.recommendedAdjustmentPct;

  return (
    <section aria-labelledby="advisor-heading" className="flex flex-col gap-4">
      <h2 id="advisor-heading" className="sr-only">
        Advisor — persona-guided strategy
      </h2>

      <CanvasHeader
        mode="advisor"
        question={think?.question ?? "How should Johnson Tractor respond to the combine pricing signal?"}
        objectTitle={update?.title ?? null}
        dataScope={think?.dataScope ?? []}
        confidence={isBoard ? SYNTHESIS.reconciledConfidence : null}
        saveState={STATE_LABELS[session.state]}
        handoffs={
          <>
            <Button size="sm" variant="outline" onClick={() => { dispatch({ type: "advisor/save" }); announce("Advisor session saved."); }} disabled={session.state === "saved"}>
              <Save aria-hidden />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch({ type: "recommendation/create" });
                announce("Reconciled strategy saved as a recommendation.");
                navigate("/demo/command-center/recommendations");
              }}
            >
              <GitBranch aria-hidden />
              Save as Recommendation
            </Button>
            <Button
              size="sm"
              onClick={() => {
                dispatch({ type: "do/open" });
                navigate("/demo/sigma/do");
              }}
            >
              <Play aria-hidden />
              Act in Do
            </Button>
          </>
        }
      />

      {/* Persona selector — optional lenses, never separate chat threads. */}
      <PanelCard className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>Lenses — optional, brandable, evidence-bound</SectionLabel>
          <div className="flex gap-1.5">
            <Button size="sm" variant={selected.length === 0 ? "secondary" : "ghost"} onClick={() => dispatch({ type: "advisor/clear-personas" })}>
              Neutral Σ
            </Button>
            <Button
              size="sm"
              variant={isBoard ? "secondary" : "outline"}
              onClick={() => {
                dispatch({ type: "advisor/board-synthesis" });
                announce("Board Synthesis: all four lenses reconciled.");
              }}
            >
              Board Synthesis
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Advisor personas">
          {PERSONAS.map(p => (
            <PersonaChip
              key={p.id}
              persona={p}
              selected={selected.includes(p.id)}
              onToggle={() => dispatch({ type: "advisor/toggle-persona", personaId: p.id })}
              onInfo={() => setDetailPersonaId(cur => (cur === p.id ? null : p.id))}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Σ is the neutral synthesizer, not a persona. Lenses reweight the same shared canvas — they
          cannot see beyond the visible scope and cannot execute.
        </p>
      </PanelCard>

      {detailPersonaId && (
        <PersonaDetail persona={PERSONA_BY_ID[detailPersonaId]} onClose={() => setDetailPersonaId(null)} />
      )}

      {/* Shared constraint band: every lens is comparable on one axis. */}
      {selected.length > 0 && (
        <PanelCard className="flex flex-col gap-3 p-4">
          <SectionLabel>Shared decision axis — list adjustment</SectionLabel>
          <ConstraintBand
            currentPct={currentPct}
            floorPct={SCENARIO.finance.marginFloorPct}
            conflictRange={
              session.conflictEmphasis
                ? [SCENARIO.proposal.ledgerPreferredPct, SCENARIO.proposal.signalPreferredPct]
                : null
            }
            markers={perspectives.map(p => ({
              pct: p.suggestedAdjustmentPct,
              label: PERSONA_BY_ID[p.personaId].name,
              colorHex: PERSONA_BY_ID[p.personaId].accentHex,
              emphasis:
                session.conflictEmphasis &&
                (p.personaId === "per-ledger" || p.personaId === "per-signal"),
            }))}
          />
          {think && (
            <ScrubSlider
              idPrefix="advisor"
              value={think.adjustmentPct}
              defaultValue={think.defaultAdjustmentPct}
              onChange={pct => dispatch({ type: "think/scrub", adjustmentPct: pct })}
              onReset={() => dispatch({ type: "think/reset-scrub" })}
            />
          )}
        </PanelCard>
      )}

      {/* Neutral synthesis (no lens selected). */}
      {selected.length === 0 && (
        <PanelCard className="flex flex-col gap-3 p-4">
          <SectionLabel>Neutral Σ synthesis</SectionLabel>
          <p className="text-sm text-foreground">{SYNTHESIS.neutral}</p>
          <div className="border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={() => setCompareOpen(o => !o)} aria-expanded={compareOpen}>
              Compare the options
            </Button>
          </div>
          {compareOpen && <OptionComparisonAt currentPct={currentPct} />}
        </PanelCard>
      )}

      {/* Perspective overlays on the shared canvas. */}
      {perspectives.length > 0 && (
        <div className={cn("grid gap-3", perspectives.length > 1 && "lg:grid-cols-2")}>
          {perspectives.map(p => (
            <PerspectiveCard key={p.personaId} perspective={p} conflictEmphasis={session.conflictEmphasis} />
          ))}
        </div>
      )}

      {/* Board Synthesis: consensus, disagreement, reconciled move. */}
      {isBoard && (
        <div ref={conflictRef} tabIndex={-1} className="focus-visible:outline-none">
          <PanelCard className="flex flex-col gap-3 border-accent/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>Board Synthesis — Σ reconciles the lenses</SectionLabel>
              <div className="flex items-center gap-2">
                <ConfidencePill value={SYNTHESIS.reconciledConfidence} />
                <Button
                  size="sm"
                  variant={session.conflictEmphasis ? "secondary" : "outline"}
                  aria-pressed={session.conflictEmphasis}
                  onClick={() => dispatch({ type: "advisor/emphasize-conflict", on: !session.conflictEmphasis })}
                >
                  Show me where they disagree
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <StatusBadge tone="success">Consensus</StatusBadge>
                <ul className="list-inside list-disc text-xs text-secondary-foreground">
                  {SYNTHESIS.consensus.map(c => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <StatusBadge tone="warning">Disagreement</StatusBadge>
                <p className={cn("text-xs", session.conflictEmphasis ? "text-amber-200" : "text-secondary-foreground")}>
                  {SYNTHESIS.disagreement}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <SectionLabel className="mb-1">Reconciled move</SectionLabel>
              <p className="text-sm text-foreground">{SYNTHESIS.reconciledMove}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Unresolved: {SYNTHESIS.unresolvedRisk}
              </p>
            </div>
          </PanelCard>
        </div>
      )}
    </section>
  );
}
