import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FolderOpen, Target, Clock, CheckCircle2, PauseCircle } from "lucide-react";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "oklch(0.72 0.12 250)",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

const STATUS_CONFIG = {
  active:    { label: "Active",    icon: Clock,        cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  paused:    { label: "Paused",    icon: PauseCircle,  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  completed: { label: "Completed", icon: CheckCircle2, cls: "bg-accent/10 text-accent border-accent/20" },
  archived:  { label: "Archived",  icon: FolderOpen,   cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export default function Projects() {
  const utils = trpc.useUtils();
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [companyId, setCompanyId] = useState<number | "">("");

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setShowCreate(false);
      setName(""); setGoal(""); setColor(PROJECT_COLORS[0]); setCompanyId("");
      toast.success("Project created");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Project name is required");
    createMutation.mutate({ name: name.trim(), goal: goal.trim() || undefined, color, companyId: companyId ? Number(companyId) : undefined });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Focused workspaces for goals, tasks, files, and agent collaboration.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
          <Plus size={14} /> New Project
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-white/[0.03] animate-pulse border border-border" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">Create your first project to organise goals, files, chats, and agent tasks in one place.</p>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <Plus size={14} /> Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const status = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
            const StatusIcon = status.icon;
            const company = companies.find(c => c.id === project.companyId);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group relative rounded-xl border border-border bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer overflow-hidden p-5">
                  {/* Color accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: project.color ?? "#6366f1" }} />

                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: (project.color ?? "#6366f1") + "33", border: `1px solid ${project.color ?? "#6366f1"}44` }}
                    >
                      <span style={{ color: project.color ?? "#6366f1" }}>
                        {project.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.cls}`}>
                      <StatusIcon size={9} />
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-foreground mb-1 truncate">{project.name}</h3>
                  {project.goal ? (
                    <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3">{project.goal}</p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/40 italic mb-3">No goal set</p>
                  )}

                  <div className="flex items-center gap-2 mt-auto">
                    {company && (
                      <span className="text-[10px] text-muted-foreground/60 bg-white/[0.04] px-2 py-0.5 rounded-full border border-border truncate max-w-[120px]">
                        {company.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/40 ml-auto">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Project Name *</label>
              <Input
                placeholder="e.g. Q2 Growth Campaign"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Goal</label>
              <Textarea
                placeholder="What outcome does this project achieve?"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Company (optional)</label>
              <select
                value={companyId}
                onChange={e => setCompanyId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">No company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-white/60 scale-110" : "opacity-60 hover:opacity-90"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
