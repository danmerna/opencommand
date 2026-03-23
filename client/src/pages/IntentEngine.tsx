import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Send, Zap, Play, FileText, Clock, ChevronRight, RotateCcw, Cpu,
  Layers, ArrowRight, CheckCircle2, Globe, Plug, Brain, Eye, Sparkles, Database,
  BarChart3, AlertTriangle, Link2, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

type Message = { role: "user" | "assistant"; content: string };
type IntentObject = {
  title: string; description: string; goal: string;
  constraints: string[]; successCriteria: string[];
  routingMode: "ai" | "human" | "hybrid"; priority: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
};

type LiveContextPhase =
  | "idle"
  | "connecting"    // "Connecting to your tools..."
  | "reading"       // "Reading HubSpot pipeline data..."
  | "analyzing"     // "Analyzing patterns..."
  | "building"      // "Building context..."
  | "ready";

interface LiveContextData {
  contextId: number;
  questions: string[];
  insights: string[];
  contextSummary: string;
  suggestedParameters: Record<string, unknown>;
  hasLiveData: boolean;
  connectedProviders: string[];
}

export default function IntentEngine() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"plan" | "tasks">("plan");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [intentObject, setIntentObject] = useState<IntentObject | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [livePhase, setLivePhase] = useState<LiveContextPhase>("idle");
  const [liveContext, setLiveContext] = useState<LiveContextData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskRouting, setTaskRouting] = useState<"ai" | "human" | "hybrid">("ai");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const tasksQ = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const connectionsQ = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated });
  const categoriesQ = trpc.hub.categories.useQuery();

  const intentQ = trpc.aiCeo.socratiqueQuestion.useMutation();
  const liveContextualizeMut = trpc.context.liveContextualize.useMutation();

  const createTask = trpc.tasks.create.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task created"); } });
  const generatePrompt = trpc.tasks.generatePrompt.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Prompt generated"); } });
  const executeTask = trpc.tasks.executeTask.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      utils.poo.list.invalidate();
      utils.poo.summary.invalidate();
      utils.inbox.list.invalidate();
      toast.success(`Task executed — $${data.dollarValueCreated.toFixed(2)} value created`);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const connections = connectionsQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const connectedCount = connections.filter(c => c.status === "connected").length;

  const connectedCategories = useMemo(() => {
    const connCatIds = new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId));
    return categories.filter(c => connCatIds.has(c.id));
  }, [connections, categories]);

  // Progressive loading label sequence
  const PHASE_CONFIG: Record<LiveContextPhase, { label: string; icon: React.ReactNode; color: string }> = {
    idle: { label: "Awaiting input", icon: <Brain className="w-3 h-3" />, color: "text-muted-foreground" },
    connecting: { label: "Connecting to your tools...", icon: <Plug className="w-3 h-3 animate-pulse" />, color: "text-yellow-400" },
    reading: { label: "Reading pipeline data...", icon: <Database className="w-3 h-3 animate-pulse" />, color: "text-blue-400" },
    analyzing: { label: "Analyzing patterns...", icon: <Eye className="w-3 h-3 animate-pulse" />, color: "text-purple-400" },
    building: { label: "Building context...", icon: <Sparkles className="w-3 h-3 animate-pulse" />, color: "text-orange-400" },
    ready: { label: "Context ready", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" },
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsThinking(true);
    setLiveContext(null);

    try {
      // Progressive loading states
      setLivePhase("connecting");
      await new Promise(r => setTimeout(r, 400));

      if (connectedCount > 0) {
        setLivePhase("reading");
        await new Promise(r => setTimeout(r, 300));
        setLivePhase("analyzing");
      }

      setLivePhase("building");

      // Single call to the new live contextualize procedure
      const ctx = await liveContextualizeMut.mutateAsync({ requestText: userMsg.content });
      setLiveContext(ctx as LiveContextData);
      setLivePhase("ready");

      // Feed the contextualized questions directly as the AI's first response
      const contextEnrichedInput = [
        `[CONTEXT-ENRICHED REQUEST] ${userMsg.content}`,
        ctx.hasLiveData ? `[Live Data Available: ${ctx.connectedProviders.join(", ")}]` : "[No connected tools]",
        `[Context Summary: ${ctx.contextSummary}]`,
        `[Key Insights: ${ctx.insights.slice(0, 3).join(" | ")}]`,
        `[Pre-filled Parameters: ${JSON.stringify(ctx.suggestedParameters)}]`,
        `\nBased on the above live data context, ask the following data-informed clarifying questions:\n${ctx.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
      ].join("\n");

      const result = await intentQ.mutateAsync({
        userInput: contextEnrichedInput,
        conversationHistory: messages,
      });
      setMessages([...newMessages, { role: "assistant", content: result.response }]);
      if (result.intentObject) {
        setIntentObject(result.intentObject as IntentObject);
        toast.success("Intent object structured — ready to deploy");
      }
    } catch (err) {
      // Graceful fallback to generic Socratic questions
      try {
        const result = await intentQ.mutateAsync({ userInput: userMsg.content, conversationHistory: messages });
        setMessages([...newMessages, { role: "assistant", content: result.response }]);
        if (result.intentObject) setIntentObject(result.intentObject as IntentObject);
      } catch {
        toast.error("Arch is unavailable. Try again.");
      }
      setLivePhase("idle");
    } finally {
      setIsThinking(false);
    }
  };

  const deployIntent = async () => {
    if (!intentObject) return;
    await createTask.mutateAsync({
      title: intentObject.title,
      description: intentObject.description,
      routingMode: intentObject.routingMode,
      priority: intentObject.priority,
    });
    setMode("tasks");
    toast.success("Intent deployed as task");
  };

  const tasks = tasksQ.data ?? [];
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const priorityStyle = (p: string) =>
    p === "critical" ? "text-red-400 border-red-400/30" : p === "high" ? "text-amber-400 border-amber-400/30" : p === "medium" ? "text-blue-400 border-blue-400/30" : "text-zinc-400 border-zinc-600";

  const phaseOrder: LiveContextPhase[] = ["connecting", "reading", "analyzing", "building"];
  const currentPhaseIdx = phaseOrder.indexOf(livePhase);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">OpenCommand</p>
        <h1 className="text-3xl font-light text-foreground tracking-tight">Intent Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">Self-contextualizing · Live data-informed · Autonomous execution</p>

        {/* No-connection banner */}
        {connectedCount === 0 && !connectionsQ.isLoading && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-yellow-800/50 bg-yellow-950/20">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-xs text-yellow-300 flex-1">
              Connect your tools for smarter, data-informed questions — Arch will reference your actual pipeline, contacts, and deals.
            </p>
            <Link href="/integration-hub">
              <Button variant="outline" size="sm" className="text-xs border-yellow-700 text-yellow-400 hover:bg-yellow-950 gap-1.5 flex-shrink-0">
                <Link2 className="w-3 h-3" /> Go to Integration Hub
              </Button>
            </Link>
          </div>
        )}

        {/* Context Pipeline Status */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
          {phaseOrder.map((phase, i) => {
            const isActive = livePhase === phase;
            const isDone = currentPhaseIdx > i || livePhase === "ready";
            return (
              <div key={phase} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className={`w-3 h-3 ${isDone ? "text-emerald-400" : "text-zinc-700"}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isActive ? "bg-zinc-800 " + PHASE_CONFIG[phase].color : isDone ? "text-emerald-400" : "text-zinc-600"}`}>
                  {isDone && !isActive ? <CheckCircle2 className="w-3 h-3" /> : PHASE_CONFIG[phase].icon}
                  {phase === "connecting" ? "Connect" : phase === "reading" ? "Read" : phase === "analyzing" ? "Analyze" : "Build"}
                </div>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
              <Plug className="w-3 h-3 mr-1" /> {connectedCount} tools
            </Badge>
            {liveContext?.hasLiveData && (
              <Badge variant="outline" className="border-emerald-800 text-emerald-400 text-[10px]">
                <BarChart3 className="w-3 h-3 mr-1" /> Live data
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex border-b border-border mb-6">
        {[
          { id: "plan" as const, label: "Plan", icon: Cpu },
          { id: "tasks" as const, label: "Execute", icon: Play },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${mode === m.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
        <Link href="/context-history">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground">
            <History size={14} /> History
          </button>
        </Link>
      </div>

      {/* Plan Mode */}
      {mode === "plan" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <div className="card-minimal flex-1 flex flex-col" style={{ minHeight: "500px" }}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-xs font-semibold text-foreground">AI</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Arch — Self-Contextualizing Engine</div>
                    <div className={`text-[10px] flex items-center gap-1 ${PHASE_CONFIG[livePhase].color}`}>
                      {PHASE_CONFIG[livePhase].icon} {PHASE_CONFIG[livePhase].label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setMessages([]); setIntentObject(null); setLivePhase("idle"); setLiveContext(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Cpu size={28} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                    <div className="text-base font-medium text-muted-foreground mb-2">Describe your goal</div>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Arch will connect to your tools, read live data, and ask questions that reference your actual pipeline — not generic ones.
                    </p>
                    <div className="mt-6 space-y-2 max-w-md mx-auto">
                      {[
                        "I want more leads",
                        "Help me close the stalled deals in my pipeline",
                        "Automate my weekly content calendar across all channels",
                      ].map(s => (
                        <button
                          key={s}
                          onClick={() => setInput(s)}
                          className="block w-full text-left px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground text-xs transition-all"
                        >
                          <ChevronRight size={10} className="inline mr-2 opacity-50" />{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context card — shown above messages when live data is ready */}
                {liveContext?.hasLiveData && liveContext.contextSummary && messages.length > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Context assembled</span>
                      </div>
                      <p className="text-xs text-emerald-200/80 leading-relaxed">{liveContext.contextSummary}</p>
                      {liveContext.connectedProviders.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {liveContext.connectedProviders.map(p => (
                            <Badge key={p} variant="outline" className="border-emerald-800/50 text-emerald-500 text-[9px] px-1.5 py-0 capitalize">{p}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-zinc-800 border border-zinc-700" : "bg-card border border-border"}`}>
                      {msg.role === "assistant" ? (
                        <div className="text-sm text-foreground leading-relaxed"><Streamdown>{msg.content}</Streamdown></div>
                      ) : (
                        <p className="text-sm text-foreground">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                        <span className={`text-[10px] ${PHASE_CONFIG[livePhase].color}`}>{PHASE_CONFIG[livePhase].label}</span>
                      </div>
                      {(livePhase === "reading" || livePhase === "analyzing") && connectedCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {connectedCategories.map(c => (
                            <Badge key={c.id} variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5 py-0">
                              <Globe className="w-2 h-2 mr-0.5" />{c.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Describe your goal — Arch will read your live data first..."
                    className="flex-1 bg-zinc-900 border-border text-foreground text-sm resize-none rounded-lg"
                    rows={2}
                  />
                  <Button onClick={sendMessage} disabled={!input.trim() || isThinking} size="sm" className="self-end px-4">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Live Context Object */}
            {liveContext && (
              <div className="card-minimal p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Layers className="w-3 h-3" /> Context Object
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${liveContext.hasLiveData ? "border-emerald-800 text-emerald-400" : "border-zinc-700 text-zinc-400"}`}>
                    {liveContext.hasLiveData ? "Live data" : "Generic"}
                  </Badge>
                </div>
                <div className="h-px bg-border" />
                {liveContext.insights.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">Key Insights</div>
                    <ul className="space-y-1.5">
                      {liveContext.insights.map((ins, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                          <span>{ins}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Object.keys(liveContext.suggestedParameters).length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">Suggested Parameters</div>
                    <div className="text-xs text-zinc-400 font-mono bg-zinc-950 border border-zinc-800 p-2 rounded-md max-h-24 overflow-y-auto">
                      {JSON.stringify(liveContext.suggestedParameters, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground font-medium mb-2">Structured Intent Object</div>
            {intentObject ? (
              <div className="card-minimal p-5 space-y-4 border-l-2 border-l-foreground">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Title</div>
                  <div className="text-base font-medium text-foreground">{intentObject.title}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Goal</div>
                  <p className="text-muted-foreground text-sm">{intentObject.goal}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Routing</div>
                    <span className="text-xs border border-border rounded px-2 py-0.5 text-foreground">{intentObject.routingMode}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Priority</div>
                    <span className={`text-xs border rounded px-2 py-0.5 ${priorityStyle(intentObject.priority)}`}>{intentObject.priority}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Success Criteria</div>
                  <ul className="space-y-1">
                    {intentObject.successCriteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ChevronRight size={10} className="mt-0.5 text-foreground/50 flex-shrink-0" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} /> {intentObject.estimatedHours} hrs estimated
                </div>
                <div className="h-px bg-border" />
                <Button onClick={deployIntent} disabled={createTask.isPending} size="sm" className="w-full">
                  <Zap size={14} className="mr-2" />
                  {createTask.isPending ? "Deploying..." : "Deploy as Task"}
                </Button>
              </div>
            ) : (
              <div className="card-minimal p-6 text-center">
                <FileText size={20} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                <div className="text-sm font-medium text-muted-foreground">Awaiting intent</div>
                <p className="text-muted-foreground text-xs mt-1">Complete the intent dialogue to generate a context-enriched intent object.</p>
              </div>
            )}

            {connectedCategories.length > 0 && (
              <div className="card-minimal p-4">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                  <Plug className="w-3 h-3" /> Active Context Sources
                </div>
                <div className="space-y-1">
                  {connectedCategories.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-zinc-300">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Execution Mode */}
      {mode === "tasks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="text-xs text-muted-foreground font-medium mb-3">Task Queue — {tasks.length}</div>

            <div className="card-minimal p-4 mb-4 space-y-3">
              <div className="text-xs text-muted-foreground font-medium">Quick Create</div>
              <input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full bg-zinc-900 border border-border text-foreground text-sm px-3 py-2 rounded-md focus:outline-none focus:border-foreground/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={taskRouting} onValueChange={v => setTaskRouting(v as any)}>
                  <SelectTrigger className="bg-zinc-900 border-border text-foreground text-xs h-8 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ai" className="text-xs">AI</SelectItem>
                    <SelectItem value="human" className="text-xs">Human</SelectItem>
                    <SelectItem value="hybrid" className="text-xs">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskPriority} onValueChange={v => setTaskPriority(v as any)}>
                  <SelectTrigger className="bg-zinc-900 border-border text-foreground text-xs h-8 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createTask.mutate({ title: taskTitle, routingMode: taskRouting, priority: taskPriority })}
                disabled={!taskTitle.trim() || createTask.isPending}
                size="sm"
                className="w-full text-xs"
              >
                Create Task
              </Button>
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {tasks.map(task => {
                const statusColors: Record<string, string> = { pending: "text-muted-foreground", in_progress: "text-yellow-400", completed: "text-emerald-400", failed: "text-red-400", awaiting_human: "text-blue-400" };
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left card-minimal p-3 transition-all hover:border-foreground/20 ${selectedTaskId === task.id ? "border-foreground/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-medium ${statusColors[task.status]}`}>{task.status.replace("_", " ")}</span>
                      <span className="text-[10px] text-muted-foreground">{task.routingMode}</span>
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                  </button>
                );
              })}
              {tasks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs">No tasks in queue</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedTask ? (
              <div className="card-minimal p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Task Detail</div>
                    <h2 className="text-xl font-medium text-foreground">{selectedTask.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground">{selectedTask.routingMode}</span>
                    <span className={`text-xs border rounded px-2 py-0.5 ${priorityStyle(selectedTask.priority)}`}>{selectedTask.priority}</span>
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Description</div>
                    <p className="text-muted-foreground text-sm">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.generatedPrompt && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Generated Execution Prompt</div>
                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-md font-mono text-xs text-muted-foreground leading-relaxed max-h-48 overflow-y-auto">
                      {selectedTask.generatedPrompt}
                    </div>
                  </div>
                )}

                {selectedTask.executionLog && Array.isArray(selectedTask.executionLog) && (selectedTask.executionLog as string[]).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Execution Log</div>
                    <div className="space-y-1">
                      {(selectedTask.executionLog as string[]).map((step, i) => (
                        <div key={i} className="flex items-start gap-2 font-mono text-xs text-muted-foreground">
                          <span className="text-foreground/50">[{String(i + 1).padStart(2, "0")}]</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-border" />

                <div className="flex gap-3">
                  {selectedTask.status === "pending" && (
                    <Button
                      onClick={() => generatePrompt.mutate({ taskId: selectedTask.id })}
                      disabled={generatePrompt.isPending}
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                    >
                      <FileText size={13} />
                      {generatePrompt.isPending ? "Generating..." : "Generate Prompt"}
                    </Button>
                  )}
                  {(selectedTask.status === "pending" || selectedTask.status === "in_progress") && (
                    <Button
                      onClick={() => executeTask.mutate({ taskId: selectedTask.id })}
                      disabled={executeTask.isPending}
                      size="sm"
                      className="gap-2 text-xs"
                    >
                      <Play size={13} />
                      {executeTask.isPending ? "Executing..." : "Execute Task"}
                    </Button>
                  )}
                  {selectedTask.status === "completed" && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Task completed — PoO receipt issued</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-minimal p-12 text-center">
                <Play size={28} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                <div className="text-base font-medium text-muted-foreground">Select a task</div>
                <p className="text-muted-foreground text-sm mt-1">Choose a task from the queue to view details and execute.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
