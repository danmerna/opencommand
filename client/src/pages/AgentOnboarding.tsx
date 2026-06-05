import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Send, Bot, User, CheckCircle2, Loader2, Sparkles,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function AgentOnboarding() {
  const { agentId } = useParams<{ agentId: string }>();
  const [, navigate] = useLocation();
  const numericId = agentId ? parseInt(agentId, 10) : NaN;
  const validId = !isNaN(numericId) && numericId > 0;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onboardingId, setOnboardingId] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch agent info
  const agentQ = trpc.agents.list.useQuery();
  const agent = agentQ.data?.find((a: any) => a.id === numericId);

  // Fetch existing onboarding — only run when we have a valid numeric id
  const existingQ = trpc.onboarding.getForAgent.useQuery(
    { agentId: numericId },
    { enabled: validId }
  );

  // Start mutation
  const startMut = trpc.onboarding.start.useMutation({
    onSuccess: (data) => {
      setOnboardingId(data.onboardingId);
      setStarted(true);
      if (data.resumed && existingQ.data?.conversationHistory) {
        const history = existingQ.data.conversationHistory as Message[];
        setMessages(history);
      } else if (data.firstQuestion) {
        setMessages([{ role: "assistant", content: data.firstQuestion }]);
      }
      setIsStarting(false);
    },
    onError: (err) => {
      toast.error("Failed to start onboarding", { description: err.message });
      setIsStarting(false);
    },
  });

  // Respond mutation
  const respondMut = trpc.onboarding.respond.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.isComplete) {
        setIsComplete(true);
        toast.success("Onboarding complete!", { description: `${agent?.name ?? "Agent"} now has full context.` });
      }
    },
    onError: (err) => {
      toast.error("Failed to send response", { description: err.message });
    },
  });

  // Auto-resume if onboarding exists
  useEffect(() => {
    if (existingQ.data && !started) {
      if (existingQ.data.status === "completed") {
        setIsComplete(true);
        setStarted(true);
        const history = (existingQ.data.conversationHistory as Message[]) ?? [];
        setMessages(history);
        setOnboardingId(existingQ.data.id);
      } else if (existingQ.data.status === "in_progress") {
        setOnboardingId(existingQ.data.id);
        setStarted(true);
        const history = (existingQ.data.conversationHistory as Message[]) ?? [];
        setMessages(history);
      }
    }
  }, [existingQ.data, started]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleStart = () => {
    if (!validId) {
      navigate("/mission-control");
      return;
    }
    setIsStarting(true);
    startMut.mutate({ agentId: numericId });
  };

  const handleSend = () => {
    if (!input.trim() || !onboardingId || respondMut.isPending) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    respondMut.mutate({ onboardingId, answer: userMsg });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleColors: Record<string, string> = {
    ceo: "text-amber-400",
    cto: "text-blue-400",
    cmo: "text-pink-400",
    cfo: "text-accent",
    vp: "text-purple-400",
  };

  const agentColor = roleColors[agent?.type ?? ""] ?? "text-foreground";
  const questionCount = messages.filter(m => m.role === "assistant").length;
  const answerCount = messages.filter(m => m.role === "user").length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mission-control")}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium text-foreground">Onboarding</h1>
              {agent && <span className={`text-sm font-medium ${agentColor}`}>{agent.name}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {isComplete
                ? "Onboarding complete — context established"
                : started
                  ? `Question ${questionCount} · ${answerCount} answers given`
                  : "Establish baseline context for this agent"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <Badge className="bg-accent/20 text-accent border-accent/30">
              <CheckCircle2 size={12} className="mr-1" /> Onboarded
            </Badge>
          )}
          {started && !isComplete && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
              <Sparkles size={12} className="mr-1" /> In Progress
            </Badge>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {!started && !isComplete && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Bot size={28} className={agentColor} />
            </div>
            <div>
              <h2 className="text-xl font-medium text-foreground mb-2">
                Onboard {agent?.name ?? "Agent"}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This guided interview will establish the baseline context {agent?.name ?? "this agent"} needs
                to operate effectively. You'll answer 5-8 focused questions about your{" "}
                {agent?.type === "ceo" ? "company vision, strategy, and priorities" :
                 agent?.type === "cto" ? "tech stack, architecture, and engineering roadmap" :
                 agent?.type === "cmo" ? "brand, audience, and marketing strategy" :
                 agent?.type === "cfo" ? "financial model, runway, and fiscal priorities" :
                 "functional area and operational priorities"}.
              </p>
              <p className="text-muted-foreground text-xs mt-3">
                This only needs to be done once. You can refine the context later through the agent's strategy engine.
              </p>
            </div>
            <Button onClick={handleStart} disabled={isStarting} className="gap-2">
              {isStarting ? <><Loader2 size={14} className="animate-spin" /> Starting...</> : <><Sparkles size={14} /> Begin Onboarding</>}
            </Button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className={agentColor} />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-foreground/10 text-foreground"
                : "bg-zinc-800/50 text-foreground border border-border"
            }`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-foreground" />
              </div>
            )}
          </div>
        ))}

        {respondMut.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className={agentColor} />
            </div>
            <div className="bg-zinc-800/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin inline mr-2" />
              Thinking...
            </div>
          </div>
        )}

        {isComplete && messages.length > 0 && (
          <div className="border border-accent/20 rounded-xl p-5 bg-accent/5 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent">Onboarding Complete</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent?.name ?? "This agent"} now has the baseline context needed to operate. The context is stored permanently and will inform all future decisions and task execution.
            </p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => navigate("/mission-control")}>
                Back to Mission Control
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {started && !isComplete && (
        <div className="border-t border-border px-6 py-4 flex-shrink-0">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              rows={2}
              className="resize-none text-sm"
              disabled={respondMut.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || respondMut.isPending}
              className="flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
