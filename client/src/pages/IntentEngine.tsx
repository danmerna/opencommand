import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Zap, Play, FileText, Clock, ChevronRight, RotateCcw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Streamdown } from "streamdown";

type Message = { role: "user" | "assistant"; content: string };
type IntentObject = {
  title: string; description: string; goal: string;
  constraints: string[]; successCriteria: string[];
  routingMode: "ai" | "human" | "hybrid"; priority: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
};

export default function IntentEngine() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"socratic" | "tasks">("socratic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [intentObject, setIntentObject] = useState<IntentObject | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task creation state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskRouting, setTaskRouting] = useState<"ai" | "human" | "hybrid">("ai");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const tasksQ = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });

  const socratiqueQ = trpc.aiCeo.socratiqueQuestion.useMutation();
  const createTask = trpc.tasks.create.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task created"); } });
  const generatePrompt = trpc.tasks.generatePrompt.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Prompt generated"); } });
  const executeTask = trpc.tasks.executeTask.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      utils.poo.list.invalidate();
      utils.poo.summary.invalidate();
      utils.inbox.list.invalidate();
      toast.success(`Task executed! $${data.dollarValueCreated.toFixed(2)} value created`);
    },
    onError: (e) => toast.error(e.message),
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
      const result = await socratiqueQ.mutateAsync({ userInput: userMsg.content, conversationHistory: messages });
      setMessages([...newMessages, { role: "assistant", content: result.response }]);
      if (result.intentObject) {
        setIntentObject(result.intentObject as IntentObject);
        toast.success("Intent object structured — ready to deploy");
      }
    } catch (e) {
      toast.error("ARIA is unavailable. Try again.");
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="section-label mb-2">OPENCOMMAND</div>
        <div className="red-line mb-4" />
        <h1 className="text-display text-6xl text-foreground">INTENT ENGINE</h1>
        <p className="text-muted-foreground text-sm mt-2 font-mono">SOCRATIC QUESTIONING · STRUCTURED INTENT · AUTONOMOUS EXECUTION</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex border-b border-border mb-6">
        {[
          { id: "socratic" as const, label: "SOCRATIC ENGINE", icon: Cpu },
          { id: "tasks" as const, label: "TASK EXECUTION", icon: Play },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-2 px-5 py-3 font-condensed font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-px ${mode === m.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {/* Socratic Mode */}
      {mode === "socratic" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="brutal-card flex-1 flex flex-col" style={{ minHeight: "500px" }}>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent flex items-center justify-center">
                    <span className="font-condensed font-black text-foreground text-xs">AI</span>
                  </div>
                  <div>
                    <div className="font-condensed font-bold text-sm text-foreground">ARIA — SOCRATIC ENGINE</div>
                    <div className="section-label">INTENT STRUCTURING MODE</div>
                  </div>
                </div>
                <button onClick={() => { setMessages([]); setIntentObject(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "400px" }}>
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Cpu size={32} className="text-muted-foreground mx-auto mb-4" />
                    <div className="font-condensed font-bold text-lg text-muted-foreground mb-2">DESCRIBE YOUR GOAL</div>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">ARIA will ask clarifying questions to transform your vague idea into a precise, executable intent object.</p>
                    <div className="mt-6 space-y-2">
                      {["I want to grow my email list", "Help me close more sales", "Automate my content creation"].map(s => (
                        <button key={s} onClick={() => setInput(s)} className="block w-full text-left px-4 py-2 border border-border text-muted-foreground hover:border-accent hover:text-foreground font-mono text-xs transition-colors">
                          <ChevronRight size={10} className="inline mr-2" />{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-border p-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                      <span className="section-label">ARIA THINKING...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Describe your goal or answer ARIA's question..."
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

          {/* Intent Object Panel */}
          <div className="space-y-4">
            <div className="section-label">STRUCTURED INTENT OBJECT</div>
            {intentObject ? (
              <div className="brutal-border-red p-5 space-y-4">
                <div className="red-line-thin" />
                <div>
                  <div className="section-label mb-1">TITLE</div>
                  <div className="font-condensed font-bold text-lg text-foreground">{intentObject.title}</div>
                </div>
                <div>
                  <div className="section-label mb-1">GOAL</div>
                  <p className="text-muted-foreground text-sm">{intentObject.goal}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="section-label mb-1">ROUTING</div>
                    <span className="font-mono text-xs border border-border px-2 py-1 uppercase text-foreground">{intentObject.routingMode}</span>
                  </div>
                  <div>
                    <div className="section-label mb-1">PRIORITY</div>
                    <span className={`font-mono text-xs border px-2 py-1 uppercase ${intentObject.priority === "critical" ? "tag-missed" : intentObject.priority === "high" ? "tag-at-risk" : "tag-on-track"}`}>{intentObject.priority}</span>
                  </div>
                </div>
                <div>
                  <div className="section-label mb-2">SUCCESS CRITERIA</div>
                  <ul className="space-y-1">
                    {intentObject.successCriteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ChevronRight size={10} className="mt-0.5 text-accent flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="section-label">{intentObject.estimatedHours} HRS ESTIMATED</span>
                </div>
                <div className="red-line-thin" />
                <Button onClick={deployIntent} disabled={createTask.isPending} className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide">
                  <Zap size={14} className="mr-2" />
                  {createTask.isPending ? "DEPLOYING..." : "DEPLOY AS TASK"}
                </Button>
              </div>
            ) : (
              <div className="brutal-card p-6 text-center">
                <FileText size={24} className="text-muted-foreground mx-auto mb-3" />
                <div className="font-condensed font-bold text-sm text-muted-foreground">AWAITING INTENT</div>
                <p className="text-muted-foreground text-xs mt-2">Complete the Socratic dialogue to generate a structured intent object.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Execution Mode */}
      {mode === "tasks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">TASK QUEUE — {tasks.length}</div>
            </div>

            {/* Quick create */}
            <div className="brutal-card p-4 mb-4 space-y-3">
              <div className="section-label">QUICK CREATE</div>
              <input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full bg-input border border-border text-foreground font-sans text-sm px-3 py-2 focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={taskRouting} onValueChange={v => setTaskRouting(v as any)}>
                  <SelectTrigger className="bg-input border-border text-foreground text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ai" className="text-foreground text-xs">AI</SelectItem>
                    <SelectItem value="human" className="text-foreground text-xs">HUMAN</SelectItem>
                    <SelectItem value="hybrid" className="text-foreground text-xs">HYBRID</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskPriority} onValueChange={v => setTaskPriority(v as any)}>
                  <SelectTrigger className="bg-input border-border text-foreground text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low" className="text-foreground text-xs">LOW</SelectItem>
                    <SelectItem value="medium" className="text-foreground text-xs">MEDIUM</SelectItem>
                    <SelectItem value="high" className="text-foreground text-xs">HIGH</SelectItem>
                    <SelectItem value="critical" className="text-foreground text-xs">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createTask.mutate({ title: taskTitle, routingMode: taskRouting, priority: taskPriority })}
                disabled={!taskTitle.trim() || createTask.isPending}
                size="sm"
                className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase text-xs"
              >
                CREATE TASK
              </Button>
            </div>

            {/* Task list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.map(task => {
                const statusColors: Record<string, string> = { pending: "text-muted-foreground", in_progress: "text-[oklch(0.82_0.18_90)]", completed: "text-[oklch(0.65_0.18_142)]", failed: "text-accent", awaiting_human: "text-[oklch(0.62_0.18_240)]" };
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left brutal-card-hover p-3 transition-colors ${selectedTaskId === task.id ? "brutal-border-red" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-xs uppercase ${statusColors[task.status]}`}>{task.status.replace("_", " ")}</span>
                      <span className="section-label">{task.routingMode.toUpperCase()}</span>
                    </div>
                    <div className="font-condensed font-bold text-sm text-foreground truncate">{task.title}</div>
                  </button>
                );
              })}
              {tasks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground font-mono text-xs">NO TASKS IN QUEUE</div>
              )}
            </div>
          </div>

          {/* Task Detail */}
          <div className="lg:col-span-2">
            {selectedTask ? (
              <div className="brutal-card p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="section-label mb-1">TASK DETAIL</div>
                    <h2 className="font-condensed font-black text-2xl text-foreground">{selectedTask.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-xs border border-border px-2 py-1 uppercase text-muted-foreground">{selectedTask.routingMode}</span>
                    <span className={`font-mono text-xs border px-2 py-1 uppercase ${selectedTask.priority === "critical" ? "tag-missed" : selectedTask.priority === "high" ? "tag-at-risk" : "tag-on-track"}`}>{selectedTask.priority}</span>
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <div className="section-label mb-2">DESCRIPTION</div>
                    <p className="text-muted-foreground text-sm">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.generatedPrompt && (
                  <div>
                    <div className="section-label mb-2">GENERATED EXECUTION PROMPT</div>
                    <div className="bg-input border border-border p-4 font-mono text-xs text-muted-foreground leading-relaxed max-h-48 overflow-y-auto">
                      {selectedTask.generatedPrompt}
                    </div>
                  </div>
                )}

                {selectedTask.executionLog && Array.isArray(selectedTask.executionLog) && selectedTask.executionLog.length > 0 && (
                  <div>
                    <div className="section-label mb-2">EXECUTION LOG</div>
                    <div className="space-y-1">
                      {(selectedTask.executionLog as string[]).map((step, i) => (
                        <div key={i} className="flex items-start gap-2 font-mono text-xs text-muted-foreground">
                          <span className="text-accent">[{String(i + 1).padStart(2, "0")}]</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="red-line-thin" />

                <div className="flex gap-3">
                  {selectedTask.status === "pending" && (
                    <Button
                      onClick={() => generatePrompt.mutate({ taskId: selectedTask.id })}
                      disabled={generatePrompt.isPending}
                      variant="outline"
                      className="border-border text-foreground hover:bg-secondary font-condensed font-bold uppercase text-xs gap-2"
                    >
                      <FileText size={13} />
                      {generatePrompt.isPending && generatePrompt.variables?.taskId === selectedTask.id ? "GENERATING..." : "GENERATE PROMPT"}
                    </Button>
                  )}
                  {(selectedTask.status === "pending" || selectedTask.status === "in_progress") && (
                    <Button
                      onClick={() => executeTask.mutate({ taskId: selectedTask.id })}
                      disabled={executeTask.isPending}
                      className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase text-xs gap-2 glow-red"
                    >
                      <Play size={13} />
                      {executeTask.isPending && executeTask.variables?.taskId === selectedTask.id ? "EXECUTING..." : "EXECUTE TASK"}
                    </Button>
                  )}
                  {selectedTask.status === "completed" && (
                    <div className="flex items-center gap-2 text-[oklch(0.65_0.18_142)]">
                      <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)]" />
                      <span className="font-condensed font-bold text-sm uppercase">TASK COMPLETED — PoO RECEIPT ISSUED</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="brutal-card p-12 text-center">
                <Play size={32} className="text-muted-foreground mx-auto mb-4" />
                <div className="font-condensed font-bold text-xl text-muted-foreground">SELECT A TASK</div>
                <p className="text-muted-foreground text-sm mt-2">Choose a task from the queue to view details and execute.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
