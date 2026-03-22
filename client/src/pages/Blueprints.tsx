import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Rocket, Star, Download, Eye, DollarSign,
  Copy, ChevronRight, Cpu, Building2, BarChart3, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "browse" | "my-blueprints" | "create";

export default function Blueprints() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");
  const [showDeploy, setShowDeploy] = useState(false);
  const [selectedBp, setSelectedBp] = useState<any>(null);
  const [deployName, setDeployName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newBp, setNewBp] = useState({
    name: "", description: "", industry: "", agentCount: "",
    estimatedMonthlyCost: "", estimatedMonthlyRevenue: "", pricingModel: "one_time", price: ""
  });

  const utils = trpc.useUtils();
  const blueprintsQ = trpc.blueprints.list.useQuery();
  const myBpQ = trpc.blueprints.myBlueprints.useQuery(undefined, { enabled: isAuthenticated });

  const createBpMut = trpc.blueprints.create.useMutation({
    onSuccess: () => {
      utils.blueprints.list.invalidate();
      utils.blueprints.myBlueprints.invalidate();
      setShowCreate(false);
      setNewBp({ name: "", description: "", industry: "", agentCount: "", estimatedMonthlyCost: "", estimatedMonthlyRevenue: "", pricingModel: "one_time", price: "" });
      toast.success("Blueprint published");
    }
  });

  const deployBpMut = trpc.blueprints.deploy.useMutation({
    onSuccess: (data) => {
      setShowDeploy(false);
      toast.success(`Company deployed successfully (ID: ${data.companyId})`);
    }
  });

  const blueprints = blueprintsQ.data ?? [];
  const myBlueprints = myBpQ.data ?? [];

  const industries = Array.from(new Set(blueprints.map(b => b.category).filter(Boolean)));

  const pricingColors: Record<string, string> = {
    one_time: "text-muted-foreground border-muted-foreground",
    monthly: "text-[oklch(0.62_0.18_240)] border-[oklch(0.62_0.18_240)]",
    revenue_share: "text-accent border-accent",
    franchise: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]",
  };

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "browse", label: "BROWSE BLUEPRINTS", icon: Package },
    { id: "my-blueprints", label: "MY BLUEPRINTS", icon: Building2 },
    { id: "create", label: "CREATE", icon: Plus },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="section-label mb-2">OPENCOMMAND</div>
        <div className="red-line mb-4" />
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-display text-5xl lg:text-6xl text-foreground">COMPANY BLUEPRINTS</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">Deploy pre-configured zero-human companies in one click. Each blueprint includes the full agent org chart, budget allocations, OKRs, and execution playbooks.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
            <Plus size={12} /> PUBLISH BLUEPRINT
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 font-condensed font-bold text-xs uppercase tracking-wide transition-colors border-b-2 -mb-px ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ BROWSE ═══ */}
      {tab === "browse" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-border mb-6">
            <div className="bg-background brutal-card p-4">
              <div className="section-label mb-1">TOTAL BLUEPRINTS</div>
              <div className="font-condensed font-black text-3xl text-foreground">{blueprints.length}</div>
            </div>
            <div className="bg-background brutal-card p-4">
              <div className="section-label mb-1">INDUSTRIES</div>
              <div className="font-condensed font-black text-3xl text-[oklch(0.62_0.18_240)]">{industries.length}</div>
            </div>
            <div className="bg-background brutal-card p-4">
              <div className="section-label mb-1">TOTAL DEPLOYMENTS</div>
              <div className="font-condensed font-black text-3xl text-[oklch(0.65_0.18_142)]">{blueprints.reduce((sum, b) => sum + (b.totalDeployments ?? 0), 0)}</div>
            </div>
          </div>

          {/* Blueprint Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprints.map(bp => (
              <div key={bp.id} className="brutal-card-hover p-6 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className={`font-mono text-xs border px-2 py-0.5 uppercase ${pricingColors[bp.pricingModel] ?? pricingColors.one_time}`}>{bp.pricingModel.replace("_", " ")}</span>
                  {bp.isCertified && <Shield size={14} className="text-[oklch(0.65_0.18_142)]" />}
                </div>
                <div className="font-condensed font-black text-xl text-foreground mb-1">{bp.name}</div>
                {bp.category && <div className="section-label mb-2">{bp.category}</div>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{bp.description}</p>

                <div className="grid grid-cols-3 gap-2 text-xs mb-4 pt-3 border-t border-border">
                  <div>
                    <div className="section-label">AGENTS</div>
                    <div className="font-condensed font-bold text-foreground flex items-center gap-1"><Cpu size={10} /> {bp.agentCount}</div>
                  </div>
                  <div>
                    <div className="section-label">EST. COST</div>
                    <div className="font-condensed font-bold text-accent">${Number(bp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo</div>
                  </div>
                  <div>
                    <div className="section-label">VALUE GEN</div>
                    <div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">${Number(bp.totalValueGenerated ?? 0).toFixed(0)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><Star size={10} className="text-[oklch(0.82_0.18_90)]" /><span className="font-mono text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                    <div className="flex items-center gap-1"><Download size={10} className="text-muted-foreground" /><span className="font-mono text-xs text-muted-foreground">{bp.totalDeployments ?? 0}</span></div>
                  </div>
                  {Number(bp.price ?? 0) > 0 && <div className="font-condensed font-bold text-foreground">${Number(bp.price).toLocaleString()}</div>}
                  {Number(bp.price ?? 0) === 0 && <div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">FREE</div>}
                </div>

                <button
                  onClick={() => { setSelectedBp(bp); setDeployName(bp.name + " Co."); setShowDeploy(true); }}
                  className="w-full bg-accent/10 border border-accent text-accent font-condensed font-bold text-xs py-2.5 uppercase tracking-wide hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Rocket size={12} /> DEPLOY THIS COMPANY
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MY BLUEPRINTS ═══ */}
      {tab === "my-blueprints" && (
        <div>
          <div className="section-label mb-4">YOUR PUBLISHED BLUEPRINTS</div>
          {myBlueprints.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <Package size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO BLUEPRINTS YET</div>
              <p className="text-muted-foreground text-sm mt-2">Create and publish your first zero-human company blueprint.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
                <Plus size={12} /> CREATE BLUEPRINT
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myBlueprints.map(bp => (
                <div key={bp.id} className="brutal-card p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-condensed font-bold text-lg text-foreground">{bp.name}</div>
                      <span className={`font-mono text-xs border px-2 py-0.5 uppercase ${pricingColors[bp.pricingModel]}`}>{bp.pricingModel.replace("_", " ")}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">{bp.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-condensed font-bold text-foreground">{bp.totalDeployments ?? 0} deploys</div>
                    <div className="font-mono text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)} rating</div>
                  </div>
                  <div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">${Number(bp.totalValueGenerated ?? 0).toFixed(0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATE TAB ═══ */}
      {tab === "create" && (
        <div className="max-w-2xl">
          <div className="section-label mb-4">BUILD A COMPANY BLUEPRINT</div>
          <div className="brutal-card p-6 space-y-5">
            <div><label className="section-label mb-2 block">COMPANY NAME</label><Input value={newBp.name} onChange={e => setNewBp(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Content Marketing Agency" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Textarea value={newBp.description} onChange={e => setNewBp(p => ({ ...p, description: e.target.value }))} placeholder="What does this company do? What outcomes does it produce?" className="bg-input border-border text-foreground resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">INDUSTRY</label><Input value={newBp.industry} onChange={e => setNewBp(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. Digital Marketing" className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">AGENT COUNT</label><Input type="number" value={newBp.agentCount} onChange={e => setNewBp(p => ({ ...p, agentCount: e.target.value }))} placeholder="5" className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">EST. MONTHLY COST ($)</label><Input type="number" value={newBp.estimatedMonthlyCost} onChange={e => setNewBp(p => ({ ...p, estimatedMonthlyCost: e.target.value }))} placeholder="200" className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">EST. MONTHLY REVENUE ($)</label><Input type="number" value={newBp.estimatedMonthlyRevenue} onChange={e => setNewBp(p => ({ ...p, estimatedMonthlyRevenue: e.target.value }))} placeholder="5000" className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">PRICING MODEL</label>
                <Select value={newBp.pricingModel} onValueChange={v => setNewBp(p => ({ ...p, pricingModel: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border"><SelectItem value="one_time">One-Time</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="revenue_share">Revenue Share</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="section-label mb-2 block">PRICE ($)</label><Input type="number" value={newBp.price} onChange={e => setNewBp(p => ({ ...p, price: e.target.value }))} placeholder="499" className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="red-line" />
            <Button
              onClick={() => createBpMut.mutate({
                name: newBp.name, description: newBp.description, industry: newBp.industry || undefined,
                agentCount: Number(newBp.agentCount) || 1, estimatedMonthlyCost: Number(newBp.estimatedMonthlyCost) || undefined,
                estimatedMonthlyRevenue: Number(newBp.estimatedMonthlyRevenue) || undefined,
                pricingModel: newBp.pricingModel as any, price: Number(newBp.price) || undefined,
              })}
              disabled={!newBp.name || !newBp.description || createBpMut.isPending}
              className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2"
            >
              <Rocket size={14} /> {createBpMut.isPending ? "PUBLISHING..." : "PUBLISH BLUEPRINT"}
            </Button>
          </div>
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog open={showDeploy} onOpenChange={setShowDeploy}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">DEPLOY COMPANY</DialogTitle></DialogHeader>
          {selectedBp && (
            <div className="space-y-4 mt-2">
              <div className="brutal-card p-4">
                <div className="font-condensed font-bold text-lg text-foreground mb-1">{selectedBp.name}</div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="section-label">{selectedBp.agentCount} AGENTS</span>
                  <span className="text-accent">${Number(selectedBp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo cost</span>
                  <span className="text-[oklch(0.65_0.18_142)]">${Number(selectedBp.estimatedMonthlyRevenue ?? 0).toFixed(0)}/mo rev</span>
                </div>
              </div>
              <div><label className="section-label mb-2 block">COMPANY NAME</label><Input value={deployName} onChange={e => setDeployName(e.target.value)} className="bg-input border-border text-foreground" /></div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => deployBpMut.mutate({ blueprintId: selectedBp.id, companyName: deployName })}
                  disabled={!deployName || deployBpMut.isPending}
                  className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2"
                >
                  <Rocket size={12} /> {deployBpMut.isPending ? "DEPLOYING..." : "DEPLOY NOW"}
                </Button>
                <Button variant="outline" onClick={() => setShowDeploy(false)} className="border-border text-muted-foreground font-condensed font-bold uppercase">CANCEL</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog (alternative to tab) */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">PUBLISH BLUEPRINT</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">NAME</label><Input value={newBp.name} onChange={e => setNewBp(p => ({ ...p, name: e.target.value }))} placeholder="Content Marketing Agency" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Textarea value={newBp.description} onChange={e => setNewBp(p => ({ ...p, description: e.target.value }))} className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">INDUSTRY</label><Input value={newBp.industry} onChange={e => setNewBp(p => ({ ...p, industry: e.target.value }))} className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">AGENTS</label><Input type="number" value={newBp.agentCount} onChange={e => setNewBp(p => ({ ...p, agentCount: e.target.value }))} className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">PRICE ($)</label><Input type="number" value={newBp.price} onChange={e => setNewBp(p => ({ ...p, price: e.target.value }))} className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">MODEL</label>
                <Select value={newBp.pricingModel} onValueChange={v => setNewBp(p => ({ ...p, pricingModel: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border"><SelectItem value="one_time">One-Time</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="revenue_share">Revenue Share</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => createBpMut.mutate({ name: newBp.name, description: newBp.description, industry: newBp.industry || undefined, agentCount: Number(newBp.agentCount) || 1, pricingModel: newBp.pricingModel as any, price: Number(newBp.price) || undefined })} disabled={!newBp.name || !newBp.description || createBpMut.isPending} className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2"><Rocket size={12} /> {createBpMut.isPending ? "PUBLISHING..." : "PUBLISH"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
