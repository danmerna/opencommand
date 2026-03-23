import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot, CheckCircle2, Loader2, ArrowRight, Sparkles,
  Send, Building2, Users, Brain, ChevronRight,
} from "lucide-react";
import { Streamdown } from "streamdown";

type Message = { role: "user" | "assistant"; content: string };

type OnboardingStep =
  | "welcome"
  | "company-setup"
  | "creating-agents"
  | "onboarding-ceo"
  | "onboarding-cto"
  | "onboarding-cmo"
  | "onboarding-cfo"
  | "generating-strategy"
  | "strategy-reveal"
  | "complete";

const EXEC_AGENTS = [
  { type: "ceo", name: "Arch — AI CEO", roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"], color: "text-amber-400", icon: "👑" },
  { type: "cto", name: "SAGE — CTO", roleTitle: "Chief Technology Officer", description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"], tools: ["github", "jira", "datadog"], color: "text-blue-400", icon: "⚡" },
  { type: "cmo", name: "NOVA — CMO", roleTitle: "Chief Marketing Officer", description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"], tools: ["mailchimp", "analytics", "social-scheduler"], color: "text-purple-400", icon: "✦" },
  { type: "cfo", name: "CFO", roleTitle: "Chief Financial Officer", description: "Financial intelligence agent managing budget, runway, and fiscal strategy.", capabilities: ["financial-modeling", "budget-tracking", "revenue-analysis", "risk-assessment"], tools: ["stripe", "quickbooks", "analytics"], color: "text-emerald-400", icon: "◈" },
];

const ONBOARDING_ORDER: OnboardingStep[] = ["onboarding-ceo", "onboarding-cto", "onboarding-cmo", "onboarding-cfo"];
const STEP_TO_TYPE: Record<string, string> = {
  "onboarding-ceo": "ceo",
  "onboarding-cto": "cto",
  "onboarding-cmo": "cmo",
  "onboarding-cfo": "cfo",
};

export default function ProOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [companyName, setCompanyName] = useState("");
  const [companyMission, setCompanyMission] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [createdAgents, setCreatedAgents] = useState<{ id: number; type: string }[]>([]);
  const [creatingProgress, setCreatingProgress] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onboardingId, setOnboardingId] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [strategy, setStrategy] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Mutations
  const createCompanyMut = trpc.companies.create.useMutation();
  const createAgentMut = trpc.agents.create.useMutation();
  const startOnboardingMut = trpc.onboarding.start.useMutation();
  const respondMut = trpc.onboarding.respond.useMutation();
  const generateStrategyMut = trpc.onboarding.generateStrategy.useMutation();

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleCompanySetup() {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    try {
      await createCompanyMut.mutateAsync({ name: companyName.trim(), mission: companyMission.trim() || undefined, industry: companyIndustry.trim() || undefined });
      await utils.companies.list.invalidate();
      const companies = await utils.companies.list.fetch();
      const company = companies[0];
      if (!company) throw new Error("Company not created");
      setCompanyId(company.id);
      setStep("creating-agents");
      await createAllAgents(company.id);
    } catch (err: any) {
      toast.error("Failed to set up company", { description: err.message });
    }
  }

  async function createAllAgents(cId: number) {
    const created: { id: number; type: string }[] = [];
    for (const agent of EXEC_AGENTS) {
      setCreatingProgress(p => [...p, agent.type]);
      try {
        const result = await createAgentMut.mutateAsync({
          name: agent.name,
          type: agent.type as any,
          roleTitle: agent.roleTitle,
          description: agent.description,
          capabilities: agent.capabilities,
          tools: agent.tools,
          companyId: cId,
        });
        // Fetch agents to get the new IDs
        await utils.agents.list.invalidate();
        const agents = await utils.agents.list.fetch();
        const found = agents.find((a: any) => a.type === agent.type && a.companyId === cId);
        if (found) created.push({ id: found.id, type: agent.type });
        await new Promise(r => setTimeout(r, 400)); // Stagger for visual effect
      } catch (err: any) {
        toast.error(`Failed to create ${agent.name}`, { description: err.message });
      }
    }
    setCreatedAgents(created);
    // Move to first onboarding step
    await new Promise(r => setTimeout(r, 800));
    await startAgentOnboarding("onboarding-ceo", created);
  }

  async function startAgentOnboarding(onboardStep: OnboardingStep, agents: { id: number; type: string }[]) {
    const agentType = STEP_TO_TYPE[onboardStep];
    const agent = agents.find(a => a.type === agentType);
    if (!agent) {
      toast.error(`Could not find ${agentType} agent`);
      return;
    }
    setCurrentAgentId(agent.id);
    setMessages([]);
    setOnboardingId(null);
    setIsOnboardingComplete(false);
    setStep(onboardStep);
    try {
      const data = await startOnboardingMut.mutateAsync({ agentId: agent.id });
      setOnboardingId(data.onboardingId);
      if (data.firstQuestion) {
        setMessages([{ role: "assistant", content: data.firstQuestion }]);
      }
    } catch (err: any) {
      toast.error("Failed to start onboarding", { description: err.message });
    }
  }

  async function handleSend() {
    if (!input.trim() || !onboardingId || isSending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);
    try {
      const data = await respondMut.mutateAsync({ onboardingId, answer: userMsg });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.isComplete) {
        setIsOnboardingComplete(true);
      }
    } catch (err: any) {
      toast.error("Failed to send response", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleNextAgent() {
    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    const nextStep = ONBOARDING_ORDER[currentIdx + 1];
    if (nextStep) {
      await startAgentOnboarding(nextStep, createdAgents);
    } else {
      // All agents onboarded — generate strategy
      await handleGenerateStrategy();
    }
  }

  async function handleGenerateStrategy() {
    if (!companyId) return;
    setStep("generating-strategy");
    try {
      const data = await generateStrategyMut.mutateAsync({ companyId });
      setStrategy(data.strategy ?? "");
      setStep("strategy-reveal");
    } catch (err: any) {
      toast.error("Failed to generate strategy", { description: err.message });
      setStep("strategy-reveal");
    }
  }

  function handleLaunch() {
    setStep("complete");
    setTimeout(() => navigate("/mission-control"), 1200);
  }

  const currentExecIndex = ONBOARDING_ORDER.indexOf(step);
  const currentExec = EXEC_AGENTS[currentExecIndex] ?? null;

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <Sparkles size={11} className="text-amber-400" />
            Pro Plan Activated
          </div>
          <h1 className="text-4xl font-light text-foreground tracking-tight mb-4">
            Welcome to<br /><span className="text-foreground font-normal">IntelligenceOS</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-10 max-w-md mx-auto">
            You are about to build your executive team. We will create your C-suite agents, onboard each one with your company context, and generate your first combined strategic plan.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-10 max-w-sm mx-auto text-left">
            {EXEC_AGENTS.map(a => (
              <div key={a.type} className="flex items-center gap-2.5 border border-border rounded-lg p-3">
                <span className="text-base">{a.icon}</span>
                <div>
                  <p className={`text-xs font-medium ${a.color}`}>{a.roleTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{a.name.split("—")[0].trim()}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="h-11 px-8 gap-2" onClick={() => setStep("company-setup")}>
            Begin Setup <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    );
  }

  // ── COMPANY SETUP ────────────────────────────────────────────────────────
  if (step === "company-setup") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-8">
            <Building2 size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Company Setup</span>
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">Tell us about your company</h2>
          <p className="text-muted-foreground text-sm mb-8">Your executive agents will use this context to onboard and generate your strategy.</p>
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company Name *</label>
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-11"
                onKeyDown={e => e.key === "Enter" && handleCompanySetup()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Mission / What problem are you solving?</label>
              <Textarea
                value={companyMission}
                onChange={e => setCompanyMission(e.target.value)}
                placeholder="e.g. We help operators automate complex workflows using AI orchestration..."
                className="resize-none min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Industry</label>
              <Input
                value={companyIndustry}
                onChange={e => setCompanyIndustry(e.target.value)}
                placeholder="e.g. AI / SaaS"
                className="h-11"
              />
            </div>
          </div>
          <Button
            className="w-full h-11 gap-2"
            onClick={handleCompanySetup}
            disabled={createCompanyMut.isPending || !companyName.trim()}
          >
            {createCompanyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Create Executive Team
          </Button>
        </div>
      </div>
    );
  }

  // ── CREATING AGENTS ──────────────────────────────────────────────────────
  if (step === "creating-agents") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto mb-6" />
          <h2 className="text-xl font-light text-foreground mb-2">Assembling your executive team</h2>
          <p className="text-muted-foreground text-xs mb-8">Creating and initializing each C-suite agent...</p>
          <div className="space-y-3">
            {EXEC_AGENTS.map(a => {
              const isDone = creatingProgress.includes(a.type);
              return (
                <div key={a.type} className="flex items-center gap-3 border border-border rounded-lg p-3 text-left">
                  <span className="text-base">{a.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.roleTitle}</p>
                  </div>
                  {isDone
                    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    : <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARDING INTERVIEWS ────────────────────────────────────────────────
  if (ONBOARDING_ORDER.includes(step) && currentExec) {
    const completedCount = ONBOARDING_ORDER.indexOf(step);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">{currentExec.icon}</span>
            <div>
              <p className={`text-sm font-medium ${currentExec.color}`}>{currentExec.name}</p>
              <p className="text-xs text-muted-foreground">{currentExec.roleTitle} Onboarding</p>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {EXEC_AGENTS.map((a, i) => (
              <div
                key={a.type}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < completedCount ? "bg-emerald-400" :
                  i === completedCount ? "bg-foreground scale-125" :
                  "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                msg.role === "assistant" ? "bg-foreground/10 border border-border" : "bg-foreground text-background"
              }`}>
                {msg.role === "assistant" ? currentExec.icon : "You"}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-card border border-border text-foreground"
                  : "bg-foreground text-background"
              }`}>
                {msg.role === "assistant"
                  ? <Streamdown>{msg.content}</Streamdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-foreground font-medium">{currentExec.name} is fully onboarded.</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {completedCount < EXEC_AGENTS.length - 1
                  ? `Moving on to ${EXEC_AGENTS[completedCount + 1]?.name}...`
                  : "All executives onboarded. Ready to generate your strategy."}
              </p>
              <Button className="gap-2 mt-2" onClick={handleNextAgent}>
                {completedCount < EXEC_AGENTS.length - 1
                  ? <>Next: {EXEC_AGENTS[completedCount + 1]?.name} <ChevronRight size={14} /></>
                  : <>Generate Strategy <Sparkles size={14} /></>
                }
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        {!isOnboardingComplete && (
          <div className="border-t border-border px-6 py-4 shrink-0">
            <div className="max-w-2xl mx-auto flex gap-3">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Reply to ${currentExec.name.split("—")[0].trim()}...`}
                className="h-11 flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isSending || messages.length === 0}
              />
              <Button
                className="h-11 w-11 p-0 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isSending || messages.length === 0}
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GENERATING STRATEGY ──────────────────────────────────────────────────
  if (step === "generating-strategy") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <Brain size={28} className="text-foreground mx-auto mb-6 animate-pulse" />
          <h2 className="text-xl font-light text-foreground mb-2">Synthesizing executive intelligence</h2>
          <p className="text-muted-foreground text-xs mb-8">
            Arch is combining insights from all {EXEC_AGENTS.length} executives to generate your combined strategic plan...
          </p>
          <div className="space-y-2">
            {["Gathering executive context", "Identifying strategic priorities", "Aligning OKRs and resources", "Drafting combined strategy"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={10} className="animate-spin shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── STRATEGY REVEAL ──────────────────────────────────────────────────────
  if (step === "strategy-reveal") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm text-foreground">Combined Strategy — {companyName}</span>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px]">
            Generated by IntelligenceOS
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full">
          {strategy ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <Streamdown>{strategy}</Streamdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Strategy generation encountered an issue. You can generate it manually from Mission Control.</p>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Your strategy is saved to Mission Control.</p>
            <Button className="gap-2 h-10" onClick={handleLaunch}>
              Launch Mission Control <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────────
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-light text-foreground mb-2">Launching Mission Control...</h2>
          <p className="text-xs text-muted-foreground">Your executive team is ready.</p>
        </div>
      </div>
    );
  }

  return null;
}
