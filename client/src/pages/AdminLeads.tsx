import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  UserPlus, Globe, Mail, Calendar, Search, ChevronDown, ChevronRight,
  ExternalLink, BarChart2, Building2, Zap, Copy
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Lead = {
  id: number;
  shareId: string;
  email: string | null;
  companyName: string;
  website: string;
  industry: string | null;
  recommendation: string | null;
  auditSummary: string | null;
  seoScore: number | null;
  techStack: unknown;
  socialPresence: unknown;
  createdAt: Date | string;
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "—";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

function SeoScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 70 ? "text-green-400 bg-green-400/10" : score >= 40 ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {score}/100
    </span>
  );
}

function LeadRow({ lead, isExpanded, onToggle }: { lead: Lead; isExpanded: boolean; onToggle: () => void }) {
  const copyShareUrl = () => {
    const url = `${window.location.origin}/results/${lead.shareId}`;
    navigator.clipboard.writeText(url);
    toast.success("Results link copied");
  };

  return (
    <>
      <tr
        className="border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium text-foreground">{lead.companyName}</p>
              {lead.industry && <p className="text-xs text-muted-foreground">{lead.industry}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-sm text-[#00D4AA] hover:underline flex items-center gap-1">
              <Mail size={12} /> {lead.email}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">Skipped</span>
          )}
        </td>
        <td className="px-4 py-3">
          <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 max-w-[200px] truncate">
            <Globe size={12} className="shrink-0" /> {lead.website.replace(/^https?:\/\//, "")}
          </a>
        </td>
        <td className="px-4 py-3">
          <SeoScoreBadge score={lead.seoScore} />
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-muted-foreground" title={fmtDate(lead.createdAt)}>
            {fmtRelative(lead.createdAt)}
          </div>
        </td>
        <td className="px-4 py-3">
          <button onClick={(e) => { e.stopPropagation(); copyShareUrl(); }} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Copy results link">
            <Copy size={14} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border bg-card/50">
          <td colSpan={6} className="px-6 py-4">
            <ExpandedLeadDetails lead={lead} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedLeadDetails({ lead }: { lead: Lead }) {
  const intentHistoryQ = trpc.admin.leadIntentHistory.useQuery(
    { userId: undefined, email: lead.email ?? undefined },
    { enabled: false } // We'll show what we have from the lead itself
  );

  const techStack = lead.techStack as { frameworks?: string[]; analytics?: string[]; adPixels?: string[]; crm?: string[] } | null;
  const socialPresence = lead.socialPresence as Record<string, string> | null;

  return (
    <div className="space-y-4">
      {/* Σ Recommendation */}
      {lead.recommendation && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#00D4AA] flex items-center gap-1.5">
            <Zap size={12} /> Σ Recommendation
          </h4>
          <div className="bg-background border border-border rounded-lg p-4 text-sm text-foreground/90 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {lead.recommendation}
          </div>
        </div>
      )}

      {/* Audit Summary */}
      {lead.auditSummary && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BarChart2 size={12} /> Audit Summary
          </h4>
          <div className="bg-background border border-border rounded-lg p-4 text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
            {lead.auditSummary}
          </div>
        </div>
      )}

      {/* Tech Stack & Social */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {techStack && Object.keys(techStack).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tech Stack</h4>
            <div className="bg-background border border-border rounded-lg p-3 space-y-2">
              {techStack.frameworks && techStack.frameworks.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground">Frameworks:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {techStack.frameworks.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.analytics && techStack.analytics.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground">Analytics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {techStack.analytics.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.adPixels && techStack.adPixels.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground">Ad Pixels:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {techStack.adPixels.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.crm && techStack.crm.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground">CRM:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {techStack.crm.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {socialPresence && Object.keys(socialPresence).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Presence</h4>
            <div className="bg-background border border-border rounded-lg p-3 space-y-1.5">
              {Object.entries(socialPresence).map(([platform, url]) => (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                  <ExternalLink size={12} /> {platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share link */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Results page:</span>
        <a
          href={`/results/${lead.shareId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#00D4AA] hover:underline flex items-center gap-1"
        >
          /results/{lead.shareId} <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

export default function AdminLeads() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const leadsQ = trpc.admin.leads.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const leads = (leadsQ.data ?? []) as Lead[];

  const filtered = leads.filter(lead => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.companyName.toLowerCase().includes(q) ||
      (lead.email?.toLowerCase().includes(q) ?? false) ||
      lead.website.toLowerCase().includes(q) ||
      (lead.industry?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalLeads = leads.length;
  const withEmail = leads.filter(l => l.email).length;
  const avgSeo = leads.filter(l => l.seoScore !== null).reduce((sum, l) => sum + (l.seoScore ?? 0), 0) / (leads.filter(l => l.seoScore !== null).length || 1);
  const todayLeads = leads.filter(l => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick Start leads with website audit results and Σ recommendations
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center">
                <UserPlus size={16} className="text-[#00D4AA]" />
              </div>
              <div>
                <p className="text-xl font-semibold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <Mail size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-semibold">{withEmail}</p>
                <p className="text-xs text-muted-foreground">With Email</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <BarChart2 size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xl font-semibold">{Math.round(avgSeo)}</p>
                <p className="text-xs text-muted-foreground">Avg SEO Score</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-400/10 flex items-center justify-center">
                <Calendar size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-semibold">{todayLeads}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company, email, website, or industry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/30 focus:border-[#00D4AA]/50 transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {leadsQ.isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading leads...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No leads match your search" : "No leads yet. Share the /chief-of-staff page to start collecting."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SEO</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      isExpanded={expandedId === lead.id}
                      onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer stats */}
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} of {totalLeads} leads
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
