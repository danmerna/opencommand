import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SigmaSubtab, SourceSystem, ThinkResult } from "../domain/types";
import { scenarioReadout } from "../domain/calc";
import { SCENARIO, fmtPct, fmtUSD } from "../fixtures/scenario";
import { ConfidencePill, MonoValue, SectionLabel, SourceChip, StatusBadge } from "./bits";

/**
 * Compact executive header shared by Think, Advisor, and Do. The three
 * modes are one canvas: same question, object, scope, and saved state.
 */
export function CanvasHeader({
  mode,
  question,
  objectTitle,
  dataScope,
  confidence,
  saveState,
  handoffs,
}: {
  mode: SigmaSubtab;
  question: string;
  objectTitle: string | null;
  dataScope: SourceSystem[];
  confidence: number | null;
  saveState: string;
  handoffs: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="accent">Σ · {mode}</StatusBadge>
            <StatusBadge>{saveState}</StatusBadge>
            {confidence !== null && <ConfidencePill value={confidence} />}
          </div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{question}</h2>
          {objectTitle && (
            <p className="text-xs text-muted-foreground">
              Active object: <span className="text-secondary-foreground">{objectTitle}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">{handoffs}</div>
      </div>
      {dataScope.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <SectionLabel className="mr-1">Data scope</SectionLabel>
          {dataScope.map(s => (
            <SourceChip key={s} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface BandMarker {
  pct: number;
  label: string;
  colorHex: string;
  emphasis?: boolean;
}

/**
 * The shared constraint band: one axis from 0% to −8% list adjustment on
 * which every perspective, threshold, and the operator's scrub position
 * are directly comparable. Think and Advisor render the same grammar.
 */
export function ConstraintBand({
  markers,
  currentPct,
  floorPct,
  conflictRange,
}: {
  markers: BandMarker[];
  currentPct: number | null;
  floorPct: number;
  /** [from, to] adjustment range to shade as the disagreement zone. */
  conflictRange?: [number, number] | null;
}) {
  const toX = (pct: number) => `${(Math.min(0, Math.max(-8, pct)) / -8) * 100}%`;

  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="sr-only">
        Constraint band from 0 to minus 8 percent list adjustment.{" "}
        {markers.map(m => `${m.label} at ${fmtPct(m.pct)}`).join("; ")}
        {currentPct !== null ? `; current position ${fmtPct(currentPct)}` : ""}.
      </figcaption>
      <div className="relative mt-11 h-3 w-full rounded-full bg-muted" aria-hidden>
        {/* Region beyond the margin floor */}
        <div
          className="absolute inset-y-0 right-0 rounded-r-full bg-destructive/25"
          style={{ left: toX(floorPct) }}
        />
        {conflictRange && (
          <div
            className="absolute inset-y-0 border-x border-dashed border-amber-400/60 bg-amber-400/15"
            style={{
              left: toX(Math.max(conflictRange[0], conflictRange[1])),
              width: `calc(${toX(Math.min(conflictRange[0], conflictRange[1]))} - ${toX(Math.max(conflictRange[0], conflictRange[1]))})`,
            }}
          />
        )}
        {markers.map((m, i) => (
          <div key={m.label} className="absolute -top-10 bottom-0" style={{ left: toX(m.pct) }}>
            <span
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap font-mono text-[9px]",
                m.emphasis ? "font-semibold" : "opacity-80",
              )}
              style={{ color: m.colorHex, top: i % 2 === 0 ? "12px" : "-2px" }}
            >
              {m.label} {fmtPct(m.pct)}
            </span>
            <span
              className="absolute top-7 h-full w-px -translate-x-1/2"
              style={{ backgroundColor: m.colorHex, opacity: m.emphasis ? 1 : 0.6 }}
            />
          </div>
        ))}
        {currentPct !== null && (
          <div
            className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: toX(currentPct) }}
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden>
        <span>0%</span>
        <span>−8%</span>
      </div>
    </figure>
  );
}

/** Three-column option comparison used by Think and revealed by “Compare the options”. */
export function OptionComparison({ think }: { think: ThinkResult }) {
  return <OptionComparisonAt currentPct={think.adjustmentPct} />;
}

export function OptionComparisonAt({ currentPct }: { currentPct: number }) {
  const options = [
    { key: "hold", title: "Hold at list", pct: 0, note: "Wait out the window" },
    {
      key: "reconciled",
      title: "Reconciled reprice",
      pct: currentPct,
      note: "Board Synthesis move (scrub to explore)",
    },
    {
      key: "match",
      title: `Match ${SCENARIO.market.competitor}`,
      pct: SCENARIO.proposal.signalPreferredPct,
      note: "SIGNAL's parity move",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Option comparison">
      {options.map(o => {
        const r = scenarioReadout(o.pct);
        const highlighted = o.key === "reconciled";
        return (
          <div
            key={o.key}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3",
              highlighted ? "border-accent/50 bg-accent/5" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">{o.title}</span>
              <MonoValue className="text-xs text-accent">{fmtPct(r.adjustmentPct)}</MonoValue>
            </div>
            <dl className="flex flex-col gap-1 text-[11px]">
              <Metric label="Units moved in window" value={`${r.unitsMoved} of ${SCENARIO.combines.total}`} />
              <Metric label="Projected revenue" value={fmtUSD(r.projectedRevenue)} />
              <Metric label="Margin vs list" value={fmtUSD(r.marginImpact)} />
              <Metric label="Carrying saved" value={fmtUSD(r.carryingSavings)} />
              <Metric label="Auction-risk exposure" value={fmtUSD(r.holdRisk)} />
              <Metric label="Net vs holding" value={fmtUSD(r.netPosition)} strong />
            </dl>
            <p className="text-[10px] text-muted-foreground">{o.note}</p>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <MonoValue className={cn("text-[11px]", strong && "font-semibold text-accent")}>{value}</MonoValue>
      </dd>
    </div>
  );
}
