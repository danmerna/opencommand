import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain, ChevronDown, ChevronRight, Clock, Search, Zap,
  ArrowRight, CheckCircle2, Loader2, History,
  BarChart3, Layers, Database,
} from "lucide-react";

const CONFIDENCE_COLOR = (score: number) => score >= 0.8 ? "text-emerald-400" : score >= 0.5 ? "text-amber-400" : "text-red-400";

export default function ContextHistory() {
  const { isAuthenticated } = useAuth();
  const subscription = useSubscription();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const contextsQuery = trpc.context.list.useQuery(undefined, { enabled: isAuthenticated });
  const contexts = contextsQuery.data ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const ctx of contexts) { ((ctx.inferredCategories as string[] | null) ?? []).forEach(c => cats.add(c)); }
    return Array.from(cats).sort();
  }, [contexts]);

  const filtered = useMemo(() => contexts.filter(ctx => {
    const matchesSearch = !searchQuery || ctx.requestText?.toLowerCase().includes(searchQuery.toLowerCase()) || (ctx.inferredCategories as string[] | null)?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || (ctx.inferredCategories as string[] | null)?.includes(filterCategory);
    return matchesSearch && matchesCategory;
  }), [contexts, searchQuery, filterCategory]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <History size={32} className="text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-light text-foreground">Context History</h1>
        <p className="text-muted-foreground text-sm">View your full Interpret → Gather → Contextualize chain history.</p>
        <a href={getLoginUrl()}><Button>Sign In</Button></a>
      </div>
    );
  }

  if (!subscription.isPro && !subscription.isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">IntelligenceOS</p>
          <h1 className="text-4xl font-light text-foreground tracking-tight">Context History</h1>
          <p className="text-muted-foreground text-sm mt-2">Full context engineering chain — Interpret → Gather → Contextualize.</p>
        </div>
        <UpgradePrompt
          feature="Advanced Context Engineering"
          description="Full context history, multi-step workflow chains, and persistent context across projects are available on the Pro plan."
        />
      </div>
    );
  }

  const highConfidenceCount = contexts.filter(c => c.status === "ready").length;
  const avgConfidence = contexts.length > 0 ? highConfidenceCount / contexts.length : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight">Context History</h1>
        <p className="text-muted-foreground text-sm mt-2">Full Interpret → Gather → Contextualize chain — how the engine learned your business.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Contexts", value: contexts.length, icon: <History size={14} /> },
          { label: "High Confidence", value: highConfidenceCount, icon: <CheckCircle2 size={14} /> },
          { label: "Categories", value: categories.length, icon: <Layers size={14} /> },
          { label: "Avg Confidence", value: `${(avgConfidence * 100).toFixed(0)}%`, icon: <BarChart3 size={14} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card-minimal p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
            <p className="text-2xl font-light text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 text-sm" placeholder="Search requests or categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="bg-secondary border border-border text-foreground text-xs rounded-md px-3 py-2" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => contextsQuery.refetch()}>
          <Loader2 size={10} className={contextsQuery.isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="card-minimal p-12 text-center">
          <Brain size={28} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium text-muted-foreground mb-2">No Context History Yet</p>
          <p className="text-muted-foreground text-sm mb-4">Use the Intent Engine to submit a request.</p>
          <Button onClick={() => window.location.href = "/intent-engine"} className="gap-2"><Zap size={14} /> Open Intent Engine</Button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3 pl-14">
            {filtered.map(ctx => {
              const isExpanded = expandedId === ctx.id;
              const inferredCats = (ctx.inferredCategories as string[] | null) ?? [];
              const enrichedParams = ctx.suggestedParameters as Record<string, unknown> | null;
              const liveState = ctx.liveState as Record<string, unknown> | null;
              const confidence = ctx.status === "ready" ? 0.9 : ctx.status === "contextualizing" ? 0.6 : ctx.status === "gathering" ? 0.4 : 0.2;

              return (
                <div key={ctx.id} className="relative">
                  <div className={`absolute -left-[38px] top-5 w-2.5 h-2.5 rounded-full ${confidence >= 0.8 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400"}`} />
                  <div className="card-minimal p-4 transition-all">
                    <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(prev => prev === ctx.id ? null : ctx.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-muted-foreground text-xs font-mono">#{ctx.id}</span>
                          <Clock size={10} className="text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">{new Date(ctx.createdAt).toLocaleString()}</span>
                          {inferredCats.map(cat => (
                            <span key={cat} className="text-[10px] text-muted-foreground border border-border px-1.5 py-0 rounded">{cat.replace("_", " ")}</span>
                          ))}
                        </div>
                        <p className="text-foreground text-sm truncate">{ctx.requestText ?? "No request recorded"}</p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span className={`font-medium ${CONFIDENCE_COLOR(confidence)}`}>{(confidence * 100).toFixed(0)}% confidence</span>
                          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {ctx.status ?? "pending"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${confidence >= 0.8 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${confidence * 100}%` }} />
                        </div>
                        {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 space-y-4 border-t border-border pt-4">
                        {/* Step 1: Interpret */}
                        <div className="p-4 rounded-md border border-blue-500/20 bg-blue-500/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain size={14} className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-300">Step 1 — Interpret</span>
                            <ArrowRight size={10} className="text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">LLM analyzes raw request → infers categories</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Raw Request</p>
                              <p className="text-sm text-foreground bg-background rounded-md p-2 border border-border">{ctx.requestText ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Inferred Categories</p>
                              <div className="flex flex-wrap gap-1">
                                {inferredCats.length > 0 ? inferredCats.map(cat => (
                                  <span key={cat} className="text-xs text-blue-300 border border-blue-500/30 px-1.5 py-0 rounded">{cat.replace("_", " ")}</span>
                                )) : <span className="text-muted-foreground text-xs">None inferred</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Gather */}
                        <div className="p-4 rounded-md border border-amber-500/20 bg-amber-500/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Database size={14} className="text-amber-400" />
                            <span className="text-sm font-medium text-amber-300">Step 2 — Gather</span>
                            <ArrowRight size={10} className="text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">Pulls live state from connected tools</span>
                          </div>
                          {liveState && Object.keys(liveState).length > 0 ? (
                            <div className="space-y-1.5">
                              {Object.entries(liveState).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 p-2 rounded bg-background border border-border">
                                  <span className="text-amber-400 text-xs font-mono shrink-0">{key}</span>
                                  <pre className="text-foreground text-xs font-mono overflow-x-auto whitespace-pre-wrap flex-1">{typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</pre>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-muted-foreground text-xs italic">No live state gathered — connect tools in Integration Hub.</p>}
                        </div>

                        {/* Step 3: Contextualize */}
                        <div className="p-4 rounded-md border border-emerald-500/20 bg-emerald-500/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Layers size={14} className="text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-300">Step 3 — Contextualize</span>
                            <ArrowRight size={10} className="text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">Enriches parameters with real data</span>
                          </div>
                          {enrichedParams && Object.keys(enrichedParams).length > 0 ? (
                            <div className="space-y-1.5">
                              {Object.entries(enrichedParams).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 p-2 rounded bg-background border border-border">
                                  <span className="text-emerald-400 text-xs font-mono shrink-0">{key}</span>
                                  <pre className="text-foreground text-xs font-mono overflow-x-auto whitespace-pre-wrap flex-1">{typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</pre>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-muted-foreground text-xs italic">No enriched parameters yet — run contextualize from the Intent Engine.</p>}
                          <div className="mt-4 flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Confidence</span>
                                <span className={`text-sm font-medium ${CONFIDENCE_COLOR(confidence)}`}>{(confidence * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full rounded-full ${confidence >= 0.8 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${confidence * 100}%` }} />
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded border ${confidence >= 0.8 ? "border-emerald-500/30 text-emerald-400" : confidence >= 0.5 ? "border-amber-500/30 text-amber-400" : "border-red-500/30 text-red-400"}`}>
                              {confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low"}
                            </span>
                          </div>
                        </div>

                        {/* Before / After */}
                        <div className="card-minimal p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 size={14} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">Before vs After Self-Contextualization</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-red-400 mb-2">Cold Start (Without Context)</p>
                              <div className="p-3 rounded-md bg-background border border-red-500/20">
                                <p className="text-muted-foreground text-xs italic">"{ctx.requestText}"</p>
                                <p className="text-muted-foreground text-xs mt-2">→ Generic questions, no business awareness</p>
                                <p className="text-muted-foreground text-xs">→ 3-5 clarifying questions needed</p>
                                <p className="text-muted-foreground text-xs">→ No data pre-filled</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-400 mb-2">Self-Contextualized</p>
                              <div className="p-3 rounded-md bg-background border border-emerald-500/20">
                                <p className="text-muted-foreground text-xs italic">"{ctx.requestText}"</p>
                                <p className="text-emerald-400 text-xs mt-2">→ Context-aware questions with your data</p>
                                <p className="text-emerald-400 text-xs">→ {inferredCats.length} categories pre-loaded</p>
                                <p className="text-emerald-400 text-xs">→ {(confidence * 100).toFixed(0)}% confidence pre-filled</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
