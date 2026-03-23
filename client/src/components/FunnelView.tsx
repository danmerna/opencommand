import { trpc } from "@/lib/trpc";
import { TrendingDown, Users, CheckCircle2, ArrowDown, Info } from "lucide-react";

type FunnelStage = {
  key: string;
  label: string;
  description: string;
  count: number;
};

// ─── Colour palette per stage index ──────────────────────────────────────────
const STAGE_COLORS = [
  { bar: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/10" },
  { bar: "bg-teal-400",    text: "text-teal-400",    border: "border-teal-400/30",    bg: "bg-teal-400/10"    },
  { bar: "bg-cyan-400",    text: "text-cyan-400",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  { bar: "bg-sky-400",     text: "text-sky-400",     border: "border-sky-400/30",     bg: "bg-sky-400/10"     },
  { bar: "bg-blue-400",    text: "text-blue-400",    border: "border-blue-400/30",    bg: "bg-blue-400/10"    },
  { bar: "bg-violet-400",  text: "text-violet-400",  border: "border-violet-400/30",  bg: "bg-violet-400/10"  },
  { bar: "bg-purple-400",  text: "text-purple-400",  border: "border-purple-400/30",  bg: "bg-purple-400/10"  },
  { bar: "bg-fuchsia-400", text: "text-fuchsia-400", border: "border-fuchsia-400/30", bg: "bg-fuchsia-400/10" },
];

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function dropOff(current: number, prev: number) {
  if (prev === 0) return 0;
  return Math.round(((prev - current) / prev) * 100);
}

// ─── Single funnel bar row ────────────────────────────────────────────────────
function FunnelRow({
  stage,
  index,
  topCount,
  prevCount,
  isLast,
}: {
  stage: FunnelStage;
  index: number;
  topCount: number;
  prevCount: number;
  isLast: boolean;
}) {
  const color = STAGE_COLORS[index % STAGE_COLORS.length];
  const widthPct = pct(stage.count, topCount);
  const drop = index > 0 ? dropOff(stage.count, prevCount) : 0;
  const lost = prevCount - stage.count;

  return (
    <div className="group">
      {/* Drop-off connector */}
      {index > 0 && (
        <div className="flex items-center gap-3 py-1 px-4">
          <div className="w-6 flex justify-center">
            <ArrowDown size={13} className="text-muted-foreground/40" />
          </div>
          {lost > 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown size={11} className="text-red-400" />
              <span className="text-red-400 font-medium">{drop}% drop-off</span>
              <span>— {lost.toLocaleString()} user{lost !== 1 ? "s" : ""} didn't reach this step</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No drop-off</span>
          )}
        </div>
      )}

      {/* Stage row */}
      <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${color.border} ${color.bg} transition-all`}>
        {/* Step number */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color.bg} ${color.text} border ${color.border}`}>
          {index + 1}
        </div>

        {/* Label + description */}
        <div className="w-52 shrink-0">
          <p className={`text-sm font-semibold ${color.text}`}>{stage.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
        </div>

        {/* Bar */}
        <div className="flex-1 h-7 bg-muted/30 rounded-lg overflow-hidden relative">
          <div
            className={`h-full ${color.bar} rounded-lg transition-all duration-700`}
            style={{ width: `${Math.max(widthPct, stage.count > 0 ? 2 : 0)}%` }}
          />
          <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-foreground/80">
            {widthPct}% of total
          </span>
        </div>

        {/* Count */}
        <div className="w-20 text-right shrink-0">
          <p className={`text-lg font-bold ${color.text}`}>{stage.count.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">users</p>
        </div>

        {/* Completion badge for last stage */}
        {isLast && stage.count > 0 && (
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ─── Summary KPI strip ────────────────────────────────────────────────────────
function FunnelSummary({ stages }: { stages: FunnelStage[] }) {
  if (!stages.length) return null;
  const top = stages[0].count;
  const bottom = stages[stages.length - 1].count;
  const overallConversion = pct(bottom, top);

  // Biggest single drop
  let biggestDrop = 0;
  let biggestDropLabel = "";
  for (let i = 1; i < stages.length; i++) {
    const d = dropOff(stages[i].count, stages[i - 1].count);
    if (d > biggestDrop) {
      biggestDrop = d;
      biggestDropLabel = stages[i].label;
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-emerald-400">{overallConversion}%</p>
        <p className="text-xs text-muted-foreground mt-1">Overall Conversion</p>
        <p className="text-xs text-muted-foreground">{bottom.toLocaleString()} of {top.toLocaleString()} users</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-foreground">{top.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Total Users</p>
        <p className="text-xs text-muted-foreground">entered the funnel</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-red-400">{biggestDrop}%</p>
        <p className="text-xs text-muted-foreground mt-1">Biggest Drop-off</p>
        <p className="text-xs text-muted-foreground truncate">at "{biggestDropLabel}"</p>
      </div>
    </div>
  );
}

// ─── Main FunnelView ──────────────────────────────────────────────────────────
export default function FunnelView() {
  const { data, isLoading } = trpc.admin.funnelStats.useQuery();

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
        Loading funnel data…
      </div>
    );
  }

  if (!data || !data.stages.length) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No funnel data available yet.
      </div>
    );
  }

  const { stages } = data;
  const topCount = stages[0].count;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Sign-up Funnel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tracks how users progress from sign-up through strategy adoption
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-1.5">
          <Info size={11} />
          <span>Live data · all-time</span>
        </div>
      </div>

      {/* Summary KPIs */}
      <FunnelSummary stages={stages} />

      {/* Funnel bars */}
      <div className="space-y-0">
        {stages.map((stage, i) => (
          <FunnelRow
            key={stage.key}
            stage={stage}
            index={i}
            topCount={topCount}
            prevCount={i > 0 ? stages[i - 1].count : topCount}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-muted/20 border border-border rounded-xl">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Stage Definitions</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {stages.map((s, i) => {
            const color = STAGE_COLORS[i % STAGE_COLORS.length];
            return (
              <div key={s.key} className="flex items-start gap-2">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${color.bar}`} />
                <div>
                  <span className="text-xs font-medium text-foreground">{s.label}</span>
                  <span className="text-xs text-muted-foreground"> — {s.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
