import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  MessageSquare, Bug, Lightbulb, MessageCircle, Heart,
  ArrowRight, CheckCircle2, Eye, Clock, Filter,
} from "lucide-react";

type FilterType = "all" | "bug" | "feature" | "general" | "praise";
type FilterStatus = "all" | "new" | "reviewed" | "resolved";

const TYPE_META: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: "text-red-400", label: "Bug" },
  feature: { icon: Lightbulb, color: "text-amber-400", label: "Feature" },
  general: { icon: MessageCircle, color: "text-blue-400", label: "General" },
  praise: { icon: Heart, color: "text-pink-400", label: "Praise" },
};

const STATUS_META: Record<string, { icon: typeof Clock; color: string; label: string; badgeClass: string }> = {
  new: { icon: Clock, color: "text-amber-400", label: "New", badgeClass: "border-amber-400/30 text-amber-400 bg-amber-400/5" },
  reviewed: { icon: Eye, color: "text-blue-400", label: "Reviewed", badgeClass: "border-blue-400/30 text-blue-400 bg-blue-400/5" },
  resolved: { icon: CheckCircle2, color: "text-accent", label: "Resolved", badgeClass: "border-accent/30 text-accent bg-accent/5" },
};

export default function FeedbackAdmin() {
  const { isAuthenticated } = useAuth();
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const { data: feedback, isLoading } = trpc.feedback.list.useQuery(undefined, { enabled: isAuthenticated });
  const updateStatus = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => utils.feedback.list.invalidate(),
  });
  const utils = trpc.useUtils();

  const filtered = useMemo(() => {
    if (!feedback) return [];
    return feedback.filter((f: any) => {
      if (typeFilter !== "all" && f.type !== typeFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      return true;
    });
  }, [feedback, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    if (!feedback) return { total: 0, new: 0, reviewed: 0, resolved: 0, bug: 0, feature: 0, general: 0, praise: 0 };
    return {
      total: feedback.length,
      new: feedback.filter((f: any) => f.status === "new").length,
      reviewed: feedback.filter((f: any) => f.status === "reviewed").length,
      resolved: feedback.filter((f: any) => f.status === "resolved").length,
      bug: feedback.filter((f: any) => f.type === "bug").length,
      feature: feedback.filter((f: any) => f.type === "feature").length,
      general: feedback.filter((f: any) => f.type === "general").length,
      praise: feedback.filter((f: any) => f.type === "praise").length,
    };
  }, [feedback]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-full p-10">
        <div className="text-center max-w-sm">
          <MessageSquare size={32} className="text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">Sign in to view feedback</h2>
          <p className="text-sm text-muted-foreground mb-6">Manage user feedback submissions.</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Sign in <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={18} className="text-muted-foreground" />
            <h1 className="text-2xl font-light tracking-tight">Feedback</h1>
          </div>
          <p className="text-sm text-muted-foreground">Review and manage user feedback submissions.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-xl p-4 bg-white/[0.02]">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-light">{counts.total}</p>
        </div>
        <div className="border border-amber-400/20 rounded-xl p-4 bg-amber-400/[0.02]">
          <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">New</p>
          <p className="text-2xl font-light text-amber-400">{counts.new}</p>
        </div>
        <div className="border border-blue-400/20 rounded-xl p-4 bg-blue-400/[0.02]">
          <p className="text-xs text-blue-400/70 uppercase tracking-wider mb-1">Reviewed</p>
          <p className="text-2xl font-light text-blue-400">{counts.reviewed}</p>
        </div>
        <div className="border border-accent/20 rounded-xl p-4 bg-accent/[0.02]">
          <p className="text-xs text-accent/70 uppercase tracking-wider mb-1">Resolved</p>
          <p className="text-2xl font-light text-accent">{counts.resolved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Type:</span>
          <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
            {(["all", "bug", "feature", "general", "praise"] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                  typeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : TYPE_META[t]?.label ?? t}
                {t !== "all" && <span className="ml-1 opacity-50">({counts[t as keyof typeof counts]})</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status:</span>
          <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
            {(["all", "new", "reviewed", "resolved"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                  statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : STATUS_META[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl">
          <MessageSquare size={24} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No feedback matching filters.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Feedback will appear here as users submit it via the widget.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const typeMeta = TYPE_META[item.type] ?? TYPE_META.general;
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.new;
            const TypeIcon = typeMeta.icon;
            return (
              <div key={item.id} className="border border-border rounded-xl p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${typeMeta.color}`}>
                    <TypeIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        {typeMeta.label}
                      </Badge>
                      {item.page && (
                        <span className="text-[10px] text-muted-foreground/50 font-mono">{item.page}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/40 ml-auto shrink-0">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] text-muted-foreground/50">User #{item.userId}</span>
                      <div className="flex-1" />
                      {item.status !== "reviewed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-blue-400"
                          onClick={() => updateStatus.mutate({ id: item.id, status: "reviewed" })}
                          disabled={updateStatus.isPending}
                        >
                          <Eye size={11} /> Mark Reviewed
                        </Button>
                      )}
                      {item.status !== "resolved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-accent"
                          onClick={() => updateStatus.mutate({ id: item.id, status: "resolved" })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 size={11} /> Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
