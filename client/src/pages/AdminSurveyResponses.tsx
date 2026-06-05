import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ThumbsUp, ThumbsDown, Download, Search, ChevronDown, ChevronUp,
  Mail, Calendar, Building2, AlertCircle, ArrowLeft, BarChart2
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
type SurveyRow = {
  id: number;
  companyId: number | null;
  thumbs: "up" | "down";
  questions: unknown;
  responses: unknown;
  email: string | null;
  briefingFrequency: string | null;
  createdAt: Date | string;
  companyName: string | null;
  userName: string | null;
  userEmail: string | null;
  userId: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy h:mm a");
}

function getQuestions(row: SurveyRow): string[] {
  if (!row.questions) return [];
  if (Array.isArray(row.questions)) return row.questions as string[];
  return [];
}

function getResponses(row: SurveyRow): string[] {
  if (!row.responses) return [];
  if (Array.isArray(row.responses)) return row.responses as string[];
  return [];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(surveys: SurveyRow[]) {
  const maxQ = Math.max(...surveys.map(s => getQuestions(s).length), 0);
  const headers = [
    "ID", "Date", "Thumbs", "User Name", "User Email", "Company", "Waitlist Email", "Briefing Frequency",
    ...Array.from({ length: maxQ }, (_, i) => `Q${i + 1}`),
    ...Array.from({ length: maxQ }, (_, i) => `A${i + 1}`),
  ];
  const rows = surveys.map(s => {
    const qs = getQuestions(s);
    const rs = getResponses(s);
    return [
      s.id,
      fmtDate(s.createdAt),
      s.thumbs,
      s.userName ?? "",
      s.userEmail ?? "",
      s.companyName ?? "",
      s.email ?? "",
      s.briefingFrequency ?? "",
      ...Array.from({ length: maxQ }, (_, i) => qs[i] ?? ""),
      ...Array.from({ length: maxQ }, (_, i) => rs[i] ?? ""),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
  });
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `survey-responses-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Expandable Row ───────────────────────────────────────────────────────────
function SurveyTableRow({ survey }: { survey: SurveyRow }) {
  const [expanded, setExpanded] = useState(false);
  const questions = getQuestions(survey);
  const responses = getResponses(survey);

  return (
    <>
      <div
        className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Thumbs */}
        <div className="col-span-1 flex items-center">
          {survey.thumbs === "up" ? (
            <div className="flex items-center gap-1 text-accent">
              <ThumbsUp size={14} />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400">
              <ThumbsDown size={14} />
            </div>
          )}
        </div>
        {/* User */}
        <div className="col-span-3 flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground shrink-0">
            {(survey.userName || survey.userEmail || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{survey.userName || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{survey.userEmail || "—"}</p>
          </div>
        </div>
        {/* Company */}
        <div className="col-span-2 flex items-center text-sm text-muted-foreground truncate">
          {survey.companyName || "—"}
        </div>
        {/* Waitlist Email */}
        <div className="col-span-2 flex items-center gap-1 min-w-0">
          {survey.email ? (
            <span className="flex items-center gap-1 text-xs text-accent truncate">
              <Mail size={11} />
              {survey.email}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        {/* Briefing */}
        <div className="col-span-2 flex items-center text-xs text-muted-foreground capitalize">
          {survey.briefingFrequency || "—"}
        </div>
        {/* Date + expand */}
        <div className="col-span-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{fmtDate(survey.createdAt)}</span>
          {questions.length > 0 && (
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Q&A */}
      {expanded && questions.length > 0 && (
        <div className="bg-muted/10 border-b border-border/50 px-4 py-4 space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="grid grid-cols-12 gap-3">
              <div className="col-span-1 flex items-start pt-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Q{i + 1}</span>
              </div>
              <div className="col-span-11 space-y-1">
                <p className="text-xs font-medium text-foreground">{q}</p>
                <p className="text-sm text-muted-foreground">{responses[i] || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSurveyResponses() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [thumbsFilter, setThumbsFilter] = useState<"all" | "up" | "down">("all");

  const { data: surveys = [], isLoading } = trpc.admin.allSurveys.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const filtered = useMemo(() => {
    let result = surveys as SurveyRow[];
    if (thumbsFilter !== "all") result = result.filter(s => s.thumbs === thumbsFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.userName?.toLowerCase().includes(q) ||
        s.userEmail?.toLowerCase().includes(q) ||
        s.companyName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [surveys, thumbsFilter, search]);

  const upCount = (surveys as SurveyRow[]).filter(s => s.thumbs === "up").length;
  const downCount = (surveys as SurveyRow[]).filter(s => s.thumbs === "down").length;
  const total = surveys.length;
  const upPct = total > 0 ? Math.round((upCount / total) * 100) : 0;
  const waitlistCount = (surveys as SurveyRow[]).filter(s => s.email).length;

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">This page is restricted to admin accounts.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <a href="/admin/users" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft size={11} /> Admin
            </a>
            <span>/</span>
            <span className="text-foreground">Survey Responses</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Survey Responses</h1>
              <p className="text-sm text-muted-foreground">Post-onboarding feedback from demo recipients.</p>
            </div>
            <button
              onClick={() => exportCSV(filtered as SurveyRow[])}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              Export CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-semibold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Responses</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp size={14} className="text-accent" />
              <p className="text-2xl font-semibold text-accent">{upCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">{upPct}% found value</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsDown size={14} className="text-red-400" />
              <p className="text-2xl font-semibold text-red-400">{downCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">{total > 0 ? 100 - upPct : 0}% didn't find value</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={14} className="text-blue-400" />
              <p className="text-2xl font-semibold text-blue-400">{waitlistCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Joined waitlist</p>
          </div>
        </div>

        {/* Thumbs Split Bar */}
        {total > 0 && (
          <div className="mb-8 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <BarChart2 size={14} className="text-muted-foreground" />
                Value Sentiment
              </h3>
              <span className="text-xs text-muted-foreground">{total} total</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {upCount > 0 && (
                <div
                  className="bg-accent rounded-l-full transition-all"
                  style={{ width: `${upPct}%` }}
                  title={`${upCount} thumbs up (${upPct}%)`}
                />
              )}
              {downCount > 0 && (
                <div
                  className="bg-red-400 rounded-r-full transition-all"
                  style={{ width: `${100 - upPct}%` }}
                  title={`${downCount} thumbs down (${100 - upPct}%)`}
                />
              )}
            </div>
            <div className="flex items-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
                Found value — {upCount} ({upPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                Didn't find value — {downCount} ({100 - upPct}%)
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1">
            {(["all", "up", "down"] as const).map(f => (
              <button
                key={f}
                onClick={() => setThumbsFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  thumbsFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "up" ? <><ThumbsUp size={11} /> Positive</> : <><ThumbsDown size={11} /> Negative</>}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/20 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Company</div>
            <div className="col-span-2">Waitlist Email</div>
            <div className="col-span-2">Briefing</div>
            <div className="col-span-2">Date</div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading survey responses…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No survey responses yet</p>
              <p className="text-xs text-muted-foreground mt-1">Responses will appear here after demo recipients complete the onboarding flow.</p>
            </div>
          ) : (
            (filtered as SurveyRow[]).map(s => (
              <SurveyTableRow key={s.id} survey={s} />
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing {filtered.length} of {total} responses · Click any row to expand Q&amp;A
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
