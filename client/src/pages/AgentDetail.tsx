import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Check, X, Edit3, RefreshCw, Upload, Search,
  Shield, BarChart3, Clock, Target, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Tab = "approval" | "leads" | "inventory" | "guardrails" | "stats";

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const agentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("approval");

  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQ.data ?? [];
  const companyId = companies[0]?.id;

  const agentQ = trpc.agents.get.useQuery({ id: agentId }, { enabled: isAuthenticated && agentId > 0 });
  const agent = agentQ.data;

  const statsQ = trpc.leadResponse.stats.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const stats = statsQ.data;

  const promotionQ = trpc.leadResponse.promotionCheck.useQuery(
    { agentId, companyId: companyId! },
    { enabled: !!companyId && agentId > 0 },
  );

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "approval", label: "Approval Queue", icon: Check },
    { id: "leads", label: "Lead Queue", icon: Target },
    { id: "inventory", label: "Inventory", icon: Search },
    { id: "guardrails", label: "Guardrails", icon: Shield },
    { id: "stats", label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate("/mission-control")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to Mission Control
        </button>
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">Agent Detail</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-light text-foreground tracking-tight">{agent?.name ?? "Lead Response Agent"}</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">
              {agent?.jobDescription ?? "Monitors for inbound leads, drafts personalized responses with Magnetic AI DealBuilder links"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              L1 — Drafts for Review
            </Badge>
            {agent?.status && (
              <Badge variant="outline" className={agent.status === "active" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}>
                {agent.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} icon={<Target size={16} />} />
        <StatCard label="Avg Response Time" value={`${stats?.avgResponseTimeMins ?? 0}m`} icon={<Clock size={16} />} />
        <StatCard label="Approval Rate" value={`${stats?.approvalRate ?? 0}%`} icon={<Check size={16} />} />
        <StatCard label="Drafts Pending" value={stats?.draftsPending ?? 0} icon={<Edit3 size={16} />} />
      </div>

      {/* Promotion Banner */}
      {promotionQ.data?.eligible && (
        <div className="mb-6 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-400">{promotionQ.data.message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-emerald-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "approval" && <ApprovalQueue companyId={companyId} />}
      {tab === "leads" && <LeadQueue companyId={companyId} />}
      {tab === "inventory" && <InventoryTab companyId={companyId} />}
      {tab === "guardrails" && <GuardrailsTab companyId={companyId} />}
      {tab === "stats" && <StatsTab companyId={companyId} stats={stats} />}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon} {label}</div>
      <div className="text-2xl font-light text-foreground">{value}</div>
    </div>
  );
}

// ─── Approval Queue Tab ─────────────────────────────────────────────────────

function ApprovalQueue({ companyId }: { companyId: number | undefined }) {
  const draftsQ = trpc.leadResponse.draftsPending.useQuery(undefined, { enabled: true });
  const drafts = draftsQ.data ?? [];
  const utils = trpc.useUtils();

  const approveMut = trpc.leadResponse.draftsApprove.useMutation({
    onSuccess: () => { utils.leadResponse.draftsPending.invalidate(); utils.leadResponse.stats.invalidate(); toast.success("Draft approved"); },
    onError: (e) => toast.error(e.message),
  });
  const dismissMut = trpc.leadResponse.draftsDismiss.useMutation({
    onSuccess: () => { utils.leadResponse.draftsPending.invalidate(); toast.success("Draft dismissed"); },
  });
  const modifyMut = trpc.leadResponse.draftsModify.useMutation({
    onSuccess: () => { utils.leadResponse.draftsPending.invalidate(); toast.success("Draft modified and approved"); },
    onError: (e) => toast.error(e.message),
  });
  const executeMut = trpc.leadResponse.execute.useMutation({
    onSuccess: (data) => {
      utils.leadResponse.draftsPending.invalidate();
      utils.leadResponse.stats.invalidate();
      toast.success(`Response executed (${data.status})`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  if (drafts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Check size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">No pending drafts</p>
        <p className="text-sm mt-1">Ingest a lead to generate response drafts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map(draft => (
        <div key={draft.id} className="p-5 rounded-lg border border-border bg-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">Lead #{draft.leadId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {draft.channel === "email" ? "Email" : "SMS"} · {draft.wordCount} words · Confidence: {parseFloat(draft.confidenceScore ?? "0").toFixed(0)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              {draft.guardrailsPassed ? (
                <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">Guardrails Passed</Badge>
              ) : (
                <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">Guardrail Issues</Badge>
              )}
            </div>
          </div>

          {draft.subject && (
            <p className="text-sm text-foreground font-medium mb-2">Subject: {draft.subject}</p>
          )}

          {editingId === draft.id ? (
            <div className="mb-3">
              <Textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                className="min-h-[120px] text-sm font-mono"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => { modifyMut.mutate({ draftId: draft.id, body: editBody }); setEditingId(null); }}
                  disabled={modifyMut.isPending}
                >
                  Save & Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded bg-muted/30 text-sm text-foreground/80 whitespace-pre-wrap font-mono mb-3">
              {draft.body}
            </div>
          )}

          {draft.dealBuilderLink && (
            <p className="text-xs text-emerald-400 mb-3">DealBuilder: {draft.dealBuilderLink}</p>
          )}

          {draft.guardrailNotes && draft.guardrailNotes !== "All guardrails passed" && (
            <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-xs text-red-400 mb-3 font-mono">
              {draft.guardrailNotes}
            </div>
          )}

          {editingId !== draft.id && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => approveMut.mutate({ draftId: draft.id })}
                disabled={approveMut.isPending}
              >
                <Check size={14} className="mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingId(draft.id); setEditBody(draft.body); }}
              >
                <Edit3 size={14} className="mr-1" /> Modify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-red-400"
                onClick={() => dismissMut.mutate({ draftId: draft.id })}
                disabled={dismissMut.isPending}
              >
                <X size={14} className="mr-1" /> Dismiss
              </Button>
            </div>
          )}
        </div>
      ))}

      <div className="pt-4 border-t border-border">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={async () => {
            for (const draft of drafts) {
              if (draft.guardrailsPassed) {
                await approveMut.mutateAsync({ draftId: draft.id });
              }
            }
            toast.success("All eligible drafts approved");
          }}
          disabled={approveMut.isPending}
        >
          <Send size={14} className="mr-2" /> Deploy Auto-Reply ({drafts.filter(d => d.guardrailsPassed).length} ready)
        </Button>
      </div>
    </div>
  );
}

// ─── Lead Queue Tab ─────────────────────────────────────────────────────────

function LeadQueue({ companyId }: { companyId: number | undefined }) {
  const leadsQ = trpc.leadResponse.leadsList.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const allLeads = leadsQ.data ?? [];
  const [showIngest, setShowIngest] = useState(false);
  const [rawBody, setRawBody] = useState("");
  const utils = trpc.useUtils();

  const ingestMut = trpc.leadResponse.leadsIngest.useMutation({
    onSuccess: (data) => {
      utils.leadResponse.leadsList.invalidate();
      utils.leadResponse.draftsPending.invalidate();
      utils.leadResponse.stats.invalidate();
      toast.success(`Lead #${data.leadId} ingested, draft #${data.draftId} generated`);
      setShowIngest(false);
      setRawBody("");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusColors: Record<string, string> = {
    new: "border-blue-500/30 text-blue-400",
    processing: "border-yellow-500/30 text-yellow-400",
    draft_ready: "border-purple-500/30 text-purple-400",
    approved: "border-emerald-500/30 text-emerald-400",
    sent: "border-green-500/30 text-green-400",
    replied: "border-green-500/30 text-green-400",
    closed: "border-gray-500/30 text-gray-400",
    stale: "border-red-500/30 text-red-400",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{allLeads.length} leads</p>
        <Button size="sm" onClick={() => setShowIngest(true)}>
          <Send size={14} className="mr-1" /> Ingest Lead
        </Button>
      </div>

      {allLeads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No leads yet</p>
          <p className="text-sm mt-1">Paste a TractorHouse email or create a manual lead</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allLeads.map(lead => (
            <div key={lead.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{lead.contactName ?? "Unknown Contact"}</p>
                  <Badge variant="outline" className={`text-xs ${statusColors[lead.status] ?? ""}`}>{lead.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lead.equipmentInterest ?? "No equipment specified"} · {lead.source}
                  {lead.contactEmail && ` · ${lead.contactEmail}`}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {lead.receivedAt ? new Date(lead.receivedAt).toLocaleDateString() : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showIngest} onOpenChange={setShowIngest}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ingest Lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Paste a TractorHouse lead notification email or raw inquiry text.</p>
          <Textarea
            value={rawBody}
            onChange={e => setRawBody(e.target.value)}
            placeholder="Paste the email body here..."
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setShowIngest(false)}>Cancel</Button>
            <Button
              onClick={() => ingestMut.mutate({ rawBody, companyId: companyId!, source: "tractorhouse" })}
              disabled={!rawBody.trim() || !companyId || ingestMut.isPending}
            >
              {ingestMut.isPending ? "Processing..." : "Ingest & Generate Draft"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inventory Tab ──────────────────────────────────────────────────────────

function InventoryTab({ companyId }: { companyId: number | undefined }) {
  const inventoryQ = trpc.leadResponse.inventoryList.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const items = inventoryQ.data ?? [];
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMut = trpc.leadResponse.inventoryUpload.useMutation({
    onSuccess: (data) => {
      utils.leadResponse.inventoryList.invalidate();
      toast.success(`${data.count} inventory items uploaded`);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMut = trpc.leadResponse.inventoryRemove.useMutation({
    onSuccess: () => { utils.leadResponse.inventoryList.invalidate(); toast.success("Item removed"); },
  });

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }
      uploadMut.mutate({ companyId, items: parsed });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function parseCsv(text: string): Array<Record<string, any>> {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const items: Array<Record<string, any>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

      const item: Record<string, any> = {};
      // Map common CSV column names to our schema
      item.stockNumber = row.stocknumber || row.stock || row.stockno || row.stk || undefined;
      item.make = row.make || row.manufacturer || row.brand || undefined;
      item.model = row.model || undefined;
      item.year = parseInt(row.year) || undefined;
      item.category = row.category || row.type || row.equipmenttype || undefined;
      item.condition = (row.condition || "").toLowerCase() === "new" ? "new" : "used";
      item.price = parseFloat((row.price || row.listprice || row.askingprice || "").replace(/[$,]/g, "")) || undefined;
      item.location = row.location || row.store || row.branch || row.dealership || undefined;
      item.hours = parseInt(row.hours || row.enginehours || "") || undefined;
      item.description = row.description || row.notes || row.comments || undefined;
      item.daysOnLot = parseInt(row.daysonlot || row.dol || "") || undefined;

      if (item.make || item.model || item.stockNumber) {
        items.push(item);
      }
    }
    return items;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{items.length} items</p>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadMut.isPending}>
            <Upload size={14} className="mr-1" /> {uploadMut.isPending ? "Uploading..." : "Upload CSV"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No inventory loaded</p>
          <p className="text-sm mt-1">Upload an Anvil Pro CSV export to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Stock #</th>
                <th className="pb-2 pr-4">Year</th>
                <th className="pb-2 pr-4">Make</th>
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Price</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2 pr-4">Hours</th>
                <th className="pb-2 pr-4">Days on Lot</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 pr-4 font-mono text-xs">{item.stockNumber ?? "—"}</td>
                  <td className="py-2 pr-4">{item.year ?? "—"}</td>
                  <td className="py-2 pr-4">{item.make ?? "—"}</td>
                  <td className="py-2 pr-4">{item.model ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono">{item.price ? `$${parseFloat(item.price).toLocaleString()}` : "—"}</td>
                  <td className="py-2 pr-4">{item.location ?? "—"}</td>
                  <td className="py-2 pr-4">{item.hours ?? "—"}</td>
                  <td className="py-2 pr-4">{item.daysOnLot ?? "—"}</td>
                  <td className="py-2">
                    {item.isAvailable ? (
                      <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs">Sold</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Guardrails Tab ─────────────────────────────────────────────────────────

function GuardrailsTab({ companyId }: { companyId: number | undefined }) {
  const violationsQ = trpc.leadResponse.violations.useQuery({ companyId: companyId! }, { enabled: !!companyId });
  const violations = violationsQ.data ?? [];

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">{violations.length} recorded violations/warnings</p>
      </div>

      <div className="space-y-3 mb-8">
        <h3 className="text-sm font-medium text-foreground">Active Guardrails</h3>
        {[
          { code: "NO_PRICE_COMMIT", desc: "No price commitments without CFO approval", severity: "block" },
          { code: "NO_IMPERSONATION", desc: "Cannot impersonate human sales staff", severity: "block" },
          { code: "NO_INVENTORY_FABRICATION", desc: "Cannot reference inventory not in the system", severity: "block" },
          { code: "SIGN_AS_TEAM", desc: "Must sign as 'Johnson Tractor Team'", severity: "warning" },
          { code: "MAX_WORD_COUNT", desc: "Response must be under 150 words", severity: "warning" },
          { code: "MAX_FOLLOW_UPS", desc: "Maximum 3 follow-ups per lead", severity: "block" },
          { code: "MUST_INCLUDE_DEALBUILDER", desc: "Must include Magnetic AI DealBuilder link", severity: "warning" },
        ].map(rule => (
          <div key={rule.code} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <Shield size={14} className={rule.severity === "block" ? "text-red-400" : "text-yellow-400"} />
            <div className="flex-1">
              <p className="text-sm text-foreground">{rule.desc}</p>
              <p className="text-xs text-muted-foreground font-mono">{rule.code}</p>
            </div>
            <Badge variant="outline" className={`text-xs ${rule.severity === "block" ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}>
              {rule.severity}
            </Badge>
          </div>
        ))}
      </div>

      {violations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Violation Log</h3>
          <div className="space-y-2">
            {violations.map(v => (
              <div key={v.id} className="p-3 rounded-lg border border-border bg-card text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={12} className={v.severity === "block" ? "text-red-400" : "text-yellow-400"} />
                  <span className="font-mono text-xs text-muted-foreground">{v.ruleCode}</span>
                  <span className="text-xs text-muted-foreground">· Lead #{v.leadId}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground/70">{v.violationDetail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ──────────────────────────────────────────────────────────────

function StatsTab({ companyId, stats }: { companyId: number | undefined; stats: any }) {
  if (!stats) {
    return <p className="text-muted-foreground text-sm">Loading stats...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Leads Processed" value={stats.totalLeads} icon={<Target size={16} />} />
        <StatCard label="Leads Responded" value={stats.leadsSent} icon={<Send size={16} />} />
        <StatCard label="Average Response Time" value={`${stats.avgResponseTimeMins} min`} icon={<Clock size={16} />} />
        <StatCard label="Approval Rate" value={`${stats.approvalRate}%`} icon={<Check size={16} />} />
      </div>

      <div className="p-4 rounded-lg border border-border bg-card">
        <h3 className="text-sm font-medium text-foreground mb-2">Autonomy Promotion Status</h3>
        <p className="text-xs text-muted-foreground">
          Current level: <span className="text-emerald-400">L1 — Drafts for Review</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Promotion to L2 requires 95% approval rate over 30+ reviewed drafts with explicit CMO sign-off.
        </p>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, stats.approvalRate)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{stats.approvalRate}% approval rate</p>
      </div>
    </div>
  );
}
