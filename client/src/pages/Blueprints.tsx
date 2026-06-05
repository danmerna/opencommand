import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Package, Plus, Rocket, Star, Download, Cpu, Building2, Shield,
  Play, Clock, CheckCircle2, AlertCircle, Pause, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/useAnalytics";

type Tab = "my-blueprints" | "browse" | "create";

export default function Blueprints() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("my-blueprints");
  const [showDeploy, setShowDeploy] = useState(false);
  const [selectedBp, setSelectedBp] = useState<any>(null);
  const [deployName, setDeployName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newBp, setNewBp] = useState({
    name: "", description: "", industry: "", agentCount: "",
    estimatedMonthlyCost: "", estimatedMonthlyRevenue: "", pricingModel: "one_time", price: ""
  });

  const { track } = useAnalytics();
  const utils = trpc.useUtils();

  // My templates (blueprint_templates table)
  const myTemplatesQ = trpc.blueprintEngine.listMyBlueprints.useQuery(undefined, { enabled: isAuthenticated });
  const myTemplates = myTemplatesQ.data ?? [];

  // Runs for status tracking
  const runsQ = trpc.execution.getAllRuns.useQuery(undefined, { enabled: isAuthenticated });
  const runs = runsQ.data ?? [];

  // Marketplace blueprints
  const blueprintsQ = trpc.blueprints.list.useQuery();
  const blueprints = blueprintsQ.data ?? [];

  const createBpMut = trpc.blueprints.create.useMutation({
    onSuccess: () => {
      utils.blueprints.list.invalidate();
      setShowCreate(false);
      setNewBp({ name: "", description: "", industry: "", agentCount: "", estimatedMonthlyCost: "", estimatedMonthlyRevenue: "", pricingModel: "one_time", price: "" });
      toast.success("Blueprint published");
    }
  });

  const deployBpMut = trpc.blueprints.deploy.useMutation({
    onSuccess: (data) => {
      setShowDeploy(false);
      track("blueprint", "deployed", { blueprintId: selectedBp?.id, companyId: data.companyId });
      toast.success(`Company deployed successfully (ID: ${data.companyId})`);
    }
  });

  const industries = Array.from(new Set(blueprints.map(b => b.category).filter(Boolean)));

  // Helper: get last run for a blueprint template
  function getLastRun(blueprintId: number) {
    return runs.find((r: any) => r.blueprintId === blueprintId);
  }

  function getStatusBadge(blueprintId: number) {
    const lastRun = getLastRun(blueprintId);
    if (!lastRun) return { label: "Draft", color: "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/20", icon: Pencil };
    switch (lastRun.status) {
      case "running": return { label: "Active", color: "text-accent bg-accent/10 border-accent/30", icon: Play };
      case "paused": return { label: "Paused", color: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: Pause };
      case "completed": return { label: "Completed", color: "text-green-400 bg-green-400/10 border-green-400/30", icon: CheckCircle2 };
      case "failed": return { label: "Failed", color: "text-red-400 bg-red-400/10 border-red-400/30", icon: AlertCircle };
      default: return { label: "Queued", color: "text-blue-400 bg-blue-400/10 border-blue-400/30", icon: Clock };
    }
  }

  function formatRelativeTime(dateStr: string | Date | null) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "my-blueprints", label: "My Blueprints", icon: Building2 },
    { id: "browse", label: "Marketplace", icon: Package },
    { id: "create", label: "Publish", icon: Plus },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-foreground tracking-tight">Blueprints</h1>
            <p className="text-muted-foreground text-sm mt-1">Build, deploy, and manage your agent blueprints.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/blueprints/new/builder")} size="sm" variant="outline" className="gap-1.5">
              <Pencil size={12} /> New Canvas
            </Button>
            <Button onClick={() => navigate("/intent-engine")} size="sm" className="gap-1.5">
              <Plus size={12} /> New with Σ
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* MY BLUEPRINTS */}
      {tab === "my-blueprints" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total", value: myTemplates.length, color: "text-foreground" },
              { label: "Active", value: myTemplates.filter(t => getLastRun(t.id)?.status === "running").length, color: "text-accent" },
              { label: "Runs", value: runs.length, color: "text-blue-400" },
            ].map((s, i) => (
              <div key={i} className="card-minimal p-3 md:p-4">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">{s.label}</div>
                <div className={`text-xl md:text-2xl font-light ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {myTemplates.length === 0 ? (
            <div className="card-minimal p-8 text-center">
              <Package size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">No blueprints yet</div>
              <p className="text-muted-foreground text-sm mt-2">Create your first blueprint with Σ or the visual builder.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button onClick={() => navigate("/intent-engine")} size="sm" className="gap-1.5">
                  <Plus size={12} /> Build with Σ
                </Button>
                <Button onClick={() => navigate("/blueprints/new/builder")} size="sm" variant="outline" className="gap-1.5">
                  <Pencil size={12} /> Blank Canvas
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {myTemplates.map((bp: any) => {
                const status = getStatusBadge(bp.id);
                const lastRun = getLastRun(bp.id);
                const StatusIcon = status.icon;
                return (
                  <div
                    key={bp.id}
                    className="card-minimal p-4 flex items-center gap-3 md:gap-4 hover:border-foreground/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/blueprints/${bp.id}/builder`)}
                  >
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${status.color}`}>
                      <StatusIcon size={14} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground truncate">{bp.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{bp.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${status.color}`}>{status.label}</Badge>
                        {bp.category && <span className="capitalize">{bp.category}</span>}
                        {lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatRelativeTime(lastRun.startedAt || lastRun.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 hidden md:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/blueprints/${bp.id}/builder`);
                        }}
                      >
                        <Pencil size={10} /> Edit
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/execution?deploy=${bp.id}`);
                        }}
                      >
                        <Play size={10} /> Deploy
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BROWSE MARKETPLACE */}
      {tab === "browse" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total Blueprints", value: blueprints.length, color: "text-foreground" },
              { label: "Industries", value: industries.length, color: "text-blue-400" },
              { label: "Total Deployments", value: blueprints.reduce((sum, b) => sum + (b.totalDeployments ?? 0), 0), color: "text-accent" },
            ].map((s, i) => (
              <div key={i} className="card-minimal p-3 md:p-4">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">{s.label}</div>
                <div className={`text-xl md:text-2xl font-light ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprints.map(bp => (
              <div key={bp.id} className="card-minimal p-5 flex flex-col hover:border-foreground/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="text-[10px]">{bp.pricingModel.replace("_", " ")}</Badge>
                  {bp.isCertified && <Shield size={13} className="text-accent" />}
                </div>
                <div className="text-base font-medium text-foreground mb-1">{bp.name}</div>
                {bp.category && <div className="text-[10px] text-muted-foreground mb-2">{bp.category}</div>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{bp.description}</p>

                <div className="grid grid-cols-3 gap-2 text-xs mb-4 pt-3 border-t border-border">
                  <div><div className="text-[10px] text-muted-foreground">Agents</div><div className="text-foreground flex items-center gap-1"><Cpu size={10} /> {bp.agentCount}</div></div>
                  <div><div className="text-[10px] text-muted-foreground">Est. Cost</div><div className="text-amber-400">${Number(bp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo</div></div>
                  <div><div className="text-[10px] text-muted-foreground">Value Gen</div><div className="text-accent">${Number(bp.totalValueGenerated ?? 0).toFixed(0)}</div></div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><Star size={10} className="text-amber-400" /><span className="text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                    <div className="flex items-center gap-1"><Download size={10} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">{bp.totalDeployments ?? 0}</span></div>
                  </div>
                  {Number(bp.price ?? 0) > 0 ? <span className="text-sm font-medium">${Number(bp.price).toLocaleString()}</span> : <span className="text-sm text-accent">Free</span>}
                </div>

                <Button
                  onClick={() => { setSelectedBp(bp); setDeployName(bp.name + " Co."); setShowDeploy(true); }}
                  variant="outline" size="sm" className="w-full gap-2 text-xs"
                >
                  <Rocket size={12} /> Deploy This Company
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE/PUBLISH TAB */}
      {tab === "create" && (
        <div className="max-w-2xl">
          <p className="text-xs text-muted-foreground mb-4">Publish a blueprint to the marketplace</p>
          <div className="card-minimal p-6 space-y-5">
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Company Name</label><Input value={newBp.name} onChange={e => setNewBp(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Content Marketing Agency" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Description</label><Textarea value={newBp.description} onChange={e => setNewBp(p => ({ ...p, description: e.target.value }))} placeholder="What does this company do? What outcomes does it produce?" className="resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Industry</label><Input value={newBp.industry} onChange={e => setNewBp(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. Digital Marketing" /></div>
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Agent Count</label><Input type="number" value={newBp.agentCount} onChange={e => setNewBp(p => ({ ...p, agentCount: e.target.value }))} placeholder="5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Est. Monthly Cost ($)</label><Input type="number" value={newBp.estimatedMonthlyCost} onChange={e => setNewBp(p => ({ ...p, estimatedMonthlyCost: e.target.value }))} placeholder="200" /></div>
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Est. Monthly Revenue ($)</label><Input type="number" value={newBp.estimatedMonthlyRevenue} onChange={e => setNewBp(p => ({ ...p, estimatedMonthlyRevenue: e.target.value }))} placeholder="5000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Pricing Model</label>
                <Select value={newBp.pricingModel} onValueChange={v => setNewBp(p => ({ ...p, pricingModel: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="one_time">One-Time</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="revenue_share">Revenue Share</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Price ($)</label><Input type="number" value={newBp.price} onChange={e => setNewBp(p => ({ ...p, price: e.target.value }))} placeholder="499" /></div>
            </div>
            <div className="h-px bg-border" />
            <Button
              onClick={() => createBpMut.mutate({
                name: newBp.name, description: newBp.description, industry: newBp.industry || undefined,
                agentCount: Number(newBp.agentCount) || 1, estimatedMonthlyCost: Number(newBp.estimatedMonthlyCost) || undefined,
                estimatedMonthlyRevenue: Number(newBp.estimatedMonthlyRevenue) || undefined,
                pricingModel: newBp.pricingModel as any, price: Number(newBp.price) || undefined,
              })}
              disabled={!newBp.name || !newBp.description || createBpMut.isPending}
              className="w-full gap-2"
            >
              <Rocket size={14} /> {createBpMut.isPending ? "Publishing..." : "Publish Blueprint"}
            </Button>
          </div>
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog open={showDeploy} onOpenChange={setShowDeploy}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-light">Deploy Company</DialogTitle></DialogHeader>
          {selectedBp && (
            <div className="space-y-4 mt-2">
              <div className="card-minimal p-4">
                <div className="text-sm font-medium text-foreground mb-1">{selectedBp.name}</div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{selectedBp.agentCount} agents</span>
                  <span className="text-amber-400">${Number(selectedBp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo cost</span>
                  <span className="text-accent">${Number(selectedBp.estimatedMonthlyRevenue ?? 0).toFixed(0)}/mo rev</span>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1.5 block">Company Name</label><Input value={deployName} onChange={e => setDeployName(e.target.value)} /></div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => deployBpMut.mutate({ blueprintId: selectedBp.id, companyName: deployName })}
                  disabled={!deployName || deployBpMut.isPending}
                  className="flex-1 gap-2"
                >
                  <Rocket size={12} /> {deployBpMut.isPending ? "Deploying..." : "Deploy Now"}
                </Button>
                <Button variant="outline" onClick={() => setShowDeploy(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
