import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, LayoutGrid, FileText, MessageSquare, ListChecks, Pencil,
  Upload, Trash2, Download, Send, Bot, User, Loader2, Plus, CheckCircle2,
  Clock, AlertCircle,
} from "lucide-react";

type Tab = "overview" | "files" | "chat" | "plan" | "tasks";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "files",    label: "Files",    icon: FileText },
  { id: "chat",     label: "Chat",     icon: MessageSquare },
  { id: "plan",     label: "Plan",     icon: ListChecks },
  { id: "tasks",    label: "Tasks",    icon: CheckCircle2 },
];

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [goalVal, setGoalVal] = useState("");

  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: files = [] } = trpc.projects.files.useQuery({ projectId }, { enabled: !!projectId && activeTab === "files" });
  const { data: chats = [] } = trpc.projects.chats.useQuery({ projectId }, { enabled: !!projectId && activeTab === "chat" });
  const { data: allTasks = [] } = trpc.tasks.list.useQuery(undefined, { enabled: !!projectId && activeTab === "tasks" });
  const { data: agents = [] } = trpc.agents.list.useQuery(undefined, { enabled: !!projectId && activeTab === "tasks" });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => { utils.projects.get.invalidate({ id: projectId }); utils.projects.list.invalidate(); toast.success("Saved"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFileMutation = trpc.projects.deleteFile.useMutation({
    onSuccess: () => utils.projects.files.invalidate({ projectId }),
    onError: (e) => toast.error(e.message),
  });

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const sendChatMutation = trpc.projects.sendChat.useMutation({
    onSuccess: () => { utils.projects.chats.invalidate({ projectId }); setChatInput(""); },
    onError: (e) => toast.error(e.message),
  });

  // Plan state
  const [planText, setPlanText] = useState("");
  const [planDirty, setPlanDirty] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileMutation = trpc.projects.addFile.useMutation({
    onSuccess: () => { utils.projects.files.invalidate({ projectId }); toast.success("File added"); },
    onError: (e) => toast.error(e.message),
  });

  // Task assignment
  const [assignTaskId, setAssignTaskId] = useState<number | "">("");
  const assignTaskMutation = trpc.projects.assignTask.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task assigned to project"); setAssignTaskId(""); },
    onError: (e) => toast.error(e.message),
  });

  // Sync project data into local state
  useEffect(() => {
    if (project) {
      setNameVal(project.name);
      setGoalVal(project.goal ?? "");
      if (!planDirty) setPlanText(project.plan ?? "");
    }
  }, [project]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const handleSaveName = () => {
    if (!nameVal.trim()) return;
    updateMutation.mutate({ id: projectId, name: nameVal.trim(), goal: goalVal.trim() || undefined });
    setEditingName(false);
  };

  const handleSavePlan = () => {
    updateMutation.mutate({ id: projectId, plan: planText });
    setPlanDirty(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File must be under 16MB"); return; }
    // For now store as a URL reference — in production this would upload to S3
    const fakeUrl = URL.createObjectURL(file);
    addFileMutation.mutate({ projectId, name: file.name, url: fakeUrl, fileKey: `project-${projectId}/${file.name}`, mimeType: file.type, size: file.size });
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-[oklch(0.03_0_0)]">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/projects")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: project.color ?? "#6366f1" }}
          />
          {editingName ? (
            <Input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              className="h-7 text-base font-semibold max-w-xs"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold text-foreground cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
              onClick={() => setEditingName(true)}
            >
              {project.name}
              <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
            </h1>
          )}
          <select
            value={project.status}
            onChange={e => updateMutation.mutate({ id: projectId, status: e.target.value as any })}
            className="ml-auto h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Goal</label>
              <Textarea
                value={goalVal}
                onChange={e => setGoalVal(e.target.value)}
                onBlur={() => updateMutation.mutate({ id: projectId, goal: goalVal.trim() || undefined })}
                placeholder="What outcome does this project achieve?"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="text-sm font-semibold text-foreground capitalize">{project.status}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-xs text-muted-foreground mb-1">Created</div>
                <div className="text-sm font-semibold text-foreground">{new Date(project.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab("chat")} className="gap-1.5">
                <MessageSquare size={13} /> Open Chat
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("tasks")} className="gap-1.5">
                <CheckCircle2 size={13} /> Assign Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("plan")} className="gap-1.5">
                <ListChecks size={13} /> Edit Plan
              </Button>
            </div>
          </div>
        )}

        {/* ── Files ────────────────────────────────────────────────────── */}
        {activeTab === "files" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Project Files</h2>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload size={13} /> Upload File
                </Button>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <FileText size={28} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No files yet. Upload documents, plans, or references.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <FileText size={16} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.mimeType ?? "Unknown type"} · {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Download size={12} />
                        </Button>
                      </a>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteFileMutation.mutate({ id: file.id })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chat ─────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-[calc(100vh-220px)] max-w-2xl">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {chats.length === 0 && (
                <div className="text-center py-12">
                  <Bot size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Start a conversation. The AI knows your project goal and context.</p>
                </div>
              )}
              {chats.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-indigo-600" : "bg-white/[0.08]"}`}>
                    {msg.role === "user" ? <User size={13} className="text-white" /> : <Bot size={13} className="text-foreground" />}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/[0.05] text-foreground border border-border"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {sendChatMutation.isPending && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center">
                    <Bot size={13} className="text-foreground" />
                  </div>
                  <div className="bg-white/[0.05] border border-border rounded-xl px-4 py-3">
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) { e.preventDefault(); sendChatMutation.mutate({ projectId, content: chatInput.trim() }); } }}
                placeholder="Ask about this project, request a plan, assign tasks…"
                className="flex-1"
                disabled={sendChatMutation.isPending}
              />
              <Button
                onClick={() => chatInput.trim() && sendChatMutation.mutate({ projectId, content: chatInput.trim() })}
                disabled={!chatInput.trim() || sendChatMutation.isPending}
                size="sm"
                className="gap-1.5 px-4"
              >
                <Send size={13} /> Send
              </Button>
            </div>
          </div>
        )}

        {/* ── Plan ─────────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Project Plan</h2>
              <Button
                size="sm"
                onClick={handleSavePlan}
                disabled={!planDirty || updateMutation.isPending}
                className="gap-1.5"
              >
                {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Save Plan
              </Button>
            </div>
            <Textarea
              value={planText}
              onChange={e => { setPlanText(e.target.value); setPlanDirty(true); }}
              placeholder={"# Project Plan\n\n## Objectives\n- \n\n## Milestones\n1. \n\n## Agent Assignments\n- Arch: \n\n## Success Criteria\n- "}
              rows={24}
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">Markdown supported. Use this to outline milestones, agent assignments, and success criteria.</p>
          </div>
        )}

        {/* ── Tasks ────────────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Assigned Tasks</h2>
              <div className="flex items-center gap-2">
                <select
                  value={assignTaskId}
                  onChange={e => setAssignTaskId(e.target.value ? Number(e.target.value) : "")}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground min-w-[180px]"
                >
                  <option value="">Select a task…</option>
                  {allTasks.filter(t => t.status !== "completed").map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!assignTaskId || assignTaskMutation.isPending}
                  onClick={() => assignTaskId && assignTaskMutation.mutate({ projectId, taskId: Number(assignTaskId) })}
                  className="gap-1.5"
                >
                  <Plus size={12} /> Assign
                </Button>
              </div>
            </div>

            {/* Show all tasks with threads mentioning this project */}
            <div className="space-y-2">
              {allTasks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <CheckCircle2 size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tasks yet. Create tasks in the Tasks section and assign them here.</p>
                </div>
              ) : (
                allTasks.slice(0, 20).map(task => {
                  const statusIcon = task.status === "completed" ? CheckCircle2 : task.status === "in_progress" ? Clock : AlertCircle;
                  const StatusIcon = statusIcon;
                  const statusColor = task.status === "completed" ? "text-emerald-400" : task.status === "in_progress" ? "text-amber-400" : "text-muted-foreground";
                  const agent = agents.find(a => a.id === task.agentId);
                  return (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <StatusIcon size={14} className={`mt-0.5 shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[11px] capitalize ${statusColor}`}>{task.status.replace("_", " ")}</span>
                          {agent && <span className="text-[11px] text-muted-foreground">· {agent.name}</span>}
                          <span className={`text-[10px] px-1.5 py-0 rounded-full border ${task.priority === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" : task.priority === "high" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => assignTaskMutation.mutate({ projectId, taskId: task.id })}
                        disabled={assignTaskMutation.isPending}
                      >
                        Assign
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
