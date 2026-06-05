import { useState, useCallback, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  MODEL_REGISTRY,
  ROLE_DEFAULTS,
  getModelById,
  getTierColor,
  getProviderColor,
  type WorkflowRole,
  type ModelDefinition,
} from "@shared/modelRegistry";

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
        {data.autonomyLevel ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-400">
            L{String(data.autonomyLevel)}
          </Badge>
        ) : null}
        {data.verified ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
            Verified
          </Badge>
        ) : null}
        <ModelBadge modelId={data.modelId as string} />
        {data.workflowRole ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400">
            {String(data.workflowRole).replace("_", " ")}
          </Badge>
        ) : null}
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
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-1 border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-2 h-2 mr-0.5" /> Verified
        </Badge>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  workflow: WorkflowNode,
  goal: GoalNode,
};

// ─── Model Selector Component ────────────────────────────────────────────────

function ModelSelector({
  value,
  onChange,
  workflowRole,
}: {
  value: string | undefined;
  onChange: (modelId: string) => void;
  workflowRole?: WorkflowRole;
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

  return (
    <div className="space-y-2">
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select model..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Anthropic
            </SelectLabel>
            {grouped.anthropic.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getProviderColor("anthropic") }}
                  />
                  <span>{m.name}</span>
                  {m.id === recommendedId && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-400 ml-auto">
                      REC
                    </Badge>
                  )}
                  <span className={`text-[9px] ml-auto ${getTierColor(m.tier)}`}>
                    ${m.costPerMillionInput}/M
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              OpenAI
            </SelectLabel>
            {grouped.openai.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getProviderColor("openai") }}
                  />
                  <span>{m.name}</span>
                  {m.id === recommendedId && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-400 ml-auto">
                      REC
                    </Badge>
                  )}
                  <span className={`text-[9px] ml-auto ${getTierColor(m.tier)}`}>
                    ${m.costPerMillionInput}/M
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Google
            </SelectLabel>
            {grouped.google.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getProviderColor("google") }}
                  />
                  <span>{m.name}</span>
                  {m.id === recommendedId && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-400 ml-auto">
                      REC
                    </Badge>
                  )}
                  <span className={`text-[9px] ml-auto ${getTierColor(m.tier)}`}>
                    ${m.costPerMillionInput}/M
                  </span>
                </div>
              </SelectItem>
            ))}
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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function BlueprintBuilder() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const blueprintId = Number(params.id);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<Record<string, unknown>>>([] as Node<Record<string, unknown>>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blueprintTitle, setBlueprintTitle] = useState("");
  const [blueprintTicker, setBlueprintTicker] = useState("");

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

  // Save model configs mutation
  const saveModelConfigs = trpc.models.saveBlueprintModelConfigs.useMutation();

  // Convert blueprint data to React Flow nodes/edges
  useEffect(() => {
    if (!blueprint) return;

    setBlueprintTitle(blueprint.template.title);
    setBlueprintTicker(blueprint.template.ticker);

    const agentNodes: Node[] = blueprint.agents.map((agent: any, i: number) => {
      // Find existing model config for this agent node
      const config = modelConfigs?.find(
        (c: any) => c.nodeId === `agent-${agent.id}`
      );
      // Determine default model based on workflow role
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
      setEdges((eds) =>
        addEdge(
          connection,
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setEditPanelOpen(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save model configurations for all agent nodes
      const agentNodes = nodes.filter((n) => n.type === "agent");
      const configs = agentNodes.map((n) => ({
        nodeId: n.id,
        modelId: (n.data.modelId as string) || ROLE_DEFAULTS.implementer,
        workflowRole: (n.data.workflowRole as WorkflowRole) || undefined,
      }));

      await saveModelConfigs.mutateAsync({
        blueprintId,
        configs,
      });

      toast.success("Blueprint & model configs saved");
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

  // Calculate estimated cost per run
  const estimatedCostPerRun = useMemo(() => {
    const agentNodes = nodes.filter((n) => n.type === "agent");
    let totalCost = 0;
    agentNodes.forEach((n) => {
      const model = getModelById(n.data.modelId as string);
      if (model) {
        // Estimate ~2000 input tokens and ~1000 output tokens per agent per run
        totalCost +=
          (2000 / 1_000_000) * model.costPerMillionInput +
          (1000 / 1_000_000) * model.costPerMillionOutput;
      }
    });
    return totalCost;
  }, [nodes]);

  if (isLoading) {
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
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-400 gap-1">
            <DollarSign className="w-2.5 h-2.5" />
            ~${estimatedCostPerRun.toFixed(4)}/run
          </Badge>
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

      {/* Canvas */}
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
              return "#64748b";
            }}
          />

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
              </div>
            </Card>
          </Panel>
        </ReactFlow>
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
              Edit{" "}
              {selectedNode?.type === "agent"
                ? "Agent"
                : selectedNode?.type === "workflow"
                  ? "Workflow"
                  : "Goal"}
            </SheetTitle>
          </SheetHeader>

          {selectedNode && (
            <div className="mt-6 space-y-4">
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
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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

                    {/* Model selector */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Model
                      </label>
                      <ModelSelector
                        value={selectedNode.data.modelId as string}
                        onChange={(modelId) =>
                          updateNodeData(selectedNode.id, { modelId })
                        }
                        workflowRole={selectedNode.data.workflowRole as WorkflowRole}
                      />
                    </div>

                    {/* Cost hint */}
                    <div className="mt-2 p-2 rounded bg-muted/20 border border-border/20">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>
                          Changing the workflow role auto-selects the optimal model.
                          Override manually if needed.
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* ─── END MODEL SELECTION ─── */}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Autonomy Level (0-3)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={3}
                      value={(selectedNode.data.autonomyLevel as number) || 0}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          autonomyLevel: Number(e.target.value),
                        })
                      }
                    />
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
                              ? {
                                  ...n,
                                  data: { ...n.data, tools: e.target.value },
                                }
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
                          : JSON.stringify(
                              selectedNode.data.guardrails,
                              null,
                              2
                            )
                      }
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    guardrails: e.target.value,
                                  },
                                }
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

              {selectedNode.type === "workflow" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Workflow Name
                    </label>
                    <Input
                      value={(selectedNode.data.label as string) || ""}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: { ...n.data, label: e.target.value },
                                }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Trigger Condition
                    </label>
                    <Textarea
                      value={(selectedNode.data.trigger as string) || ""}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: { ...n.data, trigger: e.target.value },
                                }
                              : n
                          )
                        );
                      }}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === "goal" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Objective
                    </label>
                    <Textarea
                      value={(selectedNode.data.objective as string) || ""}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    objective: e.target.value,
                                    label:
                                      e.target.value.substring(0, 40) + "...",
                                  },
                                }
                              : n
                          )
                        );
                      }}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Desired Final State
                    </label>
                    <Textarea
                      value={
                        (selectedNode.data.desiredFinalState as string) || ""
                      }
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    desiredFinalState: e.target.value,
                                  },
                                }
                              : n
                          )
                        );
                      }}
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
                          : JSON.stringify(
                              selectedNode.data.verification,
                              null,
                              2
                            )
                      }
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    verification: e.target.value,
                                  },
                                }
                              : n
                          )
                        );
                      }}
                      rows={5}
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
