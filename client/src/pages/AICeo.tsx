import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Brain, Target, History, Zap, RotateCcw, Users, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";

type Message = { role: "user" | "assistant"; content: string };
type Tab = "briefing" | "chat" | "board" | "strategy" | "log";

export default function AICeo() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("briefing");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "**Arch online.** I am your AI Chief Executive Officer. I have full visibility into your OKRs, agent fleet, and execution history.\n\nI can help you:\n- **Strategize** — analyze your goals and build action plans\n- **Orchestrate** — delegate tasks to the right agents\n- **Decide** — provide executive-level recommendations\n\nWhat would you like to command today?" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [strategy, setStrategy] = useState<string | null>(null);
  const [boardTopic, setBoardTopic] = useState("");
  const [boardResults, setBoardResults] = useState<Array<{ role: string; name: string; title: string; analysis: string; error: string | null }> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const okrsQ = trpc.okrs.list.useQuery(undefined, { enabled: isAuthenticated });
  const pooSummaryQ = trpc.poo.summary.useQuery(undefined, { enabled: isAuthenticated });
  const decisionLogQ = trpc.aiCeo.decisionLog.useQuery(undefined, { enabled: isAuthenticated && tab === "log" });

  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companyId = companiesQ.data?.[0]?.id;

  const socratiqueQ = trpc.aiCeo.socratiqueQuestion.useMutation();
  const strategizeQ = trpc.aiCeo.strategize.useMutation({
    onSuccess: (data) => {
      setStrategy(data.strategy);
      utils.aiCeo.decisionLog.invalidate();
    },
  });
  const boardAnalysisQ = trpc.aiCeo.boardAnalysis.useMutation({
    onSuccess: (data) => {
      setBoardResults(data.analyses);
      utils.aiCeo.decisionLog.invalidate();
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsThinking(true);
    try {
      const result = await socratiqueQ.mutateAsync({
        userInput: `[CEO CHAT MODE] ${userMsg.content}`,
        conversationHistory: messages.slice(-6),
      });
      setMessages([...newMessages, { role: "assistant", content: result.response }]);
    } catch {
      toast.error("Arch is unavailable. Try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const agents = agentsQ.data ?? [];
  const okrs = okrsQ.data ?? [];
  const totalValue = Number(pooSummaryQ.data?.totalValue ?? 0);
  const activeAgents = agents.filter(a => a.status === "active").length;

  const briefingQ = trpc.aiCeo.morningBriefing.useQuery(
    { companyId: companyId! },
    { enabled: !!companyId && tab === "briefing" },
  );

  const tabs = [
    { id: "briefing" as Tab, label: "Morning Briefing", icon: Sun },
    { id: "chat" as Tab, label: "Arch Chat", icon: Brain },
    { id: "board" as Tab, label: "Executive Board", icon: Users },
    { id: "strategy" as Tab, label: "Strategy Engine", icon: Target },
    { id: "log" as Tab, label: "Decision Log", icon: History },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">OpenCommand</p>
        <h1 className="text-3xl font-light text-foreground tracking-tight">AI CEO — Arch</h1>
        <p className="text-sm text-muted-foreground mt-1">Executive Core · Orchestration Layer · Memory Engine</p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Agents", value: `${activeAgents}/${agents.length}`, color: "text-emerald-400" },
          { label: "OKRs Tracked", value: okrs.length.toString(), color: "text-blue-400" },
          { label: "Decisions", value: decisionLogQ.data?.length.toString() ?? "—", color: "text-amber-400" },
          { label: "Value Created", value: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, color: "text-foreground" },
        ].map((s, i) => (
          <div key={i} className="card-minimal p-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">{s.label}</div>
            <div className={`text-2xl font-light ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Morning Briefing */}
      {tab === "briefing" && (
        <div className="space-y-6">
          {briefingQ.isLoading && (
            <div className="text-center py-16">
              <RotateCcw size={24} className="mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating morning briefing...</p>
            </div>
          )}

          {briefingQ.data && (
            <>
              {/* Briefing Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "New Leads", value: briefingQ.data.stats.newLeadsOvernight, color: "text-blue-400" },
                  { label: "Pending Drafts", value: briefingQ.data.stats.pendingDrafts, color: briefingQ.data.stats.pendingDrafts > 0 ? "text-yellow-400" : "text-green-400" },
                  { label: "Inventory", value: briefingQ.data.stats.inventoryCount, color: "text-foreground" },
                  { label: "Competitor Intel", value: briefingQ.data.stats.competitorListings, color: "text-purple-400" },
                ].map((s, i) => (
                  <div key={i} className="card-minimal p-4">
                    <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">{s.label}</div>
                    <div className={`text-2xl font-light ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Today's Strategy */}
              <div className="card-minimal p-6 border-l-4 border-l-emerald-500">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" /> Today's Strategy
                </h3>
                <div className="text-sm text-foreground/80 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <Streamdown text={briefingQ.data.todayStrategy} />
                </div>
              </div>

              {/* Briefing Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Overnight Activity</h3>
                {briefingQ.data.items.map((item, i) => {
                  const severityColors: Record<string, { border: string; badge: string; bg: string }> = {
                    RED: { border: "border-l-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/30", bg: "bg-red-500/5" },
                    YELLOW: { border: "border-l-yellow-500", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", bg: "bg-yellow-500/5" },
                    BLUE: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/30", bg: "bg-blue-500/5" },
                    GREEN: { border: "border-l-green-500", badge: "bg-green-500/10 text-green-400 border-green-500/30", bg: "bg-green-500/5" },
                  };
                  const colors = severityColors[item.severity] ?? severityColors.BLUE;

                  return (
                    <div key={i} className={`card-minimal p-4 border-l-4 ${colors.border} ${colors.bg}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-xs ${colors.badge}`}>{item.severity}</Badge>
                            <span className="text-xs text-muted-foreground">{item.category}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                        </div>
                        {item.metric && (
                          <span className="text-sm font-mono text-foreground/70">{item.metric}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!briefingQ.isLoading && !briefingQ.data && (
            <div className="text-center py-16 text-muted-foreground">
              <Sun size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Briefing Unavailable</p>
              <p className="text-sm mt-1">Select a company to generate your morning briefing</p>
            </div>
          )}
        </div>
      )}

      {/* Arch Chat */}
      {tab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <div className="card-minimal flex flex-col" style={{ minHeight: "520px" }}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Brain size={14} className="text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Arch — AI Chief Executive Officer</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Online · Memory active
                    </div>
                  </div>
                </div>
                <button onClick={() => setMessages([{ role: "assistant", content: "Arch reset. Ready for new directives." }])} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-zinc-800">
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "380px" }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <span className="text-[10px] font-semibold text-foreground">A</span>
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
                {isThinking && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-foreground">A</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      <span className="text-[10px] text-muted-foreground">Arch processing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {["What's our biggest bottleneck?", "Prioritize my OKRs", "Which agents should I activate?"].map(s => (
                  <button key={s} onClick={() => setInput(s)} className="text-xs border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground px-2.5 py-1 rounded-md transition-colors">
                    {s}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Command Arch..."
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

          {/* Orchestration Panel */}
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">Orchestration Layer</div>
            <div className="card-minimal p-4 space-y-3">
              {agents.slice(0, 5).map(agent => (
                <div key={agent.id} className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${agent.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground">{agent.status} · {agent.tasksCompleted} tasks</div>
                  </div>
                </div>
              ))}
              {agents.length === 0 && <div className="text-muted-foreground text-xs text-center py-4">No agents deployed</div>}
            </div>

            <div className="text-xs text-muted-foreground font-medium mb-2">OKR Snapshot</div>
            <div className="card-minimal p-4 space-y-3">
              {okrs.slice(0, 3).map(okr => {
                const progress = Math.min(100, (Number(okr.currentValue) / Number(okr.targetValue)) * 100);
                return (
                  <div key={okr.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground truncate flex-1 mr-2">{okr.keyResult}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-400" : "bg-foreground/60"}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
              {okrs.length === 0 && <div className="text-muted-foreground text-xs text-center py-2">No OKRs defined</div>}
            </div>
          </div>
        </div>
      )}

      {/* Executive Board */}
      {tab === "board" && (
        <div className="space-y-6">
          <div className="card-minimal p-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Board Topic</h3>
            <p className="text-xs text-muted-foreground mb-4">Present a topic to the executive board. All four executives (CEO, CTO, CMO, CFO) will analyze it simultaneously from their perspectives.</p>
            <Textarea
              value={boardTopic}
              onChange={e => setBoardTopic(e.target.value)}
              placeholder="e.g. Should we expand into precision agriculture technology for the 2026 season?"
              className="min-h-[80px] text-sm mb-3"
            />
            <Button
              onClick={() => boardAnalysisQ.mutate({ topic: boardTopic, companyId })}
              disabled={!boardTopic.trim() || boardAnalysisQ.isPending}
            >
              {boardAnalysisQ.isPending ? (
                <><RotateCcw size={14} className="mr-2 animate-spin" /> Consulting Board...</>
              ) : (
                <><Users size={14} className="mr-2" /> Convene Board</>
              )}
            </Button>
          </div>

          {boardResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boardResults.map(exec => {
                const colors: Record<string, string> = {
                  ceo: "border-emerald-500/30",
                  cto: "border-blue-500/30",
                  cmo: "border-purple-500/30",
                  cfo: "border-amber-500/30",
                };
                const icons: Record<string, string> = {
                  ceo: "bg-emerald-500/10 text-emerald-400",
                  cto: "bg-blue-500/10 text-blue-400",
                  cmo: "bg-purple-500/10 text-purple-400",
                  cfo: "bg-amber-500/10 text-amber-400",
                };
                return (
                  <div key={exec.role} className={`card-minimal p-5 border ${colors[exec.role] ?? "border-border"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${icons[exec.role] ?? ""}`}>
                        {exec.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{exec.name}</div>
                        <div className="text-xs text-muted-foreground">{exec.title}</div>
                      </div>
                    </div>
                    {exec.error ? (
                      <p className="text-xs text-red-400">{exec.error}</p>
                    ) : (
                      <div className="text-sm text-foreground/80 leading-relaxed prose prose-invert prose-sm max-w-none">
                        <Streamdown text={exec.analysis} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!boardResults && !boardAnalysisQ.isPending && (
            <div className="text-center py-16 text-muted-foreground">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Executive Board Ready</p>
              <p className="text-sm mt-1">Enter a topic above and convene the board for multi-perspective analysis</p>
            </div>
          )}
        </div>
      )}

      {/* Strategy Engine */}
      {tab === "strategy" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-3">Strategic Goal Input</div>
            <div className="card-minimal p-6 space-y-4">
              <Textarea
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="e.g. Double our MRR in the next 90 days..."
                className="bg-zinc-900 border-border text-foreground text-sm resize-none rounded-lg"
                rows={4}
              />
              <Button
                onClick={() => strategizeQ.mutate({ goal: goalInput })}
                disabled={!goalInput.trim() || strategizeQ.isPending}
                size="sm"
                className="w-full gap-2"
              >
                <Zap size={14} />
                {strategizeQ.isPending ? "Arch strategizing..." : "Generate Strategy"}
              </Button>
            </div>

            <div className="mt-4 card-minimal p-4 space-y-2">
              <div className="text-xs text-muted-foreground font-medium mb-2">Context Arch will use</div>
              {[
                { label: "OKRs", value: `${okrs.length} objectives` },
                { label: "Agent Fleet", value: `${agents.length} agents` },
                { label: "Value Created", value: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground font-medium mb-3">Arch Strategic Analysis</div>
            {strategy ? (
              <div className="card-minimal p-6 border-l-2 border-l-foreground">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Brain size={12} className="text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Arch — Strategic Recommendation</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  <Streamdown>{strategy}</Streamdown>
                </div>
                <div className="h-px bg-border mt-4" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <span className="text-[10px] text-emerald-400">Logged to decision record</span>
                </div>
              </div>
            ) : (
              <div className="card-minimal p-12 text-center">
                <Brain size={28} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                <div className="text-base font-medium text-muted-foreground">Awaiting directive</div>
                <p className="text-muted-foreground text-sm mt-1">Enter a strategic goal and Arch will analyze your current position and generate an action plan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Log */}
      {tab === "log" && (
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-4">Executive Decision Log — {decisionLogQ.data?.length ?? 0} entries</div>
          {decisionLogQ.isLoading ? (
            <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>
          ) : !decisionLogQ.data?.length ? (
            <div className="card-minimal p-8 text-center">
              <History size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">No decisions logged</div>
              <p className="text-muted-foreground text-sm mt-1">Execute tasks and generate strategies to build Arch's decision history.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {decisionLogQ.data.map(entry => (
                <div key={entry.id} className="card-minimal p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[10px] border border-border rounded px-2 py-0.5 text-muted-foreground">{entry.decisionType.replace(/_/g, " ")}</span>
                      <div className="text-sm font-medium text-foreground mt-2">{entry.decision.substring(0, 100)}{entry.decision.length > 100 ? "..." : ""}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-4">
                      {entry.wasSuccessful === true && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                      {entry.wasSuccessful === false && <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
                      <span className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {entry.context && (
                    <div className="mb-1">
                      <span className="text-[10px] text-muted-foreground">Context: </span>
                      <span className="text-xs text-zinc-400">{entry.context.substring(0, 120)}</span>
                    </div>
                  )}
                  {entry.outcome && (
                    <div>
                      <span className="text-[10px] text-muted-foreground">Outcome: </span>
                      <span className="text-xs text-zinc-400">{entry.outcome.substring(0, 120)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
