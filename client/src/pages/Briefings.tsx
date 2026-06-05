import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, Clock, ChevronDown, ChevronUp, Download, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FREQ_COLORS: Record<string, string> = {
  daily:     "text-blue-400 border-blue-400/30 bg-blue-400/5",
  weekly:    "text-violet-400 border-violet-400/30 bg-violet-400/5",
  monthly:   "text-amber-400 border-amber-400/30 bg-amber-400/5",
  quarterly: "text-accent border-accent/30 bg-accent/5",
};

async function downloadBriefingPdf(log: any) {
  // Dynamically import jsPDF to keep the initial bundle lean
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header bar
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageW, 18, "F");

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("OpenCommand — The orchestration layer", margin, 11);

  const freqLabel = (log.frequency as string).charAt(0).toUpperCase() + (log.frequency as string).slice(1);
  const dateStr = new Date(log.deliveredAt).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`${freqLabel} Briefing  ·  ${log.companyName ?? ""}  ·  ${dateStr}`, pageW - margin, 11, { align: "right" });

  y = 30;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(240, 240, 240);
  doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(log.title as string, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 6;

  // Divider
  doc.setDrawColor(50, 50, 50);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Body content
  doc.setFontSize(10);
  doc.setTextColor(170, 170, 170);
  doc.setFont("helvetica", "normal");

  const bodyLines = doc.splitTextToSize((log.content as string) ?? "", contentW);
  const lineH = 5.5;
  const pageH = doc.internal.pageSize.getHeight();

  for (const line of bodyLines) {
    if (y + lineH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineH;
  }

  // Footer
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`opencommand.co  ·  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  const safeTitle = (log.title as string).replace(/[^a-z0-9]/gi, "_").slice(0, 50);
  doc.save(`${safeTitle}.pdf`);
}

function BriefingCard({ log, companyId }: { log: any; companyId?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [approvedActions, setApprovedActions] = useState<Set<string>>(new Set());
  const freqClass = FREQ_COLORS[log.frequency] ?? "text-muted-foreground border-border bg-muted/10";

  const approveMutation = trpc.briefings.approveAction.useMutation({
    onSuccess: (_, vars) => {
      setApprovedActions(prev => new Set(prev).add(vars.actionText));
      toast.success("Action approved and task created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Extract [ACTION REQUIRED] items from content
  const actionItems = (log.content as string ?? "").split("\n")
    .filter((line: string) => line.includes("[ACTION REQUIRED]"))
    .map((line: string) => line.replace(/\[ACTION REQUIRED\]/g, "").trim());

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadBriefingPdf(log);
    } finally {
      setDownloading(false);
    }
  }

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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Download as PDF"
            title="Download as PDF"
          >
            {downloading
              ? <div className="w-3.5 h-3.5 border border-muted-foreground/40 border-t-foreground rounded-full animate-spin" />
              : <Download size={14} />
            }
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{log.content}</p>

          {/* Action Required items with approve buttons */}
          {actionItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-2">Actions Requiring Approval</p>
              <div className="space-y-2">
                {actionItems.map((action: string, i: number) => {
                  const isApproved = approvedActions.has(action);
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                      <span className="flex-1 text-xs text-foreground">{action}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isApproved || approveMutation.isPending}
                        onClick={() => companyId && approveMutation.mutate({ briefingId: log.id, actionText: action, companyId })}
                        className={`shrink-0 text-[10px] gap-1 h-6 ${isApproved ? "text-accent border-accent/30" : "text-amber-400 border-amber-400/30 hover:bg-amber-400/10"}`}
                      >
                        {isApproved ? <><CheckCircle2 size={10} /> Approved</> : "Approve"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Download size={11} />
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Briefings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQ.data ?? [];
  const activeCompanyId = companies[0]?.id;

  const briefingsQ = trpc.briefings.list.useQuery({}, { enabled: isAuthenticated });
  const briefings = briefingsQ.data ?? [];
  const utils = trpc.useUtils();

  const generateMutation = trpc.briefings.generateNow.useMutation({
    onSuccess: () => {
      utils.briefings.list.invalidate();
      toast.success("Briefing generated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

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
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">OpenCommand</p>
            <h1 className="text-2xl font-light text-foreground tracking-tight">Briefing History</h1>
          </div>
          {activeCompanyId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate({ companyId: activeCompanyId, frequency: "daily" })}
            >
              {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generate Now
            </Button>
          )}
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
                    <BriefingCard key={log.id} log={log} companyId={activeCompanyId} />
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
