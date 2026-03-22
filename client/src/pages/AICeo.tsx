import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Brain, Network, History, ChevronRight, Zap, Target, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";

type Message = { role: "user" | "assistant"; content: string };
type Tab = "chat" | "strategy" | "log";

export default function AICeo() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "**ARIA ONLINE.** I am your AI Chief Executive Officer. I have full visibility into your OKRs, agent fleet, and execution history.\n\nI can help you:\n- **Strategize** — analyze your goals and build action plans\n- **Orchestrate** — delegate tasks to the right agents\n- **Decide** — provide executive-level recommendations\n\nWhat would you like to command today?" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [strategy, setStrategy] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const okrsQ = trpc.okrs.list.useQuery(undefined, { enabled: isAuthenticated });
  const pooSummaryQ = trpc.poo.summary.useQuery(undefined, { enabled: isAuthenticated });
  const decisionLogQ = trpc.aiCeo.decisionLog.useQuery(undefined, { enabled: isAuthenticated && tab === "log" });

  const socratiqueQ = trpc.aiCeo.socratiqueQuestion.useMutation();
  const strategizeQ = trpc.aiCeo.strategize.useMutation({
    onSuccess: (data) => {
      setStrategy(data.strategy);
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
      toast.error("ARIA is unavailable. Try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const agents = agentsQ.data ?? [];
  const okrs = okrsQ.data ?? [];
  const totalValue = Number(pooSummaryQ.data?.totalValue ?? 0);
  const activeAgents = agents.filter(a => a.status === "active").length;

  const tabs = [
    { id: "chat" as Tab, label: "ARIA CHAT", icon: Brain },
    { id: "strategy" as Tab, label: "STRATEGY ENGINE", icon: Target },
    { id: "log" as Tab, label: "DECISION LOG", icon: History },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="section-label mb-2">OPENCOMMAND</div>
        <div className="red-line mb-4" />
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-display text-6xl text-foreground">AI CEO — ARIA</h1>
            <p className="text-muted-foreground text-sm mt-2 font-mono">EXECUTIVE CORE · ORCHESTRATION LAYER · MEMORY ENGINE</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)] animate-pulse" />
              <span className="section-label text-[oklch(0.65_0.18_142)]">ARIA ONLINE</span>
            </div>
            <div className="font-condensed font-black text-2xl text-foreground">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <div className="section-label">TOTAL VALUE CREATED</div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-6">
        {[
          { label: "ACTIVE AGENTS", value: `${activeAgents}/${agents.length}`, color: "text-[oklch(0.65_0.18_142)]" },
          { label: "OKRs TRACKED", value: okrs.length.toString(), color: "text-[oklch(0.62_0.18_240)]" },
          { label: "EXEC DECISIONS", value: decisionLogQ.data?.length.toString() ?? "—", color: "text-accent" },
          { label: "SYSTEM STATUS", value: "OPTIMAL", color: "text-[oklch(0.65_0.18_142)]" },
        ].map((s, i) => (
          <div key={i} className="bg-background brutal-card p-4">
            <div className="section-label mb-1">{s.label}</div>
            <div className={`font-condensed font-black text-2xl ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-condensed font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-px ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ARIA Chat */}
      {tab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <div className="brutal-card flex flex-col" style={{ minHeight: "520px" }}>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent flex items-center justify-center glow-red">
                    <Brain size={18} className="text-foreground" />
                  </div>
                  <div>
                    <div className="font-condensed font-bold text-base text-foreground">ARIA — AI CHIEF EXECUTIVE OFFICER</div>
                    <div className="section-label">EXECUTIVE CORE v1.0 · MEMORY ACTIVE</div>
                  </div>
                </div>
                <button onClick={() => setMessages([{ role: "assistant", content: "ARIA RESET. Ready for new directives." }])} className="text-muted-foreground hover:text-foreground">
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "380px" }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 bg-accent flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <span className="font-condensed font-black text-foreground text-xs">A</span>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "bg-accent/10 border border-accent/30" : "bg-secondary border border-border"} p-3`}>
                      {msg.role === "assistant" ? (
                        <div className="text-sm text-foreground font-sans leading-relaxed">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground font-sans">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="w-6 h-6 bg-accent flex items-center justify-center">
                      <span className="font-condensed font-black text-foreground text-xs">A</span>
                    </div>
                    <div className="bg-secondary border border-border p-3 flex items-center gap-2">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      <span className="section-label">ARIA PROCESSING...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested prompts */}
              <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {["What's our biggest bottleneck?", "Prioritize my OKRs", "Which agents should I activate?"].map(s => (
                  <button key={s} onClick={() => setInput(s)} className="font-mono text-xs border border-border text-muted-foreground hover:border-accent hover:text-foreground px-2 py-1 transition-colors">
                    {s}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Command ARIA..."
                    className="flex-1 bg-input border-border text-foreground font-sans text-sm resize-none"
                    rows={2}
                  />
                  <Button onClick={sendMessage} disabled={!input.trim() || isThinking} className="bg-accent text-foreground hover:bg-accent/80 self-end px-4">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Orchestration Panel */}
          <div className="space-y-4">
            <div className="section-label">ORCHESTRATION LAYER</div>
            <div className="brutal-card p-4 space-y-3">
              {agents.slice(0, 5).map((agent, i) => {
                const typeColors: Record<string, string> = { ceo: "bg-accent", marketing: "bg-[oklch(0.62_0.18_240)]", research: "bg-[oklch(0.82_0.18_90)]", sales: "bg-[oklch(0.65_0.18_142)]", admin: "bg-muted-foreground", custom: "bg-foreground" };
                return (
                  <div key={agent.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 flex-shrink-0 ${agent.status === "active" ? typeColors[agent.type] ?? "bg-foreground" : "bg-muted-foreground"} ${agent.status === "active" ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-condensed font-bold text-xs text-foreground truncate">{agent.name}</div>
                      <div className="section-label text-[0.55rem]">{agent.status.toUpperCase()} · {agent.tasksCompleted} TASKS</div>
                    </div>
                    <span className={`font-mono text-xs ${agent.status === "active" ? "text-[oklch(0.65_0.18_142)]" : "text-muted-foreground"}`}>
                      {agent.status === "active" ? "●" : "○"}
                    </span>
                  </div>
                );
              })}
              {agents.length === 0 && <div className="text-muted-foreground font-mono text-xs text-center py-4">NO AGENTS DEPLOYED</div>}
            </div>

            {/* OKR Snapshot */}
            <div className="section-label">OKR SNAPSHOT</div>
            <div className="brutal-card p-4 space-y-3">
              {okrs.slice(0, 3).map(okr => {
                const progress = Math.min(100, (Number(okr.currentValue) / Number(okr.targetValue)) * 100);
                return (
                  <div key={okr.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-condensed font-bold text-xs text-foreground truncate flex-1 mr-2">{okr.keyResult}</span>
                      <span className="font-mono text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className={progress >= 100 ? "progress-bar-fill-green" : "progress-bar-fill"} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
              {okrs.length === 0 && <div className="text-muted-foreground font-mono text-xs text-center py-2">NO OKRs DEFINED</div>}
            </div>
          </div>
        </div>
      )}

      {/* Strategy Engine */}
      {tab === "strategy" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="section-label mb-4">STRATEGIC GOAL INPUT</div>
            <div className="brutal-card p-6 space-y-4">
              <div>
                <label className="section-label mb-2 block">DEFINE YOUR STRATEGIC GOAL</label>
                <Textarea
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  placeholder="e.g. Double our MRR in the next 90 days..."
                  className="bg-input border-border text-foreground font-sans text-sm resize-none"
                  rows={4}
                />
              </div>
              <Button
                onClick={() => strategizeQ.mutate({ goal: goalInput })}
                disabled={!goalInput.trim() || strategizeQ.isPending}
                className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2"
              >
                <Zap size={14} />
                {strategizeQ.isPending ? "ARIA STRATEGIZING..." : "GENERATE STRATEGY"}
              </Button>
            </div>

            {/* Context used */}
            <div className="mt-4 brutal-card p-4">
              <div className="section-label mb-3">CONTEXT ARIA WILL USE</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="section-label">OKRs</span>
                  <span className="font-mono text-xs text-foreground">{okrs.length} objectives</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="section-label">AGENT FLEET</span>
                  <span className="font-mono text-xs text-foreground">{agents.length} agents</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="section-label">VALUE CREATED</span>
                  <span className="font-mono text-xs text-foreground">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="section-label mb-4">ARIA STRATEGIC ANALYSIS</div>
            {strategy ? (
              <div className="brutal-border-red p-6">
                <div className="red-line-thin mb-4" />
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Brain size={12} className="text-foreground" />
                  </div>
                  <span className="font-condensed font-bold text-sm text-foreground">ARIA — STRATEGIC RECOMMENDATION</span>
                </div>
                <div className="text-sm text-foreground font-sans leading-relaxed">
                  <Streamdown>{strategy}</Streamdown>
                </div>
                <div className="red-line-thin mt-4" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[oklch(0.65_0.18_142)]" />
                  <span className="section-label text-[oklch(0.65_0.18_142)]">LOGGED TO DECISION RECORD</span>
                </div>
              </div>
            ) : (
              <div className="brutal-card p-12 text-center">
                <Brain size={32} className="text-muted-foreground mx-auto mb-4" />
                <div className="font-condensed font-bold text-xl text-muted-foreground">AWAITING DIRECTIVE</div>
                <p className="text-muted-foreground text-sm mt-2">Enter a strategic goal and ARIA will analyze your current position and generate an action plan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Log */}
      {tab === "log" && (
        <div>
          <div className="section-label mb-4">EXECUTIVE DECISION LOG — {decisionLogQ.data?.length ?? 0} ENTRIES</div>
          {decisionLogQ.isLoading ? (
            <div className="text-muted-foreground font-mono text-sm py-8 text-center">LOADING LOG...</div>
          ) : !decisionLogQ.data?.length ? (
            <div className="brutal-card p-8 text-center">
              <History size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO DECISIONS LOGGED</div>
              <p className="text-muted-foreground text-sm mt-2">Execute tasks and generate strategies to build ARIA's decision history.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisionLogQ.data.map(entry => (
                <div key={entry.id} className="brutal-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs border border-border px-2 py-0.5 uppercase text-muted-foreground">{entry.decisionType.replace(/_/g, " ")}</span>
                      <div className="font-condensed font-bold text-base text-foreground mt-2">{entry.decision.substring(0, 100)}{entry.decision.length > 100 ? "..." : ""}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-4">
                      {entry.wasSuccessful === true && <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)]" />}
                      {entry.wasSuccessful === false && <div className="w-2 h-2 bg-accent" />}
                      <span className="section-label">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {entry.context && (
                    <div className="mb-2">
                      <span className="section-label">CONTEXT: </span>
                      <span className="font-mono text-xs text-muted-foreground">{entry.context.substring(0, 120)}</span>
                    </div>
                  )}
                  {entry.outcome && (
                    <div>
                      <span className="section-label">OUTCOME: </span>
                      <span className="font-mono text-xs text-muted-foreground">{entry.outcome.substring(0, 120)}</span>
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
