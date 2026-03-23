import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";

const FREQ_COLORS: Record<string, string> = {
  daily:     "text-blue-400 border-blue-400/30 bg-blue-400/5",
  weekly:    "text-violet-400 border-violet-400/30 bg-violet-400/5",
  monthly:   "text-amber-400 border-amber-400/30 bg-amber-400/5",
  quarterly: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
};

function BriefingCard({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const freqClass = FREQ_COLORS[log.frequency] ?? "text-muted-foreground border-border bg-muted/10";

  return (
    <div className="card-minimal group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${freqClass}`}>
              <Calendar size={9} />
              {log.frequency}
            </span>
            {log.companyName && (
              <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                {log.companyName}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-foreground leading-snug mb-1">{log.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            {new Date(log.deliveredAt).toLocaleString(undefined, {
              year: "numeric", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{log.content}</p>
        </div>
      )}
    </div>
  );
}

export default function Briefings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const briefingsQ = trpc.briefings.list.useQuery({}, { enabled: isAuthenticated });
  const briefings = briefingsQ.data ?? [];

  // Group by month for timeline display
  const grouped: Record<string, typeof briefings> = {};
  for (const b of briefings) {
    const key = new Date(b.deliveredAt).toLocaleDateString(undefined, { year: "numeric", month: "long" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate("/mission-control")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to Mission Control"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">OpenCommand</p>
            <h1 className="text-2xl font-light text-foreground tracking-tight">Briefing History</h1>
          </div>
        </div>

        {briefingsQ.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : briefings.length === 0 ? (
          <div className="card-minimal text-center py-20">
            <BookOpen size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-foreground text-sm font-medium mb-1">No briefings delivered yet</p>
            <p className="text-muted-foreground text-xs mb-6 max-w-xs mx-auto">
              Briefings are delivered automatically on your chosen cadence. Set your frequency in the onboarding or on the Strategy tab in Mission Control.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => navigate("/mission-control")}
            >
              Go to Mission Control
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([month, logs]) => (
              <div key={month}>
                <p className="text-label text-xs mb-4 sticky top-0 bg-background py-1">{month}</p>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <BriefingCard key={log.id} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
