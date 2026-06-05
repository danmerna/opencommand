import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Save,
  ArrowLeft,
  Bot,
  GitBranch,
  Target,
  Shield,
  Wrench,
  CheckCircle2,
  Loader2,
  Copy,
  Pencil,
  Cpu,
  Zap,
  DollarSign,
  Info,
  Flag,
  Phone,
  Mail,
  Eye,
  Upload,
  Bell,
  Webhook,
  Users,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  MODEL_REGISTRY,
  ROLE_DEFAULTS,
  getModelById,
  getTierColor,
  getProviderColor,
  estimateCost,
  type WorkflowRole,
  type ModelDefinition,
} from "@shared/modelRegistry";

// ─── Types ──────────────────────────────────────────────────────────────────

type CheckpointInterfaceType =
  | "notification_swipe"
  | "voice_call"
  | "file_watch"
  | "email_approval"
  | "dashboard_review"
  | "webhook_signal";

const INTERFACE_ICONS: Record<CheckpointInterfaceType, typeof Bell> = {
  notification_swipe: Bell,
  voice_call: Phone,
  email_approval: Mail,
  dashboard_review: Eye,
  file_watch: Upload,
  webhook_signal: Webhook,
};

const INTERFACE_LABELS: Record<CheckpointInterfaceType, string> = {
  notification_swipe: "Notification Swipe",
  voice_call: "Voice Call",
  email_approval: "Email Approval",
  dashboard_review: "Dashboard Review",
  file_watch: "File Watch",
  webhook_signal: "Webhook Signal",
};

// ─── Model Badge (shown on agent nodes) ─────────────────────────────────────

function ModelBadge({ modelId }: { modelId?: string }) {
  if (!modelId) return null;
  const model = getModelById(modelId);
  if (!model) return null;

  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 h-4 gap-0.5 ${getTierColor(model.tier)}`}
    >
      <Cpu className="w-2 h-2" />
      {model.name.split(" ").slice(-2).join(" ")}
    </Badge>
  );
}

// ─── Custom Node Types ──────────────────────────────────────────────────────

function AgentNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  const verifierModel = getModelById((data.verifierModelId as string) || "");
  const councilOn = Boolean(data.verifierCouncil);
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[200px] max-w-[280px] transition-all ${
        selected ? "border-blue-500 shadow-blue-500/20" : "border-border/60"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono text-white"
          style={{ backgroundColor: (data.color as string) || "#3b82f6" }}
        >
          {(data.label as string)?.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {data.label as string}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {data.role as string}
          </p>
        </div>
      </div>
      {data.mission ? (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {String(data.mission)}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ModelBadge modelId={data.modelId as string} />
        {data.workflowRole ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400">
            {String(data.workflowRole).replace("_", " ")}
          </Badge>
        ) : null}
        {/* Verification badge — always shown, required per agent */}
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 h-4 gap-0.5 ${
            councilOn
              ? "border-yellow-500/50 text-yellow-400 bg-yellow-950/20"
              : "border-green-500/40 text-green-400"
          }`}
        >
          <ShieldCheck className="w-2 h-2" />
          {councilOn
            ? `Council ×${data.verifierQuorum || 3}`
            : verifierModel
              ? verifierModel.name.split(" ").slice(-1)[0]
              : "Verified"}
        </Badge>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}

function WorkflowNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-card/80 shadow-md min-w-[160px] max-w-[220px] transition-all ${
        selected ? "border-cyan-500 shadow-cyan-500/20" : "border-border/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
        <p className="text-xs font-medium text-foreground truncate">
          {data.label as string}
        </p>
      </div>
      {data.trigger ? (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {String(data.trigger)}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

function GoalNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-card/80 shadow-md min-w-[160px] max-w-[240px] transition-all ${
        selected ? "border-amber-500 shadow-amber-500/20" : "border-border/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs font-medium text-foreground truncate">
          {data.label as string}
        </p>
      </div>
      {data.verified ? (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-1 border-accent/30 text-accent">
          <CheckCircle2 className="w-2 h-2 mr-0.5" /> Verified
        </Badge>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

// ─── HITL Checkpoint Node (Orange Flag) ─────────────────────────────────────

function CheckpointNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  const interfaceType = (data.interfaceType as CheckpointInterfaceType) || "notification_swipe";
  const InterfaceIcon = INTERFACE_ICONS[interfaceType] || Bell;
  const triggerMode = (data.triggerMode as string) || "before_agent";

  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 shadow-md min-w-[180px] max-w-[240px] transition-all ${
        selected
          ? "border-orange-500 shadow-orange-500/30 bg-orange-950/40"
          : "border-orange-500/60 bg-orange-950/20"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-orange-500/20">
          <Flag className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-orange-300 truncate">
            {(data.label as string) || "HITL Checkpoint"}
          </p>
          <p className="text-[9px] text-orange-400/70">
            {triggerMode === "before_agent" ? "Ask Permission" : "Notify Complete"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-orange-500/30 text-orange-400 gap-0.5">
          <InterfaceIcon className="w-2.5 h-2.5" />
          {INTERFACE_LABELS[interfaceType]}
        </Badge>
      </div>
      {data.defaultRule ? (
        <p className="text-[9px] text-orange-400/60 mt-1 line-clamp-2 italic">
          {String(data.defaultRule)}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

// ─── Trigger Node (Layer 1) ─────────────────────────────────────────────────

function TriggerNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-card/80 shadow-md min-w-[160px] max-w-[220px] transition-all ${
        selected ? "border-violet-500 shadow-violet-500/20" : "border-border/40"
      }`}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-xs font-medium text-foreground truncate">
          {(data.label as string) || "Trigger"}
        </p>
      </div>
      {data.schedule ? (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {String(data.schedule)}
        </p>
      ) : null}
      {data.triggerType ? (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-1 border-violet-500/30 text-violet-400">
          {String(data.triggerType)}
        </Badge>
      ) : null}
    </div>
  );
}

// ─── Verification Node (Layer 4 — LLM Council) ───────────────────────────────

function VerificationNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-card/80 shadow-md min-w-[160px] max-w-[240px] transition-all ${
        selected ? "border-yellow-500 shadow-yellow-500/20 bg-yellow-950/20" : "border-yellow-500/50 bg-yellow-950/10"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
        <p className="text-xs font-medium text-yellow-300 truncate">
          {(data.label as string) || "Verification"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-yellow-500/30 text-yellow-400 gap-0.5">
          <Users className="w-2.5 h-2.5" />
          {data.quorum ? `${data.quorum}-model council` : "LLM Council"}
        </Badge>
      </div>
      {data.criteria ? (
        <p className="text-[9px] text-yellow-400/60 mt-1 line-clamp-2">{String(data.criteria)}</p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  workflow: WorkflowNode,
  goal: GoalNode,
  checkpoint: CheckpointNode,
  trigger: TriggerNode,
  verification: VerificationNode,
};

// ─── Node Palette (drag-to-canvas) ───────────────────────────────────────────

const PALETTE_NODES = [
  { type: "trigger",      label: "Trigger",        icon: Zap,          color: "#8b5cf6", desc: "Event-driven or scheduled start" },
  { type: "workflow",     label: "Workflow",        icon: GitBranch,    color: "#06b6d4", desc: "Task dependency graph" },
  { type: "agent",        label: "Agent",           icon: Bot,          color: "#3b82f6", desc: "Role-assigned AI agent" },
  { type: "verification", label: "Verification",    icon: ShieldCheck,  color: "#eab308", desc: "LLM Council vote" },
  { type: "checkpoint",   label: "HITL",            icon: Flag,         color: "#f97316", desc: "Human-in-the-loop gate" },
  { type: "goal",         label: "Goal Tracking",   icon: Target,       color: "#f59e0b", desc: "Measurable outcome + KPIs" },
];

function NodePalette({ onAddNode }: { onAddNode: (type: string) => void }) {
  return (
    <div className="w-48 bg-card/95 border-r border-border/50 flex flex-col">
      <div className="px-3 py-2.5 border-b border-border/30">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Blueprint Layers</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {PALETTE_NODES.map((node) => (
          <button
            key={node.type}
            onClick={() => onAddNode(node.type)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: node.color + "22", border: `1px solid ${node.color}44` }}
            >
              <node.icon size={13} style={{ color: node.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-none mb-0.5">{node.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{node.desc}</p>
            </div>
            <Plus size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border/30">
        <p className="text-[9px] text-muted-foreground">Click to add · drag to reposition</p>
      </div>
    </div>
  );
}

// ─── Model Selector with Community Popularity ───────────────────────────────

function ModelSelector({
  value,
  onChange,
  workflowRole,
  popularDefaults,
}: {
  value: string | undefined;
  onChange: (modelId: string) => void;
  workflowRole?: WorkflowRole;
  popularDefaults?: Record<string, { modelId: string; count: number; percentage: number }>;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, ModelDefinition[]> = {
      anthropic: [],
      openai: [],
      google: [],
    };
    MODEL_REGISTRY.forEach((m) => groups[m.provider].push(m));
    return groups;
  }, []);

  // Determine the recommended default for this role
  const recommendedId = workflowRole ? ROLE_DEFAULTS[workflowRole] : undefined;
  // Community popular model for this role
  const popularId = workflowRole && popularDefaults?.[workflowRole]?.modelId;
  const popularPct = workflowRole && popularDefaults?.[workflowRole]?.percentage;

  const renderModelItem = (m: ModelDefinition) => (
    <SelectItem key={m.id} value={m.id} className="text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: getProviderColor(m.provider) }}
        />
        <span>{m.name}</span>
        {m.id === popularId && (
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-blue-500/30 text-blue-400 ml-1">
            {Math.round(popularPct || 0)}% use
          </Badge>
        )}
        {m.id === recommendedId && m.id !== popularId && (
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-accent/30 text-accent ml-1">
            REC
          </Badge>
        )}
        <span className={`text-[9px] ml-auto ${getTierColor(m.tier)}`}>
          ${m.costPerMillionInput}/M
        </span>
      </div>
    </SelectItem>
  );

  return (
    <div className="space-y-2">
      {/* Default mode toggle */}
      {workflowRole && popularId && popularId !== recommendedId && (
        <div className="flex items-center gap-2 p-2 rounded bg-blue-950/20 border border-blue-500/20">
          <TrendingUp className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-[10px] text-blue-300">
            Community popular: <strong>{getModelById(popularId)?.name}</strong> ({Math.round(popularPct || 0)}% of users)
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-[9px] text-blue-400 hover:text-blue-300 ml-auto"
            onClick={() => onChange(popularId)}
          >
            Use
          </Button>
        </div>
      )}

      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select model..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Anthropic
            </SelectLabel>
            {grouped.anthropic.map(renderModelItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              OpenAI
            </SelectLabel>
            {grouped.openai.map(renderModelItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Google
            </SelectLabel>
            {grouped.google.map(renderModelItem)}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Model info card */}
      {value && (() => {
        const model = getModelById(value);
        if (!model) return null;
        return (
          <div className="p-2 rounded-md bg-muted/30 border border-border/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-foreground">{model.name}</span>
              <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${getTierColor(model.tier)}`}>
                {model.tier}
              </Badge>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {model.strengths}
            </p>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                ${model.costPerMillionInput}/${model.costPerMillionOutput} per M
              </span>
              <span>{(model.contextWindow / 1000).toFixed(0)}K ctx</span>
              {model.supportsVision && <span>👁 Vision</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Cost Estimator Panel ───────────────────────────────────────────────────

function CostEstimatorPanel({
  nodes,
  councilEnabled,
  councilSize,
}: {
  nodes: Node[];
  councilEnabled: boolean;
  councilSize: number;
}) {
  const agentNodes = nodes.filter((n) => n.type === "agent");

  const breakdown = useMemo(() => {
    return agentNodes.map((n) => {
      const modelId = n.data.modelId as string;
      const model = getModelById(modelId);
      const cost = model ? estimateCost(modelId, 2000, 1000) : 0;
      return {
        nodeId: n.id,
        name: n.data.label as string,
        modelId,
        modelName: model?.name || "Unknown",
        cost,
        tier: model?.tier || "standard",
      };
    });
  }, [agentNodes]);

  const totalAgentCost = breakdown.reduce((sum, b) => sum + b.cost, 0);
  const councilCost = councilEnabled
    ? agentNodes.length * councilSize * estimateCost(ROLE_DEFAULTS.verifier, 500, 200)
    : 0;
  const totalCost = totalAgentCost + councilCost;

  return (
    <Card className="p-3 bg-card/90 backdrop-blur-sm border-border/50 w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-foreground">Cost Estimator</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent/30 text-accent ml-auto">
          ~${totalCost.toFixed(4)}/run
        </Badge>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {breakdown.map((b) => (
          <div key={b.nodeId} className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground truncate max-w-[140px]">{b.name}</span>
            <span className={`font-mono ${getTierColor(b.tier as any)}`}>
              ${b.cost.toFixed(5)}
            </span>
          </div>
        ))}
        {councilEnabled && (
          <div className="flex items-center justify-between text-[10px] border-t border-border/30 pt-1 mt-1">
            <span className="text-yellow-400 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              LLM Council ({councilSize}x)
            </span>
            <span className="font-mono text-yellow-400">
              +${councilCost.toFixed(5)}
            </span>
          </div>
        )}
      </div>
      <div className="border-t border-border/30 mt-2 pt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Total per run</span>
        <span className="text-xs font-bold text-accent">${totalCost.toFixed(4)}</span>
      </div>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function BlueprintBuilder() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = params.id === "new";
  const blueprintId = isNew ? 0 : Number(params.id);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<Record<string, unknown>>>([] as Node<Record<string, unknown>>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blueprintTitle, setBlueprintTitle] = useState(isNew ? "Untitled Blueprint" : "");
  const [blueprintTicker, setBlueprintTicker] = useState(isNew ? "NEW" : "");
  const [councilEnabled, setCouncilEnabled] = useState(false);
  const [councilSize, setCouncilSize] = useState(3);

  // Fetch blueprint data
  const { data: blueprint, isLoading } =
    trpc.blueprintEngine.getBlueprint.useQuery(
      { blueprintId },
      { enabled: !!blueprintId }
    );

  // Fetch existing model configs for this blueprint
  const { data: modelConfigs } = trpc.models.getAgentModelConfig.useQuery(
    { blueprintId },
    { enabled: !!blueprintId }
  );

  // Fetch community popular defaults
  const { data: popularDefaults } = trpc.models.getPopularDefaults.useQuery();

  // Save mutations
  const saveModelConfigs = trpc.models.saveBlueprintModelConfigs.useMutation();
  const recordSelection = trpc.models.recordModelSelection.useMutation();
  const saveCheckpointMut = trpc.models.saveCheckpoint.useMutation();
  const deleteCheckpointMut = trpc.models.deleteCheckpoint.useMutation();
  const createBlankMut = trpc.blueprintEngine.createBlank.useMutation();
  const updateGraphMut = trpc.blueprintEngine.updateGraph.useMutation();
  const [savedBlueprintId, setSavedBlueprintId] = useState<number | null>(null);
  const effectiveBlueprintId = savedBlueprintId || blueprintId;

  // Convert blueprint data to React Flow nodes/edges
  useEffect(() => {
    if (!blueprint) return;

    setBlueprintTitle(blueprint.template.title);
    setBlueprintTicker(blueprint.template.ticker);

    const agentNodes: Node[] = blueprint.agents.map((agent: any, i: number) => {
      const config = modelConfigs?.find(
        (c: any) => c.nodeId === `agent-${agent.id}`
      );
      const defaultRole: WorkflowRole = i === 0 ? "coordinator" : "implementer";
      const defaultModel = ROLE_DEFAULTS[defaultRole];

      return {
        id: `agent-${agent.id}`,
        type: "agent",
        position: { x: 150 + i * 300, y: 100 },
        data: {
          label: agent.name,
          role: agent.role,
          mission: agent.mission,
          color: agent.color || "#3b82f6",
          autonomyLevel: agent.autonomyLevel,
          verified: false,
          tools: agent.tools,
          guardrails: agent.guardrails,
          modelId: config?.modelId || defaultModel,
          workflowRole: config?.workflowRole || defaultRole,
          councilEnabled: false,
          ...agent,
        },
      };
    });

    const workflowNodes: Node[] = blueprint.workflows.map(
      (wf: any, i: number) => ({
        id: `workflow-${wf.id}`,
        type: "workflow",
        position: { x: 200 + i * 280, y: 350 },
        data: {
          label: wf.name,
          trigger: wf.triggerCondition,
          ...wf,
        },
      })
    );

    const goalNodes: Node[] = blueprint.goals.map((goal: any, i: number) => ({
      id: `goal-${goal.id}`,
      type: "goal",
      position: { x: 120 + i * 320, y: 550 },
      data: {
        label: goal.objective?.substring(0, 40) + "...",
        objective: goal.objective,
        verified: goal.verificationStatus === "verified",
        ...goal,
      },
    }));

    setNodes([...agentNodes, ...workflowNodes, ...goalNodes]);

    // Build edges from workflows
    const newEdges: Edge[] = [];
    blueprint.workflows.forEach((wf: any) => {
      if (wf.sourceAgentId) {
        newEdges.push({
          id: `e-${wf.sourceAgentId}-wf-${wf.id}`,
          source: `agent-${wf.sourceAgentId}`,
          target: `workflow-${wf.id}`,
          animated: true,
          style: { stroke: "#06b6d4" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#06b6d4" },
        });
      }
      if (wf.targetAgentId) {
        newEdges.push({
          id: `e-wf-${wf.id}-${wf.targetAgentId}`,
          source: `workflow-${wf.id}`,
          target: `agent-${wf.targetAgentId}`,
          animated: true,
          style: { stroke: "#06b6d4" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#06b6d4" },
        });
      }
    });

    // Connect agents to their goals
    blueprint.goals.forEach((goal: any) => {
      if (goal.agentId) {
        newEdges.push({
          id: `e-agent-${goal.agentId}-goal-${goal.id}`,
          source: `agent-${goal.agentId}`,
          target: `goal-${goal.id}`,
          style: { stroke: "#f59e0b", strokeDasharray: "5 5" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
        });
      }
    });

    setEdges(newEdges);
  }, [blueprint, modelConfigs]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setEditPanelOpen(true);
  }, []);

  // Add any node type to canvas
  const addNode = useCallback((type: string) => {
    const id = `${type}-${Date.now()}`;
    const defaults: Record<string, Record<string, unknown>> = {
      trigger:      { label: "Trigger", triggerType: "scheduled", schedule: "daily at 9am" },
      workflow:     { label: "Workflow Step", trigger: "" },
      agent:        { label: "New Agent", role: "", mission: "", color: "#3b82f6", modelId: ROLE_DEFAULTS.implementer, workflowRole: "implementer", verifierModelId: ROLE_DEFAULTS.verifier, verifierCouncil: false, verifierQuorum: 3 },
      verification: { label: "Verification", quorum: 3, criteria: "" },
      checkpoint:   { label: "HITL Checkpoint", triggerMode: "before_agent", interfaceType: "notification_swipe", defaultRule: "", linkedAgentNodeId: "" },
      goal:         { label: "Goal...", objective: "", desiredFinalState: "", verified: false },
    };
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 },
      data: defaults[type] || { label: type },
    };

    if (type === "agent") {
      // Auto-add a Verification node below the agent and connect them
      const verifyId = `verification-${Date.now() + 1}`;
      const verifyNode: Node = {
        id: verifyId,
        type: "verification",
        position: { x: newNode.position.x, y: newNode.position.y + 160 },
        data: { label: "Verify Output", quorum: 1, criteria: "", linkedAgentId: id },
      };
      const autoEdge: Edge = {
        id: `e-${id}-${verifyId}`,
        source: id,
        target: verifyId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#eab308", strokeDasharray: "4 2" },
        label: "verify",
      };
      setNodes((nds) => [...nds, newNode, verifyNode]);
      setEdges((eds) => [...eds, autoEdge]);
      toast.success("Agent + Verification node added");
    } else {
      setNodes((nds) => [...nds, newNode]);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} node added`);
    }
  }, [setNodes, setEdges]);

  // Add HITL Checkpoint node (kept for toolbar button)
  const addCheckpointNode = useCallback(() => addNode("checkpoint"), [addNode]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let activeBlueprintId = effectiveBlueprintId;

      // If blank canvas, create the blueprint first
      if (isNew && !savedBlueprintId) {
        const result = await createBlankMut.mutateAsync({ title: blueprintTitle || "Untitled Blueprint" });
        setSavedBlueprintId(result.blueprintId);
        setBlueprintTicker(result.ticker);
        activeBlueprintId = result.blueprintId;
        // Update URL without reload
        navigate(`/blueprints/${result.blueprintId}/builder`, { replace: true });
      }

      // Always persist the full graph (nodes + edges)
      await updateGraphMut.mutateAsync({
        blueprintId: activeBlueprintId,
        nodes: nodes as any[],
        edges: edges as any[],
      });

      // Save model configurations for all agent nodes
      const agentNodes = nodes.filter((n) => n.type === "agent");
      if (agentNodes.length > 0) {
        const configs = agentNodes.map((n) => ({
          nodeId: n.id,
          modelId: (n.data.modelId as string) || ROLE_DEFAULTS.implementer,
          workflowRole: (n.data.workflowRole as WorkflowRole) || undefined,
        }));
        await saveModelConfigs.mutateAsync({ blueprintId: activeBlueprintId, configs });
      }

      // Save checkpoint nodes
      const checkpointNodes = nodes.filter((n) => n.type === "checkpoint");
      for (const cp of checkpointNodes) {
        await saveCheckpointMut.mutateAsync({
          blueprintId: activeBlueprintId,
          nodeId: cp.id,
          triggerMode: (cp.data.triggerMode as "before_agent" | "after_agent") || "before_agent",
          linkedAgentNodeId: (cp.data.linkedAgentNodeId as string) || undefined,
          interfaceType: (cp.data.interfaceType as any) || "notification_swipe",
          defaultRule: (cp.data.defaultRule as string) || undefined,
        });
      }

      toast.success("Blueprint saved");
    } catch {
      toast.error("Could not save blueprint.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to update node data
  const updateNodeData = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...updates } }
          : prev
      );
    },
    [setNodes]
  );

  // Handle model change with popularity tracking and cost delta
  const handleModelChange = useCallback(
    (nodeId: string, modelId: string, workflowRole?: WorkflowRole) => {
      const oldNode = nodes.find((n) => n.id === nodeId);
      const oldModelId = oldNode?.data.modelId as string;
      const oldModel = getModelById(oldModelId);
      const newModel = getModelById(modelId);

      updateNodeData(nodeId, { modelId });

      // Record selection for popularity tracking
      if (workflowRole) {
        recordSelection.mutate({ modelId, workflowRole });
      }

      // Show cost delta toast
      if (oldModel && newModel) {
        const oldCost = estimateCost(oldModelId, 2000, 1000);
        const newCost = estimateCost(modelId, 2000, 1000);
        const delta = newCost - oldCost;
        if (Math.abs(delta) > 0.000001) {
          const sign = delta > 0 ? "+" : "";
          toast.info(
            `Cost ${sign}$${delta.toFixed(5)}/run — switched to ${newModel.name}`,
            { duration: 3000 }
          );
        }
      }
    },
    [nodes, updateNodeData, recordSelection]
  );

  // Calculate estimated cost per run
  const estimatedCostPerRun = useMemo(() => {
    const agentNodes = nodes.filter((n) => n.type === "agent");
    let totalCost = 0;
    agentNodes.forEach((n) => {
      const model = getModelById(n.data.modelId as string);
      if (model) {
        totalCost += estimateCost(n.data.modelId as string, 2000, 1000);
      }
    });
    if (councilEnabled) {
      totalCost += agentNodes.length * councilSize * estimateCost(ROLE_DEFAULTS.verifier, 500, 200);
    }
    return totalCost;
  }, [nodes, councilEnabled, councilSize]);

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading blueprint...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate("/blueprints")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[10px] border-blue-500/30 text-blue-400"
              >
                {blueprintTicker}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {blueprintTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cost estimate badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-accent/30 text-accent gap-1 cursor-help">
                  <DollarSign className="w-2.5 h-2.5" />
                  ~${estimatedCostPerRun.toFixed(4)}/run
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Estimated cost per full blueprint execution
              </TooltipContent>
            </Tooltip>

            {/* Add Checkpoint button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  onClick={addCheckpointNode}
                >
                  <Flag className="w-3 h-3" />
                  + HITL
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Add Human-in-the-Loop checkpoint
              </TooltipContent>
            </Tooltip>

            {/* Council toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={councilEnabled ? "default" : "outline"}
                  size="sm"
                  className={`gap-1.5 text-xs ${
                    councilEnabled
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                      : "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  }`}
                  onClick={() => setCouncilEnabled(!councilEnabled)}
                >
                  <Users className="w-3 h-3" />
                  Council
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[250px]">
                LLM Council Add-on: Upgrade any verification step to {councilSize} independent models voting. Available on any task with a verifier.
              </TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(blueprintTicker);
                toast.success("Ticker copied");
              }}
            >
              <Copy className="w-3 h-3" />
              {blueprintTicker}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Canvas + Palette */}
        <div className="flex-1 flex">
          <NodePalette onAddNode={addNode} />
          <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#06b6d4" },
            }}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-card !border-border/50 !rounded-lg !shadow-lg" />
            <MiniMap
              className="!bg-card !border-border/50 !rounded-lg"
              nodeColor={(node) => {
                if (node.type === "agent") return "#3b82f6";
                if (node.type === "workflow") return "#06b6d4";
                if (node.type === "goal") return "#f59e0b";
                if (node.type === "checkpoint") return "#f97316";
                if (node.type === "trigger") return "#8b5cf6";
                if (node.type === "verification") return "#eab308";
                return "#64748b";
              }}
            />

            {/* Cost Estimator Panel */}
            <Panel position="top-right">
              <CostEstimatorPanel
                nodes={nodes}
                councilEnabled={councilEnabled}
                councilSize={councilSize}
              />
            </Panel>

            {/* Legend */}
            <Panel position="bottom-left">
              <Card className="p-3 bg-card/90 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Agent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-cyan-500" />
                    <span>Workflow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span>Goal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span>HITL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-violet-500" />
                    <span>Trigger</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>Verify</span>
                  </div>
                </div>
              </Card>
            </Panel>
          </ReactFlow>
          </div>
        </div>

        {/* Edit Panel (Sheet) */}
        <Sheet open={editPanelOpen} onOpenChange={setEditPanelOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selectedNode?.type === "agent" && (
                  <Bot className="w-5 h-5 text-blue-400" />
                )}
                {selectedNode?.type === "workflow" && (
                  <GitBranch className="w-5 h-5 text-cyan-400" />
                )}
                {selectedNode?.type === "goal" && (
                  <Target className="w-5 h-5 text-amber-400" />
                )}
                {selectedNode?.type === "checkpoint" && (
                  <Flag className="w-5 h-5 text-orange-400" />
                )}
                Edit{" "}
                {selectedNode?.type === "agent"
                  ? "Agent"
                  : selectedNode?.type === "workflow"
                    ? "Workflow"
                    : selectedNode?.type === "goal"
                      ? "Goal"
                      : "Checkpoint"}
              </SheetTitle>
            </SheetHeader>

            {selectedNode && (
              <div className="mt-6 space-y-4">
                {/* ─── AGENT EDITING ─── */}
                {selectedNode.type === "agent" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Agent Name
                      </label>
                      <Input
                        value={(selectedNode.data.label as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { label: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Role
                      </label>
                      <Input
                        value={(selectedNode.data.role as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { role: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Mission
                      </label>
                      <Textarea
                        value={(selectedNode.data.mission as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { mission: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    {/* ─── MODEL SELECTION SECTION ─── */}
                    <div className="border-t border-border/30 pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-foreground">
                          LLM Model
                        </span>
                        {/* Real-time cost for this agent */}
                        {typeof selectedNode.data.modelId === "string" && selectedNode.data.modelId && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent/30 text-accent ml-auto">
                            ${estimateCost(selectedNode.data.modelId, 2000, 1000).toFixed(5)}/call
                          </Badge>
                        )}
                      </div>

                      {/* Workflow Role selector */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Workflow Role
                        </label>
                        <Select
                          value={(selectedNode.data.workflowRole as string) || ""}
                          onValueChange={(val) => {
                            const newModel = ROLE_DEFAULTS[val as WorkflowRole];
                            updateNodeData(selectedNode.id, {
                              workflowRole: val,
                              modelId: newModel,
                            });
                            // Record for popularity
                            recordSelection.mutate({ modelId: newModel, workflowRole: val as WorkflowRole });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Assign role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coordinator" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Coordinator — strategic decisions (5% tokens)
                              </div>
                            </SelectItem>
                            <SelectItem value="implementer" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Implementer — does the actual work
                              </div>
                            </SelectItem>
                            <SelectItem value="verifier" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                Verifier — cross-checks output
                              </div>
                            </SelectItem>
                            <SelectItem value="fixer" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-accent" />
                                Fixer/Synthesizer — reconciles feedback
                              </div>
                            </SelectItem>
                            <SelectItem value="web_research" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                Web Research — browse and synthesize
                              </div>
                            </SelectItem>
                            <SelectItem value="vision" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-pink-500" />
                                Vision — interpret images/layouts
                              </div>
                            </SelectItem>
                            <SelectItem value="computer_use" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                Computer Use — GUI automation
                              </div>
                            </SelectItem>
                            <SelectItem value="bulk_worker" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                Bulk Worker — high-volume parallel (95% tokens)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Model selector with popularity */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Model
                        </label>
                        <ModelSelector
                          value={selectedNode.data.modelId as string}
                          onChange={(modelId) =>
                            handleModelChange(
                              selectedNode.id,
                              modelId,
                              selectedNode.data.workflowRole as WorkflowRole
                            )
                          }
                          workflowRole={selectedNode.data.workflowRole as WorkflowRole}
                          popularDefaults={popularDefaults}
                        />
                      </div>

                      {/* Cost hint */}
                      <div className="mt-2 p-2 rounded bg-muted/20 border border-border/20">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Info className="w-3 h-3" />
                          <span>
                            Changing the model updates the estimated cost in real-time.
                            Community popular models are marked with usage %.
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* ─── END MODEL SELECTION ─── */}

                    {/* ─── VERIFICATION SUB-PANEL (required per agent) ─── */}
                    <div className="border-t border-border/30 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-foreground">Task Verification</span>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-green-500/30 text-green-400">
                          REQUIRED
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        Every agent task is verified by at least 1 independent LLM before the output is accepted.
                        Upgrade to Council for multi-model voting.
                      </p>

                      {/* Verifier model picker */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Verifier Model
                        </label>
                        <Select
                          value={(selectedNode.data.verifierModelId as string) || ROLE_DEFAULTS.verifier}
                          onValueChange={(val) => updateNodeData(selectedNode.id, { verifierModelId: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select verifier..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MODEL_REGISTRY.slice(0, 12).map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${getTierColor(m.tier).replace("text-", "bg-").split(" ")[0]}`} />
                                  {m.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Council toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-xs font-medium text-foreground">LLM Council</span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-yellow-500/30 text-yellow-400">PRO</Badge>
                        </div>
                        <Button
                          variant={selectedNode.data.verifierCouncil ? "default" : "outline"}
                          size="sm"
                          className={`h-6 px-2 text-[10px] ${
                            selectedNode.data.verifierCouncil
                              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                              : "border-yellow-500/30 text-yellow-400"
                          }`}
                          onClick={() => updateNodeData(selectedNode.id, { verifierCouncil: !selectedNode.data.verifierCouncil })}
                        >
                          {selectedNode.data.verifierCouncil ? "On" : "Off"}
                        </Button>
                      </div>
                      {Boolean(selectedNode.data.verifierCouncil) && (
                        <div className="mt-1 p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
                          <label className="text-[10px] text-muted-foreground mb-1 block">Quorum size</label>
                          <Select
                            value={String(selectedNode.data.verifierQuorum || 3)}
                            onValueChange={(val) => updateNodeData(selectedNode.id, { verifierQuorum: Number(val) })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2" className="text-xs">2 of 3 models agree</SelectItem>
                              <SelectItem value="3" className="text-xs">3 of 3 models agree (strict)</SelectItem>
                              <SelectItem value="4" className="text-xs">3 of 5 models agree</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Tools (JSON array)
                      </label>
                      <Textarea
                        value={
                          typeof selectedNode.data.tools === "string"
                            ? (selectedNode.data.tools as string)
                            : JSON.stringify(selectedNode.data.tools, null, 2)
                        }
                        onChange={(e) => {
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, data: { ...n.data, tools: e.target.value } }
                                : n
                            )
                          );
                        }}
                        rows={4}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Guardrails (JSON array)
                      </label>
                      <Textarea
                        value={
                          typeof selectedNode.data.guardrails === "string"
                            ? (selectedNode.data.guardrails as string)
                            : JSON.stringify(selectedNode.data.guardrails, null, 2)
                        }
                        onChange={(e) => {
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, data: { ...n.data, guardrails: e.target.value } }
                                : n
                            )
                          );
                        }}
                        rows={4}
                        className="font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {/* ─── WORKFLOW EDITING ─── */}
                {selectedNode.type === "workflow" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Workflow Name
                      </label>
                      <Input
                        value={(selectedNode.data.label as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { label: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Trigger Condition
                      </label>
                      <Textarea
                        value={(selectedNode.data.trigger as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { trigger: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* ─── GOAL EDITING ─── */}
                {selectedNode.type === "goal" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Objective
                      </label>
                      <Textarea
                        value={(selectedNode.data.objective as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            objective: e.target.value,
                            label: e.target.value.substring(0, 40) + "...",
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Desired Final State
                      </label>
                      <Textarea
                        value={(selectedNode.data.desiredFinalState as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { desiredFinalState: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Verification Criteria (JSON)
                      </label>
                      <Textarea
                        value={
                          typeof selectedNode.data.verification === "string"
                            ? (selectedNode.data.verification as string)
                            : JSON.stringify(selectedNode.data.verification, null, 2)
                        }
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { verification: e.target.value })
                        }
                        rows={5}
                        className="font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {/* ─── CHECKPOINT EDITING ─── */}
                {selectedNode.type === "checkpoint" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Checkpoint Name
                      </label>
                      <Input
                        value={(selectedNode.data.label as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { label: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Trigger Mode
                      </label>
                      <Select
                        value={(selectedNode.data.triggerMode as string) || "before_agent"}
                        onValueChange={(val) =>
                          updateNodeData(selectedNode.id, { triggerMode: val })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_agent" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Flag className="w-3 h-3 text-orange-400" />
                              Ask Permission
                            </div>
                          </SelectItem>
                          <SelectItem value="after_agent" className="text-xs">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-orange-400" />
                              Notify Complete
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Interface Type
                      </label>
                      <Select
                        value={(selectedNode.data.interfaceType as string) || "notification_swipe"}
                        onValueChange={(val) =>
                          updateNodeData(selectedNode.id, { interfaceType: val })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification_swipe" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Bell className="w-3 h-3" />
                              Notification Swipe — approve from phone
                            </div>
                          </SelectItem>
                          <SelectItem value="voice_call" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              Voice Call — AI calls you to confirm
                            </div>
                          </SelectItem>
                          <SelectItem value="email_approval" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              Email Approval — reply to approve
                            </div>
                          </SelectItem>
                          <SelectItem value="dashboard_review" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3" />
                              Dashboard Review — review in app
                            </div>
                          </SelectItem>
                          <SelectItem value="file_watch" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Upload className="w-3 h-3" />
                              File Watch — wait for file upload
                            </div>
                          </SelectItem>
                          <SelectItem value="webhook_signal" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Webhook className="w-3 h-3" />
                              Webhook Signal — external trigger
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Default Rule
                      </label>
                      <Textarea
                        value={(selectedNode.data.defaultRule as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { defaultRule: e.target.value })
                        }
                        rows={3}
                        placeholder="e.g., Always have me swipe approve before any message gets sent from my account"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Define the condition or instruction for this checkpoint.
                      </p>
                    </div>

                    {/* Delete checkpoint */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => {
                        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                        setEdges((eds) =>
                          eds.filter(
                            (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
                          )
                        );
                        setEditPanelOpen(false);
                        toast.success("Checkpoint removed");
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Checkpoint
                    </Button>
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
