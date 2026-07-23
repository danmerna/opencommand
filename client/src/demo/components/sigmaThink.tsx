import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, GitBranch, Play, Save, Sigma, Users, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectActiveThink, selectActiveUpdate } from "../domain/selectors";
import { scenarioReadout } from "../domain/calc";
import { EVIDENCE_BY_ID, SOURCE_LABELS } from "../fixtures/evidence";
import { SCENARIO, fmtPct, fmtUSD } from "../fixtures/scenario";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { useNarration } from "../hooks/useSpeech";
import { EmptyState, MonoValue, PanelCard, SectionLabel, StatusBadge } from "./bits";
import { ScrubSlider, useUiSignal } from "./interaction";
import { CanvasHeader, ConstraintBand, OptionComparison } from "./sigmaShared";

const SAVE_LABELS: Record<string, string> = {
  empty: "empty",
  generating: "generating…",
  ready: "ready",
  modified: "modified — unsaved",
  saved: "saved",
  error: "error",
};

export function ThinkView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const narration = useNarration();
  const { signal } = useUiSignal();
  const think = selectActiveThink(state);
  const update = selectActiveUpdate(state);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const compareRef = useRef<HTMLDivElement>(null);

  /* Deterministic "generation": the composition is assembled from fixtures
     after a short visible generating state. */
  useEffect(() => {
    if (think?.status !== "generating") return;
    const timer = setTimeout(() => {
      dispatch({ type: "think/ready" });
      announce("Analysis ready.");
    }, 900);
    return () => clearTimeout(timer);
  }, [think?.status, dispatch, announce]);

  /* Voice / command-menu signals reveal regions on the visible canvas. */
  useEffect(() => {
    if (!signal) return;
    if (signal.kind === "compare") compareRef.current?.scrollIntoView({ block: "nearest" });
    if (signal.kind === "summarize") setSummaryOpen(true);
  }, [signal]);

  if (!think) {
    return (
      <section aria-labelledby="think-heading" className="flex flex-col gap-4">
        <h2 id="think-heading" className="sr-only">
          Think
        </h2>
        <EmptyState
          title="No analysis in progress"
          hint="Think builds a visual analysis from an Update's unified evidence. Start from the combine pricing signal, or pick any update in Command Center."
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  dispatch({ type: "think/analyze", updateId: "upd-combine-pricing" });
                }}
              >
                <Sigma aria-hidden />
                Analyze the combine pricing update
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/demo/command-center/updates")}>
                <ArrowLeft aria-hidden />
                Choose an update
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  if (think.status === "error") {
    return (
      <section aria-labelledby="think-heading" className="flex flex-col gap-4">
        <h2 id="think-heading" className="sr-only">
          Think
        </h2>
        <EmptyState
          title="The analysis could not be assembled"
          hint="This deterministic demo recovered the canvas — start the analysis again from an update."
          action={
            <Button size="sm" onClick={() => dispatch({ type: "think/recover" })}>
              Clear and start over
            </Button>
          }
        />
      </section>
    );
  }

  const readout = scenarioReadout(think.adjustmentPct);
  const scopedEvidence = think.evidenceIds
    .map(id => EVIDENCE_BY_ID[id])
    .filter(Boolean)
    .filter(e => think.dataScope.includes(e.source));
  const isScenarioModel = think.recipe === "scenario-model";

  const summaryText = isScenarioModel
    ? `At ${fmtPct(think.adjustmentPct)}, the model projects ${readout.unitsMoved} of ${SCENARIO.combines.total} combines moving inside the ${SCENARIO.market.harvestWindowWeeks}-week window, trading ${fmtUSD(Math.abs(readout.marginImpact))} of margin for ${fmtUSD(readout.carryingSavings)} in carrying savings and ${fmtUSD(scenarioReadout(0).holdRisk - readout.holdRisk)} less auction-risk exposure — a net ${fmtUSD(readout.netPosition)} versus holding at list.`
    : `Evidence from ${think.dataScope.map(s => SOURCE_LABELS[s]).join(", ")} is mapped for inspection.`;

  const saveResult = () => {
    dispatch({ type: "think/save" });
    announce("Think result saved.");
  };

  return (
    <section aria-labelledby="think-heading" className="flex flex-col gap-4">
      <h2 id="think-heading" className="sr-only">
        Think — generative visual analysis
      </h2>

      <CanvasHeader
        mode="think"
        question={think.question}
        objectTitle={update?.title ?? null}
        dataScope={think.dataScope}
        confidence={update?.confidence ?? null}
        saveState={SAVE_LABELS[think.status]}
        handoffs={
          <>
            <Button size="sm" variant="outline" onClick={saveResult} disabled={think.status === "generating" || think.status === "saved"}>
              <Save aria-hidden />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch({ type: "recommendation/create" });
                announce("Recommendation created from this analysis.");
                navigate("/demo/command-center/recommendations");
              }}
              disabled={think.status === "generating"}
            >
              <GitBranch aria-hidden />
              Create Recommendation
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch({ type: "advisor/open" });
                navigate("/demo/sigma/advisor");
              }}
              disabled={think.status === "generating"}
            >
              <Users aria-hidden />
              Ask Advisor
            </Button>
            <Button
              size="sm"
              onClick={() => {
                dispatch({ type: "do/open" });
                navigate("/demo/sigma/do");
              }}
              disabled={think.status === "generating"}
            >
              <Play aria-hidden />
              Act in Do
            </Button>
          </>
        }
      />

      {think.status === "generating" ? (
        <PanelCard className="flex flex-col gap-3 p-4" aria-busy>
          <SectionLabel>Assembling the visual composition…</SectionLabel>
          <p className="text-xs text-muted-foreground">
            Selecting the right visual recipe for this question from the unified evidence — a
            deterministic composition in this demo.
          </p>
          <div className="flex flex-col gap-2" aria-hidden>
            {[80, 60, 72].map((w, i) => (
              <div key={i} className="h-8 rounded bg-muted/60" style={{ width: `${w}%` }} />
            ))}
          </div>
        </PanelCard>
      ) : isScenarioModel ? (
        <>
          {/* The generative composition: constraint band + scrub + readout. */}
          <PanelCard className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Scenario model — {SCENARIO.combines.total} combines, {SCENARIO.market.harvestWindowWeeks}-week window</SectionLabel>
              <StatusBadge>recipe: {think.recipe}</StatusBadge>
            </div>
            <ConstraintBand
              currentPct={think.adjustmentPct}
              floorPct={SCENARIO.finance.marginFloorPct}
              markers={[
                { pct: SCENARIO.proposal.ledgerPreferredPct, label: "LEDGER", colorHex: "#34d399" },
                { pct: SCENARIO.proposal.recommendedAdjustmentPct, label: "Reconciled", colorHex: "#93b4f5", emphasis: true },
                { pct: SCENARIO.proposal.signalPreferredPct, label: "SIGNAL / Birkey's", colorHex: "#f472b6" },
                { pct: SCENARIO.finance.marginFloorPct, label: "Margin floor", colorHex: "#f87171" },
              ]}
            />
            <ScrubSlider
              idPrefix="think"
              value={think.adjustmentPct}
              defaultValue={think.defaultAdjustmentPct}
              onChange={pct => dispatch({ type: "think/scrub", adjustmentPct: pct })}
              onReset={() => dispatch({ type: "think/reset-scrub" })}
            />
            <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
              <Readout label="Units moved" value={`${readout.unitsMoved} / ${SCENARIO.combines.total}`} />
              <Readout label="Projected revenue" value={fmtUSD(readout.projectedRevenue)} />
              <Readout label="Margin vs list" value={fmtUSD(readout.marginImpact)} />
              <Readout label="Net vs holding" value={fmtUSD(readout.netPosition)} accent />
            </dl>
          </PanelCard>

          <div ref={compareRef} tabIndex={-1} className="focus-visible:outline-none">
            <PanelCard className="flex flex-col gap-3 p-4">
              <SectionLabel>Compare the options</SectionLabel>
              <OptionComparison think={think} />
            </PanelCard>
          </div>
        </>
      ) : (
        <PanelCard className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Evidence map</SectionLabel>
            <StatusBadge>recipe: {think.recipe}</StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            This update maps to an evidence inspection rather than a pricing scenario. The combine
            pricing update carries the full scenario model.
          </p>
        </PanelCard>
      )}

      {think.status !== "generating" && (
        <>
          {/* Inspectable sources with scope filtering. */}
          <PanelCard className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>Evidence — {scopedEvidence.length} in scope</SectionLabel>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter data scope">
                {Array.from(new Set(think.evidenceIds.map(id => EVIDENCE_BY_ID[id]?.source).filter(Boolean))).map(src => {
                  const active = think.dataScope.includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      aria-pressed={active}
                      onClick={() => dispatch({ type: "think/toggle-scope", source: src })}
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[10px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active
                          ? "border-accent/50 text-accent"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {SOURCE_LABELS[src]}
                    </button>
                  );
                })}
              </div>
            </div>
            <ul className="flex flex-col gap-1.5">
              {scopedEvidence.map(e => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    <span className="font-mono text-secondary-foreground">{SOURCE_LABELS[e.source]}</span> — {e.fact}
                  </span>
                  {e.value && <MonoValue className="shrink-0 text-[11px]">{e.value}</MonoValue>}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-2">
              <SectionLabel className="mb-1">Assumptions</SectionLabel>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {think.assumptions.map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </PanelCard>

          {/* Summary region (voice: “Summarize this”). */}
          <PanelCard className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Summary</SectionLabel>
              <Button size="sm" variant="ghost" onClick={() => setSummaryOpen(o => !o)} aria-expanded={summaryOpen}>
                {summaryOpen ? "Hide" : "Show"}
              </Button>
            </div>
            {summaryOpen && (
              <>
                <p className="text-sm text-foreground">{summaryText}</p>
                {narration.supported && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (narration.speaking ? narration.cancel() : narration.speak(summaryText))}
                    >
                      {narration.speaking ? <VolumeX aria-hidden /> : <Play aria-hidden />}
                      {narration.speaking ? "Stop narration" : "Narrate"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </PanelCard>
        </>
      )}
    </section>
  );
}

function Readout({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd>
        <MonoValue className={cn("text-sm", accent && "text-accent")}>{value}</MonoValue>
      </dd>
    </div>
  );
}
