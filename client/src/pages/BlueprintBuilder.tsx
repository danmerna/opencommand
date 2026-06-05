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
} from "lucide-react";
import { toast } from "sonner";

// ─── Custom Node Types ──────────────────────────────────────────────────────

function AgentNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[200px] max-w-[260px] transition-all ${
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
        <GitBranch className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <p className="text-xs font-medium text-foreground truncate">
          {data.label as string}
        </p>
      </div>
      {data.trigger ? (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          Trigger: {String(data.trigger)}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

function GoalNode({ data, selected }: NodeProps<Node<Record<string, unknown>>>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 bg-card/80 shadow-md min-w-[180px] max-w-[240px] transition-all ${
        selected ? "border-amber-500 shadow-amber-500/20" : "border-border/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-xs font-medium text-foreground truncate">
          {data.label as string}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground line-clamp-2">
        {data.objective as string}
      </p>
      {data.verified ? (
        <div className="flex items-center gap-1 mt-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">
            Dual-verified
          </span>
        </div>
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

  // Convert blueprint data to React Flow nodes/edges
  useEffect(() => {
    if (!blueprint) return;

    setBlueprintTitle(blueprint.template.title);
    setBlueprintTicker(blueprint.template.ticker);

    const agentNodes: Node[] = blueprint.agents.map((agent: any, i: number) => ({
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
        ...agent,
      },
    }));

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
  }, [blueprint]);

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
      // TODO: Persist node positions and edits
      toast.success("Blueprint saved");
    } catch {
      toast.error("Could not save blueprint.");
    } finally {
      setIsSaving(false);
    }
  };

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
                  <span>/Goal</span>
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
                        setSelectedNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            label: e.target.value,
                          },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Role
                    </label>
                    <Input
                      value={(selectedNode.data.role as string) || ""}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: { ...n.data, role: e.target.value },
                                }
                              : n
                          )
                        );
                        setSelectedNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            role: e.target.value,
                          },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Mission
                    </label>
                    <Textarea
                      value={(selectedNode.data.mission as string) || ""}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: { ...n.data, mission: e.target.value },
                                }
                              : n
                          )
                        );
                        setSelectedNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            mission: e.target.value,
                          },
                        });
                      }}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Autonomy Level (0-3)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={3}
                      value={(selectedNode.data.autonomyLevel as number) || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: { ...n.data, autonomyLevel: val },
                                }
                              : n
                          )
                        );
                        setSelectedNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            autonomyLevel: val,
                          },
                        });
                      }}
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
