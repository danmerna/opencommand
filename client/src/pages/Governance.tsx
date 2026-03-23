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
    { id: "gates", label: "Approval Gates", icon: Shield },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "tools", label: "Tool Registry", icon: Wrench },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-light text-foreground tracking-tight">Governance</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">Compliance controls, approval gates, audit trails, tool registry, and API webhooks for your agent organizations.</p>
          </div>
          {companies.length > 1 && (
            <Select value={String(companyId ?? "")} onValueChange={v => setSelectedCompanyId(Number(v))}>
              <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {!companyId ? (
        <div className="card-minimal p-10 text-center">
          <Shield size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
          <div className="text-base font-medium text-muted-foreground">No Company Selected</div>
          <p className="text-muted-foreground text-sm mt-2">Create a company in Mission Control to configure governance.</p>
        </div>
      ) : (
        <>
          {/* APPROVAL GATES */}
          {tab === "gates" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground">Human-in-the-loop controls</p>
                <Button onClick={() => setShowGateDialog(true)} size="sm" className="gap-1.5"><Plus size={12} /> Add Gate</Button>
              </div>
              {gates.length === 0 ? (
                <div className="card-minimal p-10 text-center">
                  <AlertTriangle size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <div className="text-base font-medium text-muted-foreground">No Gates Configured</div>
                  <p className="text-muted-foreground text-sm mt-2">Add approval gates to require human sign-off on critical operations.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gates.map(g => (
                    <div key={g.id} className="card-minimal p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${g.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}><Shield size={14} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground capitalize">{g.gateType.replace("_", " ")} Gate</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {g.threshold && <span className="text-xs text-muted-foreground">Threshold: ${g.threshold}</span>}
                          {g.description && <span className="text-xs text-muted-foreground">{g.description}</span>}
                          {g.requiresApproval && <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0 rounded">Human Required</span>}
                        </div>
                      </div>
                      <span className={`text-xs ${g.isActive ? "text-emerald-400" : "text-muted-foreground"}`}>{g.isActive ? "Active" : "Disabled"}</span>
                      <button onClick={() => deleteGateMut.mutate({ id: g.id })} className="text-muted-foreground hover:text-foreground transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === "audit" && (
            <div>
              <p className="text-xs text-muted-foreground mb-4">All agent actions logged</p>
              {auditLog.length === 0 ? (
                <div className="card-minimal p-10 text-center">
                  <FileText size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <div className="text-base font-medium text-muted-foreground">No Audit Entries</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="card-minimal p-3 flex items-center gap-4">
                      <div className="text-[10px] text-muted-foreground w-36 flex-shrink-0 font-mono">{new Date(entry.createdAt).toLocaleString()}</div>
                      <span className="text-xs text-blue-400 flex-shrink-0">{entry.action}</span>
                      {entry.entityType && <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0 rounded">{entry.entityType}</span>}
                      <span className="text-foreground text-xs flex-1 truncate">{entry.details}</span>
                      {entry.agentId && <span className="text-[10px] text-muted-foreground font-mono">Agent:{entry.agentId}</span>}
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
                <p className="text-xs text-muted-foreground">BYOA connectors & API integrations</p>
                <Button onClick={() => setShowToolDialog(true)} size="sm" className="gap-1.5"><Plus size={12} /> Register Tool</Button>
              </div>
              {tools.length === 0 ? (
                <div className="card-minimal p-10 text-center">
                  <Plug size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <div className="text-base font-medium text-muted-foreground">No Tools Registered</div>
                  <p className="text-muted-foreground text-sm mt-2">Register external APIs, tools, and connectors for your agents to use.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tools.map(tool => (
                    <div key={tool.id} className="card-minimal p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wrench size={13} className={tool.isActive ? "text-emerald-400" : "text-muted-foreground"} />
                          <span className="text-sm font-medium text-foreground">{tool.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tool.category && <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0 rounded">{tool.category}</span>}
                          <button onClick={() => deleteToolMut.mutate({ id: tool.id })} className="text-muted-foreground hover:text-foreground transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {tool.description && <p className="text-muted-foreground text-xs mb-2">{tool.description}</p>}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Globe size={10} />
                          <span className="truncate max-w-48">{tool.apiEndpoint || "No endpoint"}</span>
                        </div>
                        {Number(tool.costPerUse ?? 0) > 0 && <span className="text-amber-400">${tool.costPerUse}/use</span>}
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
                <p className="text-xs text-muted-foreground">Event-driven integrations</p>
                <Button onClick={() => setShowWebhookDialog(true)} size="sm" className="gap-1.5"><Plus size={12} /> Add Webhook</Button>
              </div>
              {webhooksList.length === 0 ? (
                <div className="card-minimal p-10 text-center">
                  <Webhook size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <div className="text-base font-medium text-muted-foreground">No Webhooks</div>
                  <p className="text-muted-foreground text-sm mt-2">Add webhooks to receive real-time notifications when events occur.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooksList.map(wh => (
                    <div key={wh.id} className="card-minimal p-4 flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${wh.isActive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{wh.name}</div>
                        <div className="text-xs text-muted-foreground truncate font-mono">{wh.url}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0 rounded">{wh.eventType}</span>
                      <button onClick={() => deleteWebhookMut.mutate({ id: wh.id })} className="text-muted-foreground hover:text-foreground transition-colors"><Trash2 size={14} /></button>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-light">Add Approval Gate</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Gate Type</label>
              <Select value={newGate.gateType} onValueChange={v => setNewGate(p => ({ ...p, gateType: v as typeof p.gateType }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend">Spend</SelectItem><SelectItem value="hire">Hire</SelectItem><SelectItem value="strategy">Strategy</SelectItem><SelectItem value="terminate">Terminate</SelectItem><SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Threshold ($)</label><Input type="number" value={newGate.threshold} onChange={e => setNewGate(p => ({ ...p, threshold: e.target.value }))} placeholder="500" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Description</label><Input value={newGate.description} onChange={e => setNewGate(p => ({ ...p, description: e.target.value }))} placeholder="Require approval for spend over $500" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Auto-Approve Below ($)</label><Input type="number" value={newGate.autoApproveBelow} onChange={e => setNewGate(p => ({ ...p, autoApproveBelow: e.target.value }))} placeholder="100" /></div>
            <Button onClick={() => companyId && createGateMut.mutate({ companyId, gateType: newGate.gateType, threshold: newGate.threshold ? Number(newGate.threshold) : undefined, description: newGate.description || undefined, autoApproveBelow: newGate.autoApproveBelow ? Number(newGate.autoApproveBelow) : undefined })} disabled={createGateMut.isPending} className="w-full gap-2">
              <Shield size={12} /> {createGateMut.isPending ? "Creating..." : "Create Gate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-light">Register Tool</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Name</label><Input value={newTool.name} onChange={e => setNewTool(p => ({ ...p, name: e.target.value }))} placeholder="Stripe API" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Category</label><Input value={newTool.category} onChange={e => setNewTool(p => ({ ...p, category: e.target.value }))} placeholder="Payments" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">API Endpoint</label><Input value={newTool.apiEndpoint} onChange={e => setNewTool(p => ({ ...p, apiEndpoint: e.target.value }))} placeholder="https://api.stripe.com/v1" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Description</label><Textarea value={newTool.description} onChange={e => setNewTool(p => ({ ...p, description: e.target.value }))} placeholder="What does this tool do?" className="resize-none" rows={2} /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Cost Per Use ($)</label><Input type="number" value={newTool.costPerUse} onChange={e => setNewTool(p => ({ ...p, costPerUse: e.target.value }))} placeholder="0.01" /></div>
            <Button onClick={() => companyId && createToolMut.mutate({ companyId, name: newTool.name, category: newTool.category || undefined, apiEndpoint: newTool.apiEndpoint || undefined, description: newTool.description || undefined, costPerUse: newTool.costPerUse ? Number(newTool.costPerUse) : undefined })} disabled={!newTool.name || createToolMut.isPending} className="w-full gap-2">
              <Wrench size={12} /> {createToolMut.isPending ? "Registering..." : "Register Tool"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-light">Add Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Name</label><Input value={newWebhook.name} onChange={e => setNewWebhook(p => ({ ...p, name: e.target.value }))} placeholder="Slack Notifications" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">URL</label><Input value={newWebhook.url} onChange={e => setNewWebhook(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.slack.com/..." /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Event Type</label><Input value={newWebhook.eventType} onChange={e => setNewWebhook(p => ({ ...p, eventType: e.target.value }))} placeholder="task.completed" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Secret (optional)</label><Input value={newWebhook.secret} onChange={e => setNewWebhook(p => ({ ...p, secret: e.target.value }))} placeholder="webhook-secret-key" /></div>
            <Button onClick={() => companyId && createWebhookMut.mutate({ companyId, name: newWebhook.name, url: newWebhook.url, eventType: newWebhook.eventType, secret: newWebhook.secret || undefined })} disabled={!newWebhook.name || !newWebhook.url || !newWebhook.eventType || createWebhookMut.isPending} className="w-full gap-2">
              <Webhook size={12} /> {createWebhookMut.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
