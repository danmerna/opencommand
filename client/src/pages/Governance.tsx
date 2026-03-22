import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import {
  Shield, Plus, Trash2, AlertTriangle, Plug, Wrench, Webhook,
  FileText, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Tab = "gates" | "audit" | "tools" | "webhooks";

export default function Governance() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("gates");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQ.data ?? [];
  const companyId = selectedCompanyId ?? companies[0]?.id;

  const gatesQ = trpc.governance.gates.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const auditQ = trpc.governance.auditLog.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const toolsQ = trpc.integrations.tools.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const webhooksQ = trpc.integrations.webhooks.useQuery({ companyId: companyId! }, { enabled: !!companyId });

  const gates = gatesQ.data ?? [];
  const auditLog = auditQ.data ?? [];
  const tools = toolsQ.data ?? [];
  const webhooksList = webhooksQ.data ?? [];

  const utils = trpc.useUtils();

  const createGateMut = trpc.governance.createGate.useMutation({
    onSuccess: () => { utils.governance.gates.invalidate(); toast.success("Approval gate created"); setShowGateDialog(false); }
  });
  const deleteGateMut = trpc.governance.removeGate.useMutation({
    onSuccess: () => { utils.governance.gates.invalidate(); toast.success("Gate removed"); }
  });
  const createToolMut = trpc.integrations.createTool.useMutation({
    onSuccess: () => { utils.integrations.tools.invalidate(); toast.success("Tool registered"); setShowToolDialog(false); }
  });
  const deleteToolMut = trpc.integrations.removeTool.useMutation({
    onSuccess: () => { utils.integrations.tools.invalidate(); toast.success("Tool removed"); }
  });
  const createWebhookMut = trpc.integrations.createWebhook.useMutation({
    onSuccess: () => { utils.integrations.webhooks.invalidate(); toast.success("Webhook created"); setShowWebhookDialog(false); }
  });
  const deleteWebhookMut = trpc.integrations.removeWebhook.useMutation({
    onSuccess: () => { utils.integrations.webhooks.invalidate(); toast.success("Webhook removed"); }
  });

  const [showGateDialog, setShowGateDialog] = useState(false);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newGate, setNewGate] = useState({ gateType: "spend" as const, threshold: "", description: "", autoApproveBelow: "" });
  const [newTool, setNewTool] = useState({ name: "", category: "", apiEndpoint: "", description: "", costPerUse: "" });
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", eventType: "", secret: "" });

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "gates", label: "APPROVAL GATES", icon: Shield },
    { id: "audit", label: "AUDIT LOG", icon: FileText },
    { id: "tools", label: "TOOL REGISTRY", icon: Wrench },
    { id: "webhooks", label: "WEBHOOKS", icon: Webhook },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="section-label mb-2">OPENCOMMAND</div>
        <div className="red-line mb-4" />
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-display text-5xl lg:text-6xl text-foreground">GOVERNANCE</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">Compliance controls, approval gates, audit trails, tool registry, and API webhooks for your agent organizations.</p>
          </div>
          {companies.length > 1 && (
            <Select value={String(companyId ?? "")} onValueChange={v => setSelectedCompanyId(Number(v))}>
              <SelectTrigger className="w-56 bg-input border-border text-foreground h-9"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {companies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 font-condensed font-bold text-xs uppercase tracking-wide transition-colors border-b-2 -mb-px ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {!companyId ? (
        <div className="brutal-card p-8 text-center">
          <Shield size={32} className="text-muted-foreground mx-auto mb-3" />
          <div className="font-condensed font-bold text-lg text-muted-foreground">NO COMPANY SELECTED</div>
          <p className="text-muted-foreground text-sm mt-2">Create a company in Mission Control to configure governance.</p>
        </div>
      ) : (
        <>
          {/* APPROVAL GATES */}
          {tab === "gates" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="section-label">APPROVAL GATES — HUMAN-IN-THE-LOOP CONTROLS</div>
                <Button onClick={() => setShowGateDialog(true)} className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1"><Plus size={12} /> ADD GATE</Button>
              </div>
              {gates.length === 0 ? (
                <div className="brutal-card p-8 text-center">
                  <AlertTriangle size={32} className="text-muted-foreground mx-auto mb-3" />
                  <div className="font-condensed font-bold text-lg text-muted-foreground">NO GATES CONFIGURED</div>
                  <p className="text-muted-foreground text-sm mt-2">Add approval gates to require human sign-off on critical operations.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gates.map(g => (
                    <div key={g.id} className="brutal-card p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center border ${g.isActive ? "border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)]" : "border-border text-muted-foreground"}`}><Shield size={14} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-condensed font-bold text-foreground uppercase">{g.gateType.replace("_", " ")} GATE</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {g.threshold && <span className="font-mono text-xs text-accent">THRESHOLD: ${g.threshold}</span>}
                          {g.description && <span className="font-mono text-xs text-muted-foreground">{g.description}</span>}
                          {g.requiresApproval && <span className="font-mono text-[0.6rem] text-[oklch(0.82_0.18_90)] border border-[oklch(0.82_0.18_90)] px-1.5 py-0">HUMAN REQUIRED</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs ${g.isActive ? "text-[oklch(0.65_0.18_142)]" : "text-muted-foreground"}`}>{g.isActive ? "ACTIVE" : "DISABLED"}</span>
                        <button onClick={() => deleteGateMut.mutate({ id: g.id })} className="text-muted-foreground hover:text-accent transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === "audit" && (
            <div>
              <div className="section-label mb-4">AUDIT TRAIL — ALL AGENT ACTIONS LOGGED</div>
              {auditLog.length === 0 ? (
                <div className="brutal-card p-8 text-center">
                  <FileText size={32} className="text-muted-foreground mx-auto mb-3" />
                  <div className="font-condensed font-bold text-lg text-muted-foreground">NO AUDIT ENTRIES</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="brutal-card p-3 flex items-center gap-4">
                      <div className="font-mono text-[0.6rem] text-muted-foreground w-36 flex-shrink-0">{new Date(entry.createdAt).toLocaleString()}</div>
                      <span className="font-mono text-xs text-[oklch(0.62_0.18_240)] flex-shrink-0">{entry.action}</span>
                      {entry.entityType && <span className="font-mono text-xs text-muted-foreground border border-border px-1.5 py-0 uppercase">{entry.entityType}</span>}
                      <span className="text-foreground text-xs flex-1 truncate">{entry.details}</span>
                      {entry.agentId && <span className="font-mono text-[0.6rem] text-muted-foreground">AGENT:{entry.agentId}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOOL REGISTRY */}
          {tab === "tools" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="section-label">TOOL REGISTRY — BYOA CONNECTORS & API INTEGRATIONS</div>
                <Button onClick={() => setShowToolDialog(true)} className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1"><Plus size={12} /> REGISTER TOOL</Button>
              </div>
              {tools.length === 0 ? (
                <div className="brutal-card p-8 text-center">
                  <Plug size={32} className="text-muted-foreground mx-auto mb-3" />
                  <div className="font-condensed font-bold text-lg text-muted-foreground">NO TOOLS REGISTERED</div>
                  <p className="text-muted-foreground text-sm mt-2">Register external APIs, tools, and connectors for your agents to use.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tools.map(tool => (
                    <div key={tool.id} className="brutal-card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wrench size={14} className={tool.isActive ? "text-[oklch(0.65_0.18_142)]" : "text-muted-foreground"} />
                          <span className="font-condensed font-bold text-foreground">{tool.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tool.category && <span className="font-mono text-xs text-muted-foreground border border-border px-1.5 py-0 uppercase">{tool.category}</span>}
                          <button onClick={() => deleteToolMut.mutate({ id: tool.id })} className="text-muted-foreground hover:text-accent transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {tool.description && <p className="text-muted-foreground text-xs mb-2">{tool.description}</p>}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Globe size={10} className="text-muted-foreground" />
                          <span className="font-mono text-muted-foreground truncate">{tool.apiEndpoint}</span>
                        </div>
                        {Number(tool.costPerUse ?? 0) > 0 && <span className="font-mono text-accent">${tool.costPerUse}/use</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WEBHOOKS */}
          {tab === "webhooks" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="section-label">WEBHOOKS — EVENT-DRIVEN INTEGRATIONS</div>
                <Button onClick={() => setShowWebhookDialog(true)} className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1"><Plus size={12} /> ADD WEBHOOK</Button>
              </div>
              {webhooksList.length === 0 ? (
                <div className="brutal-card p-8 text-center">
                  <Webhook size={32} className="text-muted-foreground mx-auto mb-3" />
                  <div className="font-condensed font-bold text-lg text-muted-foreground">NO WEBHOOKS</div>
                  <p className="text-muted-foreground text-sm mt-2">Add webhooks to receive real-time notifications when events occur.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooksList.map(wh => (
                    <div key={wh.id} className="brutal-card p-4 flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${wh.isActive ? "bg-[oklch(0.65_0.18_142)]" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-condensed font-bold text-foreground">{wh.name}</div>
                        <div className="font-mono text-xs text-muted-foreground truncate">{wh.url}</div>
                      </div>
                      <span className="font-mono text-[0.6rem] text-muted-foreground border border-border px-1.5 py-0 uppercase">{wh.eventType}</span>
                      <button onClick={() => deleteWebhookMut.mutate({ id: wh.id })} className="text-muted-foreground hover:text-accent transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Gate Dialog */}
      <Dialog open={showGateDialog} onOpenChange={setShowGateDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">ADD APPROVAL GATE</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">GATE TYPE</label>
              <Select value={newGate.gateType} onValueChange={v => setNewGate(p => ({ ...p, gateType: v as typeof p.gateType }))}>
                <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="spend">Spend</SelectItem><SelectItem value="hire">Hire</SelectItem><SelectItem value="strategy">Strategy</SelectItem><SelectItem value="terminate">Terminate</SelectItem><SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="section-label mb-2 block">THRESHOLD ($)</label><Input type="number" value={newGate.threshold} onChange={e => setNewGate(p => ({ ...p, threshold: e.target.value }))} placeholder="500" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Input value={newGate.description} onChange={e => setNewGate(p => ({ ...p, description: e.target.value }))} placeholder="Require approval for spend over $500" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">AUTO-APPROVE BELOW ($)</label><Input type="number" value={newGate.autoApproveBelow} onChange={e => setNewGate(p => ({ ...p, autoApproveBelow: e.target.value }))} placeholder="100" className="bg-input border-border text-foreground" /></div>
            <Button onClick={() => companyId && createGateMut.mutate({ companyId, gateType: newGate.gateType, threshold: newGate.threshold ? Number(newGate.threshold) : undefined, description: newGate.description || undefined, autoApproveBelow: newGate.autoApproveBelow ? Number(newGate.autoApproveBelow) : undefined })} disabled={createGateMut.isPending} className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2">
              <Shield size={12} /> {createGateMut.isPending ? "CREATING..." : "CREATE GATE"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">REGISTER TOOL</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">NAME</label><Input value={newTool.name} onChange={e => setNewTool(p => ({ ...p, name: e.target.value }))} placeholder="Stripe API" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">CATEGORY</label><Input value={newTool.category} onChange={e => setNewTool(p => ({ ...p, category: e.target.value }))} placeholder="Payments" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">API ENDPOINT</label><Input value={newTool.apiEndpoint} onChange={e => setNewTool(p => ({ ...p, apiEndpoint: e.target.value }))} placeholder="https://api.stripe.com/v1" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Textarea value={newTool.description} onChange={e => setNewTool(p => ({ ...p, description: e.target.value }))} placeholder="What does this tool do?" className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div><label className="section-label mb-2 block">COST PER USE ($)</label><Input type="number" value={newTool.costPerUse} onChange={e => setNewTool(p => ({ ...p, costPerUse: e.target.value }))} placeholder="0.01" className="bg-input border-border text-foreground" /></div>
            <Button onClick={() => companyId && createToolMut.mutate({ companyId, name: newTool.name, category: newTool.category || undefined, apiEndpoint: newTool.apiEndpoint || undefined, description: newTool.description || undefined, costPerUse: newTool.costPerUse ? Number(newTool.costPerUse) : undefined })} disabled={!newTool.name || createToolMut.isPending} className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2">
              <Wrench size={12} /> {createToolMut.isPending ? "REGISTERING..." : "REGISTER TOOL"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">ADD WEBHOOK</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">NAME</label><Input value={newWebhook.name} onChange={e => setNewWebhook(p => ({ ...p, name: e.target.value }))} placeholder="Slack Notifications" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">URL</label><Input value={newWebhook.url} onChange={e => setNewWebhook(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.slack.com/..." className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">EVENT TYPE</label><Input value={newWebhook.eventType} onChange={e => setNewWebhook(p => ({ ...p, eventType: e.target.value }))} placeholder="task.completed" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">SECRET (OPTIONAL)</label><Input value={newWebhook.secret} onChange={e => setNewWebhook(p => ({ ...p, secret: e.target.value }))} placeholder="webhook-secret-key" className="bg-input border-border text-foreground" /></div>
            <Button onClick={() => companyId && createWebhookMut.mutate({ companyId, name: newWebhook.name, url: newWebhook.url, eventType: newWebhook.eventType, secret: newWebhook.secret || undefined })} disabled={!newWebhook.name || !newWebhook.url || !newWebhook.eventType || createWebhookMut.isPending} className="w-full bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide gap-2">
              <Webhook size={12} /> {createWebhookMut.isPending ? "CREATING..." : "CREATE WEBHOOK"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
