import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, Loader2, ArrowRight, Bot, User, Zap,
  Menu, RotateCcw, History, FileText, Mic, MicOff, ChevronDown,
  Layers, Monitor, Play, SkipForward, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { MODEL_REGISTRY } from "@shared/modelRegistry";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ═══════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */

type ViewMode = "interview" | "canvas";
type ChatMessage = { role: string; content: string; timestamp: string };

/* ═══════════════════════════════════════════════════════════════════════ */
/*  CUSTOM NODES                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

function AgentNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-accent/40 bg-card px-4 py-3 min-w-[160px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
          <Bot size={11} className="text-accent" />
        </div>
        <span className="text-xs font-semibold text-foreground">{(data as any).label}</span>
      </div>
      {(data as any).model && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{(data as any).model}</Badge>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

function WorkflowNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-blue-400/40 bg-card px-4 py-3 min-w-[160px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <Play size={11} className="text-blue-400" />
        <span className="text-xs font-semibold text-foreground">{(data as any).label}</span>
      </div>
      {(data as any).description && (
        <p className="text-[10px] text-muted-foreground mt-1">{(data as any).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
}

function GoalNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-amber-400/40 bg-card px-4 py-3 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Zap size={11} className="text-amber-400" />
        <span className="text-xs font-semibold text-foreground">{(data as any).label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2 !h-2" />
    </div>
  );
}

function GuardrailNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-red-400/40 bg-card px-4 py-3 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-[10px] font-bold">⛔</span>
        <span className="text-xs font-semibold text-foreground">{(data as any).label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-red-400 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  workflow: WorkflowNode,
  goal: GoalNode,
  guardrail: GuardrailNode,
};

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */

// Available models for the dropdown — pulled from shared registry
const SIGMA_AUTO = { id: "auto", name: "Σ Auto", provider: "anthropic" as const, tier: "premium" as const, strengths: "Best model selected automatically for each task" };
const MODELS = [SIGMA_AUTO, ...MODEL_REGISTRY];

export default function IntentEngine() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { track } = useAnalytics();

  // View state
  const [mode, setMode] = useState<ViewMode>("interview");

  // Model selection
  const [selectedModel, setSelectedModel] = useState<typeof MODELS[number]>(MODELS[0]);

  // Interview state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [blueprintId, setBlueprintId] = useState<number | null>(null);
  const [blueprintName, setBlueprintName] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // tRPC
  const startSession = trpc.blueprintEngine.startSession.useMutation();
  const sendMessage = trpc.blueprintEngine.sendMessage.useMutation();
  const generateBlueprint = trpc.blueprintEngine.generateBlueprint.useMutation();
  const transcribeAudio = trpc.blueprintEngine.transcribeVoice.useMutation();
  const skipQuestion = trpc.blueprintEngine.skipQuestion.useMutation();
  const finishInterview = trpc.blueprintEngine.finishInterview.useMutation();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start session on mount
  useEffect(() => {
    if (!sessionId && user) {
      startSession.mutateAsync({}).then((res) => {
        setSessionId(res.sessionId);
        setMessages(res.messages as ChatMessage[]);
      });
    }
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await sendMessage.mutateAsync({ sessionId, message: input.trim() });
      const assistantMsg = res.message as ChatMessage;
      setMessages(prev => [...prev, assistantMsg]);
      setCompletionPercent(res.completionPercent);
      setIsReadyToGenerate(res.isReadyToGenerate);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    try {
      const res = await skipQuestion.mutateAsync({ sessionId });
      setMessages(prev => [...prev, res.message as ChatMessage]);
      setCompletionPercent(res.completionPercent);
    } catch {
      toast.error("Couldn't skip — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    try {
      const res = await finishInterview.mutateAsync({ sessionId });
      setMessages(prev => [...prev, res.message as ChatMessage]);
      setCompletionPercent(res.completionPercent);
      setIsReadyToGenerate(res.isReadyToGenerate);
    } catch {
      toast.error("Couldn't finish — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sessionId) return;
    setIsGenerating(true);

    try {
      const res = await generateBlueprint.mutateAsync({ sessionId });
      setBlueprintId(res.blueprintId);
      setBlueprintName((res as any).name || res.title || "Untitled Blueprint");
      track("intent_engine", "blueprint_generated", { blueprintId: res.blueprintId });

      // Convert blueprint data to React Flow nodes/edges
      const generatedNodes: Node[] = [];
      const generatedEdges: Edge[] = [];

      // Parse agents
      const agents = (res as any).agents || [];
      agents.forEach((agent: any, i: number) => {
        generatedNodes.push({
          id: `agent-${i}`,
          type: "agent",
          position: { x: 200 + i * 220, y: 100 },
          data: { label: agent.name || agent.role || `Agent ${i + 1}`, model: agent.model },
        });
      });

      // Parse workflows
      const workflows = (res as any).workflows || [];
      workflows.forEach((wf: any, i: number) => {
        generatedNodes.push({
          id: `workflow-${i}`,
          type: "workflow",
          position: { x: 200 + i * 220, y: 280 },
          data: { label: wf.name || `Workflow ${i + 1}`, description: wf.description },
        });
        // Connect agents to workflows
        if (agents[i]) {
          generatedEdges.push({
            id: `e-agent${i}-wf${i}`,
            source: `agent-${i}`,
            target: `workflow-${i}`,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "oklch(0.72 0.12 250)" },
          });
        }
      });

      // Parse goals
      const goals = (res as any).goals || [];
      goals.forEach((goal: any, i: number) => {
        generatedNodes.push({
          id: `goal-${i}`,
          type: "goal",
          position: { x: 200 + i * 200, y: 460 },
          data: { label: goal.name || goal.title || `Goal ${i + 1}` },
        });
      });

      // Parse guardrails
      const guardrails = (res as any).guardrails || [];
      guardrails.forEach((gr: any, i: number) => {
        generatedNodes.push({
          id: `guardrail-${i}`,
          type: "guardrail",
          position: { x: 700 + i * 180, y: 100 + i * 80 },
          data: { label: gr.name || gr.rule || `Guardrail ${i + 1}` },
        });
      });

      // If no structured data, create a placeholder layout
      if (generatedNodes.length === 0) {
        generatedNodes.push(
          { id: "agent-0", type: "agent", position: { x: 300, y: 80 }, data: { label: "Primary Agent", model: "auto" } },
          { id: "workflow-0", type: "workflow", position: { x: 300, y: 240 }, data: { label: "Main Workflow", description: "Generated from interview" } },
          { id: "goal-0", type: "goal", position: { x: 300, y: 400 }, data: { label: "Primary Goal" } },
        );
        generatedEdges.push(
          { id: "e-0", source: "agent-0", target: "workflow-0", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "oklch(0.72 0.12 250)" } },
          { id: "e-1", source: "workflow-0", target: "goal-0", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "oklch(0.72 0.12 250)" } },
        );
      }

      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setMode("canvas");
      toast.success("Blueprint generated — now editable on canvas");
    } catch {
      setIsGenerating(false);
      setMessages(prev => [...prev, { role: "assistant", content: "Generation failed. Let me ask a few more questions.", timestamp: new Date().toISOString() }]);
      setIsReadyToGenerate(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Voice recording ──────────────────────────────────────────────────
  const handleVoiceToggle = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // too short

        setIsTranscribing(true);
        try {
          // Upload audio to S3 then transcribe
          const formData = new FormData();
          formData.append("file", blob, "voice.webm");
          const uploadRes = await fetch("/api/upload-audio", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json() as { url: string };
          const result = await transcribeAudio.mutateAsync({ audioUrl: url });
          if (result.text) {
            setInput(prev => prev ? prev + " " + result.text : result.text);
            toast.success("Voice transcribed");
          }
        } catch {
          toast.error("Transcription failed — please try again");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const handleOpenInFullBuilder = () => {
    if (blueprintId) navigate(`/blueprints/${blueprintId}/builder`);
  };

  /* ─── INTERVIEW VIEW ─────────────────────────────────────────────── */
  if (mode === "interview") {
    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Header — matches mockup: menu | Σ Intent Engine + model dropdown | actions */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Hamburger menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                  <Menu size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => { setSessionId(null); setMessages([]); setCompletionPercent(0); setIsReadyToGenerate(false); startSession.mutateAsync({}).then((res) => { setSessionId(res.sessionId); setMessages(res.messages as ChatMessage[]); }); }}>
                  <RotateCcw size={13} className="mr-2" /> New Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/blueprints")}>
                  <FileText size={13} className="mr-2" /> My Blueprints
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info("Session history coming soon")}>
                  <History size={13} className="mr-2" /> Session History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Model selector dropdown — "Σ Intent Engine ▾" */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-foreground hover:text-foreground/80 transition-colors">
                  <span className="text-accent font-bold text-base">Σ</span>
                  <span className="font-semibold text-sm tracking-tight">
                    {selectedModel.id === "auto" ? "Intent Engine" : (selectedModel as any).name}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Model</DropdownMenuLabel>
                {MODELS.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className={`flex items-start gap-2 py-2 ${selectedModel.id === m.id ? "bg-accent/10" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {m.id === "auto" ? "Σ Auto" : (m as any).name}
                        </span>
                        {m.id !== "auto" && (
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                            (m as any).tier === "premium" ? "bg-yellow-500/20 text-yellow-400" :
                            (m as any).tier === "standard" ? "bg-blue-500/20 text-blue-400" :
                            "bg-muted text-muted-foreground"
                          }`}>{(m as any).tier}</span>
                        )}
                        {selectedModel.id === m.id && <span className="ml-auto text-accent text-[10px]">✓</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.strengths}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {completionPercent > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${completionPercent}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{completionPercent}%</span>
              </div>
            )}
            {isReadyToGenerate && !isGenerating && (
              <Button onClick={handleGenerate} size="sm" className="gap-1.5 bg-accent hover:bg-accent/80 text-white h-8 text-xs">
                <Zap size={11} /> Generate
              </Button>
            )}
            {isGenerating && (
              <Button disabled size="sm" className="gap-1.5 h-8 text-xs">
                <Loader2 size={11} className="animate-spin" /> Generating...
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-accent text-[10px] font-bold">Σ</span>
                </div>
              )}
              <div className={`max-w-[70%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-muted/50 border border-border text-foreground"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-md bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={11} className="text-foreground/70" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                <span className="text-accent text-[10px] font-bold">Σ</span>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Generation CTA */}
          {isReadyToGenerate && !isGenerating && (
            <Card className="p-4 border-accent/30 bg-accent/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready to generate</p>
                    <p className="text-xs text-muted-foreground">I have enough context to build your blueprint.</p>
                  </div>
                </div>
                <Button onClick={handleGenerate} size="sm" className="gap-1.5 bg-accent hover:bg-accent/80 text-white">
                  Generate <ArrowRight size={12} />
                </Button>
              </div>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input — mockup-style bottom bar */}
        <div className="border-t border-border px-4 py-3 shrink-0">
          {/* Socratic UX controls — only visible during active interview, not when ready to generate */}
          {messages.length > 1 && !isReadyToGenerate && !isGenerating && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <SkipForward size={11} />
                New question
              </button>
              <button
                onClick={handleFinish}
                disabled={isLoading}
                className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-accent/50 text-xs text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCheck size={11} />
                Finish
              </button>
            </div>
          )}
          <div className="bg-muted/30 border border-border rounded-2xl px-4 pt-3 pb-2">
            {/* Text input */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={messages.length <= 1 ? "Message Σ..." : "Answer Σ's question..."}
              className="min-h-[36px] max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-muted-foreground/60"
              rows={1}
            />
            {/* Bottom action row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {/* + button */}
                <button className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                  <span className="text-base leading-none">+</span>
                </button>
                {/* Blueprint chip */}
                <button
                  onClick={() => navigate("/blueprints/new/builder")}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Layers size={11} />
                  Blueprint
                </button>
                {/* Visual builder chip */}
                <button
                  onClick={() => navigate("/blueprints/new/builder")}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors hidden sm:flex"
                >
                  <Monitor size={11} />
                  Builder
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Voice button */}
                <button
                  onClick={handleVoiceToggle}
                  disabled={isTranscribing}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    isRecording
                      ? "bg-red-500/20 text-red-400 animate-pulse"
                      : isTranscribing
                      ? "text-muted-foreground cursor-wait"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    input.trim() && !isLoading
                      ? "bg-accent text-white hover:bg-accent/80"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CANVAS VIEW ────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Canvas header */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode("interview")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to interview
          </button>
          <div className="w-px h-4 bg-border" />
          <h2 className="text-sm font-semibold text-foreground">{blueprintName || "Blueprint Canvas"}</h2>
          <Badge variant="outline" className="text-[9px]">Editable</Badge>
        </div>
        <div className="flex items-center gap-2">
          {blueprintId && (
            <Button onClick={handleOpenInFullBuilder} variant="outline" size="sm" className="gap-1.5 text-xs">
              Open Full Builder <ArrowRight size={10} />
            </Button>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="oklch(0.25 0 0)" gap={20} size={1} />
          <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-card !border-border !rounded-lg"
            nodeColor="oklch(0.72 0.12 250)"
            maskColor="oklch(0.05 0 0 / 0.7)"
          />
          <Panel position="top-left" className="!m-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-accent" /> Agent</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-blue-400" /> Workflow</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-400" /> Goal</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-400" /> Guardrail</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
