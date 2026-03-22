import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain, ChevronDown, ChevronRight, Clock, Filter, Search, Zap,
  ArrowRight, CheckCircle2, AlertTriangle, Loader2, History,
  BarChart3, Layers, Database,
} from "lucide-react";
import { getLoginUrl as getLogin } from "@/const";

const CONFIDENCE_COLOR = (score: number) => {
  if (score >= 0.8) return "text-green-400";
  if (score >= 0.5) return "text-yellow-400";
  return "text-red-400";
};

const CONFIDENCE_BG = (score: number) => {
  if (score >= 0.8) return "bg-green-900/20 border-green-800";
  if (score >= 0.5) return "bg-yellow-900/20 border-yellow-800";
  return "bg-red-900/20 border-red-800";
};

const STEP_ICONS = {
  interpret: <Brain className="w-4 h-4 text-blue-400" />,
  gather: <Database className="w-4 h-4 text-yellow-400" />,
  contextualize: <Layers className="w-4 h-4 text-green-400" />,
};

export default function ContextHistory() {
  const { user, isAuthenticated } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const contextsQuery = trpc.context.list.useQuery(undefined, { enabled: isAuthenticated });
  const contexts = contextsQuery.data ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const ctx of contexts) {
      const inferred = (ctx.inferredCategories as string[] | null) ?? [];
      inferred.forEach(c => cats.add(c));
    }
    return Array.from(cats).sort();
  }, [contexts]);

  const filtered = useMemo(() => {
    return contexts.filter(ctx => {
      const matchesSearch = !searchQuery ||
        ctx.requestText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ctx.inferredCategories as string[] | null)?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === "all" ||
        (ctx.inferredCategories as string[] | null)?.includes(filterCategory);
      return matchesSearch && matchesCategory;
    });
  }, [contexts, searchQuery, filterCategory]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <History className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-4">CONTEXT HISTORY</h1>
          <p className="text-zinc-400 mb-6">View your full Interpret → Gather → Contextualize chain history</p>
          <a href={getLoginUrl()}>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase">Sign In to View History</Button>
          </a>
        </div>
      </div>
    );
  }

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Summary stats
  const highConfidenceCount = contexts.filter(c => c.status === "ready").length;
  const avgConfidence = contexts.length > 0 ? highConfidenceCount / contexts.length : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-black uppercase tracking-tight">CONTEXT HISTORY</h1>
            </div>
            <p className="text-zinc-400 text-sm">
              Full Interpret → Gather → Contextualize chain — how the engine learned your business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 px-3 py-1">
              {contexts.length} Contexts
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 px-3 py-1">
              {(avgConfidence * 100).toFixed(0)}% Avg Confidence
            </Badge>
          </div>
        </div>
        <div className="h-[2px] bg-red-600 mt-4" />
      </div>

      <div className="px-6 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Contexts", value: contexts.length, icon: <History className="w-5 h-5 text-red-500" /> },
            { label: "High Confidence", value: highConfidenceCount, icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            { label: "Categories Covered", value: categories.length, icon: <Layers className="w-5 h-5 text-blue-500" /> },
            { label: "Ready", value: highConfidenceCount, icon: <BarChart3 className="w-5 h-5 text-yellow-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label} className="bg-zinc-950 border border-zinc-800">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="text-zinc-500 text-xs uppercase font-bold">{label}</p>
                    <p className="text-white text-2xl font-black">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              className="bg-zinc-900 border-zinc-800 text-white pl-9 text-sm"
              placeholder="Search requests or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded px-3 py-2 uppercase font-bold"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.replace("_", " ").toUpperCase()}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-400 text-xs"
            onClick={() => contextsQuery.refetch()}
          >
            <Loader2 className={`w-3 h-3 mr-1 ${contextsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Context Timeline */}
        {filtered.length === 0 ? (
          <Card className="bg-zinc-950 border border-zinc-800">
            <CardContent className="py-16 text-center">
              <Brain className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-black text-white uppercase mb-2">No Context History Yet</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Use the Socratic Intent Engine to submit a request. The engine will run the full
                Interpret → Gather → Contextualize pipeline and record it here.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase"
                onClick={() => window.location.href = "/intent-engine"}
              >
                <Zap className="w-4 h-4 mr-2" /> Open Intent Engine
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-zinc-800" />

            <div className="space-y-4 pl-16">
              {filtered.map((ctx, idx) => {
                const isExpanded = expandedId === ctx.id;
                const inferredCats = (ctx.inferredCategories as string[] | null) ?? [];
                const enrichedParams = ctx.suggestedParameters as Record<string, unknown> | null;
                const liveState = ctx.liveState as Record<string, unknown> | null;
                const confidence = ctx.status === "ready" ? 0.9 : ctx.status === "contextualizing" ? 0.6 : ctx.status === "gathering" ? 0.4 : 0.2;

                return (
                  <div key={ctx.id} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[46px] top-5 w-4 h-4 rounded-full border-2 ${confidence >= 0.8 ? "bg-green-600 border-green-400" : confidence >= 0.5 ? "bg-yellow-600 border-yellow-400" : "bg-red-600 border-red-400"}`} />

                    <Card className={`bg-zinc-950 border ${CONFIDENCE_BG(confidence)} transition-all`}>
                      {/* Summary Row */}
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(ctx.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-zinc-500 text-xs font-mono">#{ctx.id}</span>
                              <Clock className="w-3 h-3 text-zinc-600" />
                              <span className="text-zinc-500 text-xs">{new Date(ctx.createdAt).toLocaleString()}</span>
                              {inferredCats.map(cat => (
                                <Badge key={cat} variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase px-1.5">{cat.replace("_", " ")}</Badge>
                              ))}
                            </div>
                            <p className="text-white text-sm font-medium truncate">{ctx.requestText ?? "No request recorded"}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                              <span className={`font-bold ${CONFIDENCE_COLOR(confidence)}`}>
                                {(confidence * 100).toFixed(0)}% confidence
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {ctx.status?.toUpperCase() ?? "PENDING"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Confidence bar */}
                            <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${confidence >= 0.8 ? "bg-green-500" : confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${confidence * 100}%` }}
                              />
                            </div>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                          </div>
                        </div>

                        {/* Expanded Chain Detail */}
                        {isExpanded && (
                          <div className="mt-6 space-y-4 border-t border-zinc-800 pt-4">
                            {/* Step 1: Interpret */}
                            <div className="p-4 rounded border border-blue-900/40 bg-blue-900/10">
                              <div className="flex items-center gap-2 mb-3">
                                {STEP_ICONS.interpret}
                                <h4 className="font-black text-blue-300 text-sm uppercase tracking-tight">Step 1 — Interpret</h4>
                                <ArrowRight className="w-3 h-3 text-zinc-600" />
                                <span className="text-zinc-500 text-xs">LLM analyzes raw request → infers categories</span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Raw Request</p>
                                  <p className="text-white text-sm bg-zinc-950 rounded p-2 border border-zinc-800">{ctx.requestText ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Inferred Categories</p>
                                  <div className="flex flex-wrap gap-1">
                                    {inferredCats.length > 0 ? inferredCats.map(cat => (
                                      <Badge key={cat} className="bg-blue-900/30 text-blue-300 border-blue-800 text-xs uppercase">{cat.replace("_", " ")}</Badge>
                                    )) : <span className="text-zinc-600 text-xs">None inferred</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Step 2: Gather */}
                            <div className="p-4 rounded border border-yellow-900/40 bg-yellow-900/10">
                              <div className="flex items-center gap-2 mb-3">
                                {STEP_ICONS.gather}
                                <h4 className="font-black text-yellow-300 text-sm uppercase tracking-tight">Step 2 — Gather</h4>
                                <ArrowRight className="w-3 h-3 text-zinc-600" />
                                <span className="text-zinc-500 text-xs">Pulls live state from connected tools</span>
                              </div>
                              {liveState && Object.keys(liveState).length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(liveState).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3 p-2 rounded bg-zinc-950 border border-zinc-800">
                                      <span className="text-yellow-400 text-xs font-mono font-bold uppercase shrink-0">{key}</span>
                                      <pre className="text-zinc-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap flex-1">
                                        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-zinc-600 text-xs italic">No live state gathered — connect tools in Integration Hub to enable this step</p>
                              )}
                            </div>

                            {/* Step 3: Contextualize */}
                            <div className="p-4 rounded border border-green-900/40 bg-green-900/10">
                              <div className="flex items-center gap-2 mb-3">
                                {STEP_ICONS.contextualize}
                                <h4 className="font-black text-green-300 text-sm uppercase tracking-tight">Step 3 — Contextualize</h4>
                                <ArrowRight className="w-3 h-3 text-zinc-600" />
                                <span className="text-zinc-500 text-xs">Enriches parameters with real data</span>
                              </div>
                              {enrichedParams && Object.keys(enrichedParams).length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(enrichedParams).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3 p-2 rounded bg-zinc-950 border border-zinc-800">
                                      <span className="text-green-400 text-xs font-mono font-bold uppercase shrink-0">{key}</span>
                                      <pre className="text-zinc-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap flex-1">
                                        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-zinc-600 text-xs italic">No enriched parameters yet — run contextualize from the Intent Engine</p>
                              )}

                              {/* Confidence Score */}
                              <div className="mt-4 flex items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-zinc-500 text-xs uppercase font-bold">Confidence Score</span>
                                    <span className={`text-sm font-black ${CONFIDENCE_COLOR(confidence)}`}>{(confidence * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${confidence >= 0.8 ? "bg-green-500" : confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"}`}
                                      style={{ width: `${confidence * 100}%` }}
                                    />
                                  </div>
                                </div>
                                <Badge className={`${confidence >= 0.8 ? "bg-green-900/30 text-green-400 border-green-800" : confidence >= 0.5 ? "bg-yellow-900/30 text-yellow-400 border-yellow-800" : "bg-red-900/30 text-red-400 border-red-800"} text-xs uppercase`}>
                                  {confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low"}
                                </Badge>
                              </div>
                            </div>

                            {/* Before / After Comparison */}
                            <div className="p-4 rounded border border-zinc-800 bg-zinc-900/30">
                              <h4 className="font-black text-white text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-red-500" />
                                Before vs After Self-Contextualization
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-red-400 text-xs uppercase font-bold mb-2">Cold Start (Without Context)</p>
                                  <div className="p-3 rounded bg-zinc-950 border border-red-900/40">
                                    <p className="text-zinc-400 text-xs italic">"{ctx.requestText}"</p>
                                    <p className="text-zinc-600 text-xs mt-2">→ Generic Socratic questions with no business awareness</p>
                                    <p className="text-zinc-600 text-xs">→ 3-5 clarifying questions needed</p>
                                    <p className="text-zinc-600 text-xs">→ No data pre-filled</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-green-400 text-xs uppercase font-bold mb-2">Self-Contextualized</p>
                                  <div className="p-3 rounded bg-zinc-950 border border-green-900/40">
                                    <p className="text-zinc-400 text-xs italic">"{ctx.requestText}"</p>
                                    <p className="text-green-400 text-xs mt-2">→ Context-aware questions referencing your actual data</p>
                                    <p className="text-green-400 text-xs">→ {inferredCats.length} categories pre-loaded</p>
                                    <p className="text-green-400 text-xs">→ {(confidence * 100).toFixed(0)}% confidence pre-filled</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
