import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Send, Brain, Users, MessageSquare, Zap, RotateCcw,
  ChevronRight, AlertTriangle, TrendingUp, Info, Loader2,
  CheckCircle2, XCircle, History, Target,
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
type ExecType = "ceo" | "cfo" | "cmo" | "cto" | "sigma";
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

// ─── Executive Metadata (5-4-3-2-1-Σ Temporal Cascade) ─────────────────────

const EXEC_META: Record<ExecType, {
  name: string;
  label: string;
  timeHorizon: string;
  focus: string;
  color: string;
  bgColor: string;
  borderColor: string;
  number: string;
}> = {
  ceo: {
    name: "ARCH",
    label: "CEO",
    timeHorizon: "5 Years",
    focus: "Vision & Market Position",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    number: "5",
  },
  cfo: {
    name: "LEDGER",
    label: "CFO",
    timeHorizon: "4 Months",
    focus: "Quarterly Feasibility",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    number: "4",
  },
  cmo: {
    name: "SIGNAL",
    label: "CMO",
    timeHorizon: "3 Weeks",
    focus: "Market Timing",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    number: "3",
  },
  cto: {
    name: "FORGE",
    label: "CTO",
    timeHorizon: "2 Days",
    focus: "Sprint Execution",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
    number: "2",
  },
  sigma: {
    name: "Σ",
    label: "Synthesis",
    timeHorizon: "NOW",
    focus: "Highest-Leverage Move",
    color: "text-cyan-300",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-400/40",
    number: "Σ",
  },
};

const CASCADE_ORDER: ExecType[] = ["ceo", "cfo", "cmo", "cto", "sigma"];

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
        <span className="text-cyan-300 text-[13px] font-bold font-mono shrink-0 mt-0.5">{index + 1}.</span>
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
                className="h-7 px-3 text-[11px] gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
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
        <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
          <span className={`text-[11px] font-bold ${meta.color}`}>{meta.number}</span>
        </div>
        <div>
          <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">· {meta.label} · {meta.timeHorizon}</span>
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
            className="h-7 px-3 text-[11px] gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isExecuting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
            Execute
          </Button>
        </div>
      )}
    </div>
  );
}

/** Σ Synthesis Card — the final card in the cascade, visually distinct */
function SigmaCard({ sigma }: { sigma: any }) {
  if (!sigma) return null;
  return (
    <div className="rounded-xl border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 via-black/40 to-cyan-500/5 p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
          <span className="text-lg font-bold text-cyan-300">Σ</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-cyan-300">Σ — Highest-Leverage Move</div>
          <div className="text-[10px] text-muted-foreground">Synthesized from all 4 executive perspectives</div>
        </div>
        {sigma.confidence && (
          <div className="ml-auto">
            <div className={`text-[11px] font-mono px-2.5 py-1 rounded-full ${
              sigma.confidence >= 80 ? "bg-emerald-500/15 text-emerald-400" :
              sigma.confidence >= 60 ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            }`}>
              {sigma.confidence}% confidence
            </div>
          </div>
        )}
      </div>

      {/* The ONE action */}
      {sigma.highestLeverageAction && (
        <div className="rounded-lg border border-cyan-400/30 bg-black/30 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-cyan-300" />
            <span className="text-[10px] text-cyan-300 font-mono uppercase tracking-wider">Do This Now</span>
          </div>
          <p className="text-[14px] text-foreground font-medium leading-relaxed">{sigma.highestLeverageAction}</p>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {sigma.expectedImpact && (
          <div className="rounded-md border border-border/50 bg-black/20 p-3">
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Expected Impact</p>
            <p className="text-[12px] text-foreground leading-relaxed">{sigma.expectedImpact}</p>
          </div>
        )}
        {sigma.timeToExecute && (
          <div className="rounded-md border border-border/50 bg-black/20 p-3">
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Time to Execute</p>
            <p className="text-[12px] text-foreground leading-relaxed">{sigma.timeToExecute}</p>
          </div>
        )}
      </div>

      {/* Risk & blockers */}
      <div className="flex items-center gap-4 text-[11px]">
        {sigma.riskLevel && (
          <span className={`px-2 py-0.5 rounded-full font-mono ${
            sigma.riskLevel === "low" ? "bg-emerald-500/15 text-emerald-400" :
            sigma.riskLevel === "medium" ? "bg-amber-500/15 text-amber-400" :
            "bg-red-500/15 text-red-400"
          }`}>
            {sigma.riskLevel} risk
          </span>
        )}
        {sigma.prerequisitesMet !== undefined && (
          <span className={`flex items-center gap-1 ${sigma.prerequisitesMet ? "text-emerald-400" : "text-amber-400"}`}>
            {sigma.prerequisitesMet ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {sigma.prerequisitesMet ? "Prerequisites met" : "Prerequisites pending"}
          </span>
        )}
      </div>

      {sigma.blockersIfAny && sigma.blockersIfAny.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[9px] text-amber-400 font-mono uppercase tracking-wider mb-1">Blockers</p>
          <ul className="space-y-1">
            {sigma.blockersIfAny.map((b: string, i: number) => (
              <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span> {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Perspective synthesis */}
      {sigma.perspective && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Synthesis</p>
          <p className="text-[12px] text-foreground/80 leading-relaxed">{sigma.perspective}</p>
        </div>
      )}

      {sigma.rationale && sigma.rationale.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Rationale</p>
          <div className="space-y-1">
            {sigma.rationale.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/70">
                <span className="text-cyan-400 font-mono shrink-0">{i + 1}.</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cascade Visualization ──────────────────────────────────────────────────

function CascadeTimeline({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {CASCADE_ORDER.map((key, i) => {
        const meta = EXEC_META[key];
        const isActive = i <= activeStep;
        const isCurrent = i === activeStep;
        return (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              isCurrent ? `${meta.bgColor} ${meta.color} ring-2 ring-offset-1 ring-offset-black ${meta.borderColor}` :
              isActive ? `${meta.bgColor} ${meta.color}` :
              "bg-zinc-800 text-zinc-500"
            }`}>
              {meta.number}
            </div>
            {i < CASCADE_ORDER.length - 1 && (
              <div className={`w-6 h-px ${isActive ? "bg-foreground/30" : "bg-zinc-700"}`} />
            )}
          </div>
        );
      })}
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
  const [cascadeStep, setCascadeStep] = useState(-1);
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; taskCount?: number }>>({});
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Individual executive tab state
  const [selectedExec, setSelectedExec] = useState<ExecType>("ceo");
  const [execMessages, setExecMessages] = useState<Record<ExecType, ChatMessage[]>>({
    ceo: [{ role: "assistant", content: "**ARCH online.** I see in 5-year arcs. Vision, market position, competitive moats. What strategic challenge should we think through?" }],
    cfo: [{ role: "assistant", content: "**LEDGER online.** I think in quarters. Cash flow, unit economics, budget feasibility. What financial question needs analysis?" }],
    cmo: [{ role: "assistant", content: "**SIGNAL online.** I operate in 3-week sprints. Campaigns, lead gen, market timing. What marketing challenge can I help with?" }],
    cto: [{ role: "assistant", content: "**FORGE online.** I think in 2-day sprints. System reliability, technical debt, build velocity. What technical challenge should we address?" }],
    sigma: [{ role: "assistant", content: "**Σ online.** I synthesize all executive perspectives into the single highest-leverage action you can take right now. Ask me anything and I'll consult the full board, then distill it to one move." }],
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
    setCascadeStep(0);

    // Animate cascade steps
    const stepInterval = setInterval(() => {
      setCascadeStep(prev => {
        if (prev >= CASCADE_ORDER.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const result = await boardQueryM.mutateAsync({ requestText: boardInput.trim() });
      setBoardResult(result as BoardResult);
      setCascadeStep(CASCADE_ORDER.length - 1);
    } catch {
      toast.error("Board query failed. Please try again.");
    } finally {
      clearInterval(stepInterval);
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
        executiveType: selectedExec === "sigma" ? "ceo" : selectedExec, // Σ uses board cascade
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
    { id: "board" as Tab, label: "5-4-3-2-1-Σ", icon: Users },
    { id: "executive" as Tab, label: "1:1 Executive", icon: Brain },
    { id: "direct" as Tab, label: "Direct LLM", icon: MessageSquare },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">OpenCommand</p>
        <h1 className="text-3xl font-light text-foreground tracking-tight">Executive Board</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5-4-3-2-1-Σ Temporal Cascade · ARCH → LEDGER → SIGNAL → FORGE → YOU → Σ
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? "border-cyan-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BOARD TAB — 5-4-3-2-1-Σ CASCADE */}
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
                className="self-end px-6 gap-2 bg-cyan-600 hover:bg-cyan-700"
              >
                {isQuerying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isQuerying ? "Cascading..." : "Ask Board"}
              </Button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {["Close more deals this quarter", "Why is our CAC increasing?", "Are we on track for profitability?", "What's the highest-leverage move right now?"].map(s => (
                <button
                  key={s}
                  onClick={() => setBoardInput(s)}
                  className="text-[10px] border border-border text-muted-foreground hover:border-cyan-400/30 hover:text-foreground px-2.5 py-1 rounded-md transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state with cascade animation */}
          {isQuerying && (
            <div className="card-minimal py-12">
              <div className="text-center mb-6">
                <Loader2 size={28} className="animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-sm text-foreground">Running 5-4-3-2-1-Σ Temporal Cascade...</p>
                <p className="text-[10px] text-muted-foreground mt-1">Each executive inherits context from the one above</p>
              </div>
              <div className="max-w-md mx-auto">
                <CascadeTimeline activeStep={cascadeStep} />
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">
                    {cascadeStep >= 0 && cascadeStep < CASCADE_ORDER.length && (
                      <>
                        <span className={EXEC_META[CASCADE_ORDER[cascadeStep]].color}>
                          {EXEC_META[CASCADE_ORDER[cascadeStep]].name}
                        </span>
                        {" "}analyzing ({EXEC_META[CASCADE_ORDER[cascadeStep]].timeHorizon})...
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Board results */}
          {boardResult && !isQuerying && (
            <div className="space-y-6">
              {/* Header badge */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-medium">
                  {boardResult.socratic.sourceCount} sources · {boardResult.socratic.queryTimeMs}ms
                </span>
                <span className="text-sm font-semibold text-foreground">{boardResult.socratic.title}</span>
              </div>

              {/* Cascade timeline */}
              <CascadeTimeline activeStep={CASCADE_ORDER.length - 1} />

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

              {/* Σ Synthesis — the final card, visually distinct */}
              <SigmaCard sigma={(boardResult as any).sigma} />
            </div>
          )}

          {/* Empty state */}
          {!boardResult && !isQuerying && (
            <div className="card-minimal flex items-center justify-center py-16">
              <div className="text-center max-w-lg">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-cyan-300">Σ</span>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">5-4-3-2-1-Σ Temporal Cascade</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask a strategic question and all five executives will analyze your business in sequence.
                  Each inherits context from the one above. Σ goes last and distills everything into the single highest-leverage action you can take right now.
                </p>
                <div className="flex justify-center">
                  <CascadeTimeline activeStep={-1} />
                </div>
                <div className="flex justify-center gap-4 mt-4 text-[10px] text-muted-foreground">
                  <span><span className="text-purple-400">ARCH</span> 5yr</span>
                  <span><span className="text-amber-400">LEDGER</span> 4mo</span>
                  <span><span className="text-emerald-400">SIGNAL</span> 3wk</span>
                  <span><span className="text-blue-400">FORGE</span> 2d</span>
                  <span><span className="text-cyan-300">Σ</span> now</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* INDIVIDUAL EXECUTIVE TAB — includes Σ */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === "executive" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Executive selector */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Select Executive</p>
            {CASCADE_ORDER.map((key) => {
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
                    <span className={`text-xs font-bold ${meta.color}`}>{meta.number}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12px] font-semibold ${isActive ? meta.color : "text-foreground"}`}>{meta.name}</span>
                      <span className="text-[10px] text-muted-foreground">· {meta.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      {meta.timeHorizon} · {msgCount} msgs
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
                    <span className={`text-xs font-bold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].number}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {EXEC_META[selectedExec].name} — {EXEC_META[selectedExec].label}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      {EXEC_META[selectedExec].timeHorizon} · {EXEC_META[selectedExec].focus}
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
                        <span className={`text-[10px] font-semibold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].number}</span>
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
                      <span className={`text-[10px] font-semibold ${EXEC_META[selectedExec].color}`}>{EXEC_META[selectedExec].number}</span>
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
