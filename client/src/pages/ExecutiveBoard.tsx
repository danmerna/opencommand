import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Send, Brain, Users, MessageSquare, Zap, RotateCcw,
  ChevronRight, AlertTriangle, TrendingUp, Info, Loader2,
  CheckCircle2, XCircle, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import type {
  DataSourceCard,
  CrossSourceInsight,
  SocraticQuestion,
  SocraticEngineResponse,
} from "@shared/types";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = "board" | "executive" | "direct";
type ExecType = "ceo" | "cmo" | "cto" | "cfo";
type ChatMessage = { role: "user" | "assistant"; content: string };

interface ExecutiveResponse {
  type: string;
  name: string;
  title: string;
  observation: string;
  question: string;
  rationale: string;
  estimatedImpact: string;
}

interface BoardResult {
  socratic: SocraticEngineResponse;
  executives: ExecutiveResponse[];
  contextId: number;
}

// ─── Executive Metadata ─────────────────────────────────────────────────────

const EXEC_META: Record<ExecType, { name: string; label: string; color: string; bgColor: string; borderColor: string }> = {
  ceo: { name: "ARCH", label: "CEO", color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/30" },
  cmo: { name: "NOVA", label: "CMO", color: "text-purple-400", bgColor: "bg-purple-500/15", borderColor: "border-purple-500/30" },
  cto: { name: "SAGE", label: "CTO", color: "text-cyan-400", bgColor: "bg-cyan-500/15", borderColor: "border-cyan-500/30" },
  cfo: { name: "TED", label: "CFO", color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/30" },
};

const SOURCE_COLORS: Record<string, string> = {
  hubspot_crm: "bg-orange-400",
  salesforce_crm: "bg-blue-400",
  meta_ads: "bg-blue-500",
  google_ads: "bg-green-400",
  google_analytics: "bg-amber-400",
  tiktok_ads: "bg-pink-400",
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  opportunity: TrendingUp,
};

const SEVERITY_COLORS = {
  info: "border-blue-500/40 text-blue-400",
  warning: "border-amber-500/40 text-amber-400",
  opportunity: "border-emerald-500/40 text-emerald-400",
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

function DataSourceGrid({ cards }: { cards: DataSourceCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Live Data Sources</p>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card, i) => (
          <div key={i} className="rounded-lg border border-border bg-black/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${SOURCE_COLORS[card.sourceId] ?? card.sourceColor ?? "bg-gray-400"}`} />
              <span className="text-[11px] font-semibold text-foreground">{card.sourceName}</span>
            </div>
            <div className="space-y-0.5">
              {card.metrics.map((m, j) => (
                <div key={j} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono leading-tight">{m.label}</span>
                  <span className="text-[10px] text-foreground font-mono font-medium leading-tight whitespace-nowrap">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsList({ insights }: { insights: CrossSourceInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Cross-Source Insights</p>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = SEVERITY_ICONS[insight.severity];
          const colorClass = SEVERITY_COLORS[insight.severity];
          return (
            <div key={i} className={`border-l-2 ${colorClass} pl-4 py-1.5 flex items-start gap-2`}>
              <Icon size={12} className="shrink-0 mt-0.5 opacity-70" />
              <p className="text-[12px] text-foreground/80 leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onExecute,
  onSkip,
  isExecuting,
  executionResult,
}: {
  question: SocraticQuestion;
  index: number;
  onExecute: () => void;
  onSkip: () => void;
  isExecuting: boolean;
  executionResult: { success: boolean; taskCount?: number } | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-black/20 p-4">
      <div className="flex gap-3">
        <span className="text-emerald-400 text-[13px] font-bold font-mono shrink-0 mt-0.5">{index + 1}.</span>
        <div className="flex-1">
          <p className="text-[13px] text-foreground leading-relaxed mb-2">{question.question}</p>
          <p className="text-[10px] text-muted-foreground mb-1">
            <span className="font-medium">Rationale:</span> {question.rationale}
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            <span className="font-medium">Est. Impact:</span> {question.estimatedImpact}
          </p>

          {executionResult ? (
            <div className={`flex items-center gap-2 text-[11px] ${executionResult.success ? "text-emerald-400" : "text-red-400"}`}>
              {executionResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {executionResult.success
                ? `Approved — ${executionResult.taskCount} tasks created and routed`
                : "Execution failed — try again"}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onExecute}
                disabled={isExecuting}
                className="h-7 px-3 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isExecuting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                Execute
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSkip}
                disabled={isExecuting}
                className="h-7 px-3 text-[11px] bg-transparent"
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutiveCard({ exec, onExecute, isExecuting, executionResult }: {
  exec: ExecutiveResponse;
  onExecute: () => void;
  isExecuting: boolean;
  executionResult: { success: boolean; taskCount?: number } | null;
}) {
  const meta = EXEC_META[exec.type as ExecType];
  if (!meta) return null;

  return (
    <div className={`rounded-lg border ${meta.borderColor} ${meta.bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-full bg-black/30 flex items-center justify-center`}>
          <span className={`text-[10px] font-bold ${meta.color}`}>{meta.name[0]}</span>
        </div>
        <div>
          <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">· {meta.label}</span>
        </div>
      </div>

      <p className="text-[12px] text-foreground/90 leading-relaxed mb-3">{exec.observation}</p>

      <div className="rounded-md border border-border/50 bg-black/20 p-3 mb-3">
        <p className="text-[12px] text-foreground font-medium leading-relaxed mb-1">{exec.question}</p>
        <p className="text-[10px] text-muted-foreground">{exec.rationale}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          <span className="font-medium">Impact:</span> {exec.estimatedImpact}
        </p>
      </div>

      {executionResult ? (
        <div className={`flex items-center gap-2 text-[11px] ${executionResult.success ? "text-emerald-400" : "text-red-400"}`}>
          {executionResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {executionResult.success
            ? `${executionResult.taskCount} tasks created`
            : "Failed — retry"}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onExecute}
            disabled={isExecuting}
            className="h-7 px-3 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isExecuting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
            Execute
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ExecutiveBoard() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("board");

  // Board tab state
  const [boardInput, setBoardInput] = useState("");
  const [boardResult, setBoardResult] = useState<BoardResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; taskCount?: number }>>({});
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Individual executive tab state
  const [selectedExec, setSelectedExec] = useState<ExecType>("ceo");
  const [execMessages, setExecMessages] = useState<Record<ExecType, ChatMessage[]>>({
    ceo: [{ role: "assistant", content: "**ARCH online.** I'm your AI CEO. I think in terms of overall strategy, revenue growth, and cross-functional alignment. What strategic challenge should we tackle?" }],
    cmo: [{ role: "assistant", content: "**NOVA online.** I'm your AI CMO. I focus on demand generation, brand positioning, and campaign optimization. What marketing challenge can I help with?" }],
    cto: [{ role: "assistant", content: "**SAGE online.** I'm your AI CTO. I analyze engineering velocity, system reliability, and technical debt. What technical challenge should we address?" }],
    cfo: [{ role: "assistant", content: "**TED online.** I'm your AI CFO. I focus on unit economics, cash flow, and financial modeling. What financial question should we analyze?" }],
  });
  const [execInput, setExecInput] = useState("");
  const [isExecThinking, setIsExecThinking] = useState(false);

  // Direct LLM tab state
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Direct AI access — no executive persona. Ask me anything about your business, data, strategy, or operations." },
  ]);
  const [directInput, setDirectInput] = useState("");
  const [isDirectThinking, setIsDirectThinking] = useState(false);

  // Decision log
  const decisionLogQ = trpc.aiCeo.decisionLog.useQuery(undefined, { enabled: isAuthenticated && tab === "board" });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const directEndRef = useRef<HTMLDivElement>(null);

  // Mutations
  const boardQueryM = trpc.aiCeo.boardQuery.useMutation();
  const executiveChatM = trpc.aiCeo.executiveChat.useMutation();
  const directChatM = trpc.aiCeo.directChat.useMutation();
  const executeQuestionM = trpc.aiCeo.executeQuestion.useMutation();

  // Auto-scroll for chat tabs
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [execMessages[selectedExec]]);

  useEffect(() => {
    directEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [directMessages]);

  // ─── Board Tab Handlers ─────────────────────────────────────────────────

  const handleBoardQuery = async () => {
    if (!boardInput.trim() || isQuerying) return;
    setIsQuerying(true);
    setBoardResult(null);
    setExecutionResults({});
    setExecutingIds(new Set());
    setSkippedIds(new Set());
    try {
      const result = await boardQueryM.mutateAsync({ requestText: boardInput.trim() });
      setBoardResult(result as BoardResult);
    } catch {
      toast.error("Board query failed. Please try again.");
    } finally {
      setIsQuerying(false);
    }
  };

  const handleExecuteQuestion = async (questionId: string, question: string, rationale: string, estimatedImpact: string, executiveType?: string) => {
    setExecutingIds(prev => new Set(prev).add(questionId));
    try {
      const result = await executeQuestionM.mutateAsync({
        questionId,
        question,
        rationale,
        estimatedImpact,
        executiveType,
      });
      setExecutionResults(prev => ({
        ...prev,
        [questionId]: { success: true, taskCount: result.totalTasks },
      }));
      toast.success(`${result.totalTasks} tasks created: ${result.strategyTitle}`);
    } catch {
      setExecutionResults(prev => ({
        ...prev,
        [questionId]: { success: false },
      }));
      toast.error("Execution failed. Please try again.");
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const handleSkipQuestion = (questionId: string) => {
    setSkippedIds(prev => new Set(prev).add(questionId));
  };

  // ─── Executive Chat Handlers ────────────────────────────────────────────

  const handleExecSend = async () => {
    if (!execInput.trim() || isExecThinking) return;
    const userMsg: ChatMessage = { role: "user", content: execInput.trim() };
    const currentMessages = execMessages[selectedExec];
    const newMessages = [...currentMessages, userMsg];
    setExecMessages(prev => ({ ...prev, [selectedExec]: newMessages }));
    setExecInput("");
    setIsExecThinking(true);
    try {
      const result = await executiveChatM.mutateAsync({
        executiveType: selectedExec,
        userInput: userMsg.content,
        conversationHistory: currentMessages.slice(-8),
        contextSummary: boardResult?.socratic.contextSummary,
      });
      setExecMessages(prev => ({
        ...prev,
        [selectedExec]: [...newMessages, { role: "assistant" as const, content: result.response }],
      }));
    } catch {
      toast.error(`${EXEC_META[selectedExec].name} is unavailable. Try again.`);
      setIsExecThinking(false);
    } finally {
      setIsExecThinking(false);
    }
  };

  // ─── Direct Chat Handlers ──────────────────────────────────────────────

  const handleDirectSend = async () => {
    if (!directInput.trim() || isDirectThinking) return;
    const userMsg: ChatMessage = { role: "user", content: directInput.trim() };
    const newMessages = [...directMessages, userMsg];
    setDirectMessages(newMessages);
    setDirectInput("");
    setIsDirectThinking(true);
    try {
      const result = await directChatM.mutateAsync({
        userInput: userMsg.content,
        conversationHistory: directMessages.slice(-8),
      });
      setDirectMessages([...newMessages, { role: "assistant", content: result.response }]);
    } catch {
      toast.error("AI is unavailable. Try again.");
    } finally {
      setIsDirectThinking(false);
    }
  };

  // ─── Visible questions (not skipped) ──────────────────────────────────

  const visibleQuestions = useMemo(() => {
    if (!boardResult) return [];
    return boardResult.socratic.questions.filter(q => !skippedIds.has(q.id));
  }, [boardResult, skippedIds]);

  // ─── Tab definitions ──────────────────────────────────────────────────

  const tabs = [
    { id: "board" as Tab, label: "Executive Board", icon: Users },
    { id: "executive" as Tab, label: "1:1 Executive", icon: Brain },
    { id: "direct" as Tab, label: "Direct LLM", icon: MessageSquare },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">OpenCommand</p>
        <h1 className="text-3xl font-light text-foreground tracking-tight">Executive Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-executive Socratic intelligence · Live data · Strategic execution</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BOARD TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "board" && (
        <div>
          {/* Query input */}
          <div className="card-minimal mb-6">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Strategic Query</p>
            <div className="flex gap-3">
              <Textarea
                value={boardInput}
                onChange={e => setBoardInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBoardQuery(); } }}
                placeholder="e.g. How do we close more deals this quarter? · Why is our CAC increasing? · Are we on track for profitability?"
                className="flex-1 bg-zinc-900 border-border text-foreground text-sm resize-none rounded-lg"
                rows={2}
              />
              <Button
                onClick={handleBoardQuery}
                disabled={!boardInput.trim() || isQuerying}
                className="self-end px-6 gap-2"
              >
                {isQuerying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isQuerying ? "Querying..." : "Ask Board"}
              </Button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {["Close more deals this quarter", "Why is our CAC increasing?", "Are we on track for profitability?", "Build an outbound campaign for Q2"].map(s => (
                <button
                  key={s}
                  onClick={() => setBoardInput(s)}
                  className="text-[10px] border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground px-2.5 py-1 rounded-md transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isQuerying && (
            <div className="card-minimal flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Pulling live data from connected sources...</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">4 executives analyzing simultaneously</p>
              </div>
            </div>
          )}

          {/* Board results */}
          {boardResult && !isQuerying && (
            <div className="space-y-6">
              {/* Header badge */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-medium">
                  {boardResult.socratic.sourceCount} sources · {boardResult.socratic.queryTimeMs}ms
                </span>
                <span className="text-sm font-semibold text-foreground">{boardResult.socratic.title}</span>
              </div>

              {/* Data source cards */}
              <DataSourceGrid cards={boardResult.socratic.dataCards} />

              {/* Cross-source insights */}
              <InsightsList insights={boardResult.socratic.insights} />

              {/* Socratic questions from context engine */}
              {visibleQuestions.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Strategic Questions</p>
                  <div className="space-y-2.5">
                    {visibleQuestions.map((q, i) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={i}
                        onExecute={() => handleExecuteQuestion(q.id, q.question, q.rationale, q.estimatedImpact)}
                        onSkip={() => handleSkipQuestion(q.id)}
                        isExecuting={executingIds.has(q.id)}
                        executionResult={executionResults[q.id] ?? null}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Executive perspectives */}
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Executive Perspectives</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {boardResult.executives.map((exec) => {
                    const execId = `exec-${exec.type}`;
                    return (
                      <ExecutiveCard
                        key={exec.type}
                        exec={exec}
                        onExecute={() => handleExecuteQuestion(execId, exec.question, exec.rationale, exec.estimatedImpact, exec.type)}
                        isExecuting={executingIds.has(execId)}
                        executionResult={executionResults[execId] ?? null}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!boardResult && !isQuerying && (
            <div className="card-minimal flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <Users size={32} className="text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium text-foreground mb-2">Executive Board</h3>
                <p className="text-sm text-muted-foreground">
                  Ask a strategic question and all four executives will analyze your live business data simultaneously.
                  Each executive brings their domain expertise — CEO, CMO, CTO, and CFO.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* INDIVIDUAL EXECUTIVE TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "executive" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Executive selector */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Select Executive</p>
            {(Object.keys(EXEC_META) as ExecType[]).map((key) => {
              const meta = EXEC_META[key];
              const isActive = key === selectedExec;
              const msgCount = execMessages[key].length;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedExec(key)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition-all ${
                    isActive
                      ? `${meta.borderColor} ${meta.bgColor}`
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-black/30 flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${meta.color}`}>{meta.name[0]}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12px] font-semibold ${isActive ? meta.color : "text-foreground"}`}>{meta.name}</span>
                      <span className="text-[10px] text-muted-foreground">· {meta.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Online · {msgCount} messages
                    </div>
                  </div>
                  {isActive && <ChevronRight size={12} className="text-muted-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Chat area */}
          <div className="lg:col-span-3">
            <div className="card-minimal flex flex-col" style={{ minHeight: "560px" }}>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${EXEC_META[selectedExec].bgColor} flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].name[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {EXEC_META[selectedExec].name} — AI {EXEC_META[selectedExec].label}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Online · 1:1 mode
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const meta = EXEC_META[selectedExec];
                    setExecMessages(prev => ({
                      ...prev,
                      [selectedExec]: [{ role: "assistant" as const, content: `**${meta.name} reset.** Ready for new directives.` }],
                    }));
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
                {execMessages[selectedExec].map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className={`w-6 h-6 rounded-full ${EXEC_META[selectedExec].bgColor} flex items-center justify-center mr-2 flex-shrink-0 mt-1`}>
                        <span className={`text-[10px] font-semibold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].name[0]}</span>
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-zinc-800 border border-zinc-700" : "bg-card border border-border"}`}>
                      {msg.role === "assistant" ? (
                        <div className="text-sm text-foreground leading-relaxed"><Streamdown>{msg.content}</Streamdown></div>
                      ) : (
                        <p className="text-sm text-foreground">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isExecThinking && (
                  <div className="flex justify-start items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${EXEC_META[selectedExec].bgColor} flex items-center justify-center`}>
                      <span className={`text-[10px] font-semibold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].name[0]}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      <span className="text-[10px] text-muted-foreground">{EXEC_META[selectedExec].name} thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={execInput}
                    onChange={e => setExecInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleExecSend(); } }}
                    placeholder={`Talk to ${EXEC_META[selectedExec].name}...`}
                    className="flex-1 bg-zinc-900 border-border text-foreground text-sm resize-none rounded-lg"
                    rows={2}
                  />
                  <Button onClick={handleExecSend} disabled={!execInput.trim() || isExecThinking} size="sm" className="self-end px-4">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIRECT LLM TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "direct" && (
        <div className="max-w-3xl mx-auto">
          <div className="card-minimal flex flex-col" style={{ minHeight: "560px" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <MessageSquare size={14} className="text-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Direct AI</div>
                  <div className="text-[10px] text-muted-foreground">No persona · Raw LLM access</div>
                </div>
              </div>
              <button
                onClick={() => setDirectMessages([{ role: "assistant", content: "Session reset. Ask me anything." }])}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-zinc-800"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
              {directMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <MessageSquare size={10} className="text-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-zinc-800 border border-zinc-700" : "bg-card border border-border"}`}>
                    {msg.role === "assistant" ? (
                      <div className="text-sm text-foreground leading-relaxed"><Streamdown>{msg.content}</Streamdown></div>
                    ) : (
                      <p className="text-sm text-foreground">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isDirectThinking && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <MessageSquare size={10} className="text-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    <span className="text-[10px] text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={directEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-3">
                <Textarea
                  value={directInput}
                  onChange={e => setDirectInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDirectSend(); } }}
                  placeholder="Ask anything..."
                  className="flex-1 bg-zinc-900 border-border text-foreground text-sm resize-none rounded-lg"
                  rows={2}
                />
                <Button onClick={handleDirectSend} disabled={!directInput.trim() || isDirectThinking} size="sm" className="self-end px-4">
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
