import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Star, ShoppingBag, Check, Users, Package,
  Cpu, Shield, TrendingUp, Award, Wrench, Download, ChevronRight
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tab = "agents" | "blueprints" | "skills" | "leaderboard";

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("agents");
  const listingsQ = trpc.marketplace.list.useQuery();
  const blueprintsQ = trpc.blueprints.list.useQuery();
  const skillsQ = trpc.skills.list.useQuery();
  const checkoutMut = trpc.payments.checkout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast("Redirecting to checkout...", { description: "A new tab will open for payment." });
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error("Checkout failed", { description: err.message }),
  });

  const listings = listingsQ.data ?? [];
  const blueprints = blueprintsQ.data ?? [];
  const skills = skillsQ.data ?? [];
  const tierOrder = ["solo_founder", "enterprise", "custom"];
  const sorted = [...listings].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
  const leaderboard = [...blueprints].sort((a, b) => Number(b.totalValueGenerated ?? 0) - Number(a.totalValueGenerated ?? 0)).slice(0, 10);

  const tabs: { id: Tab; label: string; icon: typeof ShoppingBag; count: number }[] = [
    { id: "agents", label: "AI Agents", icon: Cpu, count: listings.length },
    { id: "blueprints", label: "Blueprints", icon: Package, count: blueprints.length },
    { id: "skills", label: "Skills", icon: Wrench, count: skills.length },
    { id: "leaderboard", label: "Leaderboard", icon: Award, count: leaderboard.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-semibold">OC</span>
            </div>
            <span className="text-foreground font-medium tracking-tight">OpenCommand</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/blueprints" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blueprints</Link>
          <Link href="/creator-program" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Creators</Link>
          {isAuthenticated ? (
            <Link href="/mission-control">
              <Button size="sm" variant="outline" className="text-xs">Mission Control</Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm" className="text-xs">Get Started</Button>
            </a>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="px-6 pt-20 pb-12 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">OpenCommand Marketplace</p>
        <h1 className="text-5xl lg:text-6xl font-light text-foreground tracking-tight leading-[1.1] mb-5">
          Deploy your<br /><span className="text-muted-foreground">zero-human workforce</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
          AI agents, company blueprints, and skills — everything you need to build and scale autonomous businesses with verified Proof of Outcome.
        </p>
      </section>

      <div className="h-px bg-border" />

      {/* Tabs */}
      <div className="px-6 max-w-5xl mx-auto">
        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon size={14} /> {t.label}
              <span className="text-xs text-muted-foreground ml-1">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI AGENTS */}
      {tab === "agents" && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag size={32} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">Marketplace loading</div>
              <p className="text-muted-foreground text-sm mt-1">Sign in to initialize the marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {sorted.map(listing => {
                const isEnterprise = listing.tier === "enterprise";
                const features: string[] = (() => { try { return JSON.parse(listing.features as unknown as string ?? "[]"); } catch { return []; } })();
                return (
                  <div key={listing.id} className={`flex flex-col card-minimal p-6 ${isEnterprise ? "border-foreground/30" : ""}`}>
                    {isEnterprise && (
                      <Badge className="self-start mb-3 bg-foreground text-background text-[10px]">Flagship</Badge>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">{listing.tier.replace("_", " ")}</Badge>
                      {listing.avgRating && Number(listing.avgRating) > 0 && (
                        <div className="flex items-center gap-1"><Star size={11} className="text-amber-400 fill-amber-400" /><span className="text-xs text-muted-foreground">{Number(listing.avgRating).toFixed(1)}</span></div>
                      )}
                    </div>
                    <h2 className="text-xl font-medium text-foreground mb-1">{listing.name}</h2>
                    {listing.tagline && <p className="text-xs text-muted-foreground mb-3">{listing.tagline}</p>}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">{listing.description}</p>
                    <ul className="space-y-2 mb-5">
                      {features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-foreground"><Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />{f}</li>
                      ))}
                    </ul>
                    {listing.endorsedBy && (
                      <div className="border border-border rounded-lg p-3 mb-5">
                        <div className="text-[10px] text-muted-foreground mb-2">Creator Endorsed</div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-[10px] font-semibold">{listing.endorsedBy.charAt(0)}</span></div>
                          <div>
                            <div className="text-xs font-medium text-foreground">{listing.endorsedBy}</div>
                            <div className="text-[10px] text-muted-foreground">{listing.endorserHandle} · {listing.endorserNiche}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="border-t border-border pt-4 mb-5">
                      {listing.price ? (
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-light text-foreground">${Number(listing.price).toFixed(0)}</span>
                          <span className="text-muted-foreground text-sm mb-1">/{listing.pricingModel === "monthly" ? "mo" : listing.pricingModel}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xl font-light text-foreground">5% value capture</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Pay only when Arch creates value</div>
                        </div>
                      )}
                      {listing.totalPurchases > 0 && (
                        <div className="flex items-center gap-1 mt-1.5"><Users size={11} className="text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{listing.totalPurchases} deployed</span></div>
                      )}
                    </div>
                    {isAuthenticated ? (
                      <Button
                        onClick={() => {
                          const productKey = listing.tier === "enterprise" ? "enterprise_ceo" : "solo_founder_ceo";
                          checkoutMut.mutate({ productKey, listingId: listing.id, origin: window.location.origin });
                        }}
                        disabled={checkoutMut.isPending}
                        size="sm"
                        className="w-full gap-2"
                      >
                        {checkoutMut.isPending ? "Processing..." : <>Deploy Now <ArrowRight size={14} /></>}
                      </Button>
                    ) : (
                      <a href={getLoginUrl()}>
                        <Button size="sm" className="w-full gap-2">Get Started <ArrowRight size={14} /></Button>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* BLUEPRINTS */}
      {tab === "blueprints" && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-muted-foreground">Zero-human company blueprints — deploy in one click</p>
            {isAuthenticated && (
              <Link href="/blueprints" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Manage Blueprints <ChevronRight size={12} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprints.map(bp => (
              <div key={bp.id} className="card-minimal p-5 flex flex-col hover:border-foreground/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">{bp.pricingModel.replace("_", " ")}</Badge>
                  {bp.isCertified && <Shield size={13} className="text-emerald-400" />}
                </div>
                <div className="text-base font-medium text-foreground mb-1">{bp.name}</div>
                {bp.category && <div className="text-[10px] text-muted-foreground mb-2">{bp.category}</div>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{bp.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-4 pt-3 border-t border-border">
                  <div><div className="text-[10px] text-muted-foreground">Agents</div><div className="text-foreground flex items-center gap-1"><Cpu size={10} /> {bp.agentCount}</div></div>
                  <div><div className="text-[10px] text-muted-foreground">Est. Cost</div><div className="text-amber-400">${Number(bp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo</div></div>
                  <div><div className="text-[10px] text-muted-foreground">Value Gen</div><div className="text-emerald-400">${Number(bp.totalValueGenerated ?? 0).toFixed(0)}</div></div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><Star size={10} className="text-amber-400" /><span className="text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                    <div className="flex items-center gap-1"><Download size={10} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">{bp.totalDeployments ?? 0}</span></div>
                  </div>
                  {Number(bp.price ?? 0) > 0 ? <span className="text-sm font-medium text-foreground">${Number(bp.price).toLocaleString()}</span> : <span className="text-sm text-emerald-400">Free</span>}
                </div>
                {bp.endorsedBy && (
                  <div className="border border-border rounded-lg p-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-[9px] font-semibold">{bp.endorsedBy.charAt(0)}</span></div>
                      <div><div className="text-xs font-medium text-foreground">{bp.endorsedBy}</div><div className="text-[10px] text-muted-foreground">{bp.endorserHandle}</div></div>
                    </div>
                  </div>
                )}
                {isAuthenticated ? (
                  <Button
                    onClick={() => {
                      if (Number(bp.price ?? 0) > 0) {
                        checkoutMut.mutate({ productKey: "blueprint_" + bp.id, blueprintId: bp.id, origin: window.location.origin });
                      } else {
                        toast("Free blueprint!", { description: "Redirecting to deployment..." });
                        window.location.href = "/blueprints";
                      }
                    }}
                    disabled={checkoutMut.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                  >
                    <Package size={12} /> {Number(bp.price ?? 0) > 0 ? (checkoutMut.isPending ? "Processing..." : "Purchase & Deploy") : "Deploy Free"}
                  </Button>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs"><Package size={12} /> Get Started</Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SKILLS */}
      {tab === "skills" && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <p className="text-xs text-muted-foreground mb-6">Agent skills marketplace — extend your agents' capabilities</p>
          {skills.length === 0 ? (
            <div className="text-center py-16">
              <Wrench size={28} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">Skills loading</div>
              <p className="text-muted-foreground text-sm mt-1">Sign in to initialize the skills marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="card-minimal p-5 hover:border-foreground/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className="border-blue-800 text-blue-400 text-[10px]">{skill.category}</Badge>
                    <div className="flex items-center gap-1"><Star size={10} className="text-amber-400" /><span className="text-xs text-muted-foreground">{Number(skill.avgRating ?? 0).toFixed(1)}</span></div>
                  </div>
                  <div className="text-base font-medium text-foreground mb-1">{skill.name}</div>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">{skill.description}</p>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                    <span className="text-muted-foreground">{skill.totalInstalls ?? 0} installs</span>
                    {Number(skill.price ?? 0) > 0 ? <span className="text-sm font-medium text-foreground">${Number(skill.price).toFixed(0)}</span> : <span className="text-emerald-400">Free</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LEADERBOARD */}
      {tab === "leaderboard" && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <p className="text-xs text-muted-foreground mb-6">Top performing blueprints — ranked by verified value generated</p>
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Award size={28} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">No data yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((bp, i) => (
                <div key={bp.id} className={`card-minimal p-4 flex items-center gap-5 ${i === 0 ? "border-l-2 border-l-foreground" : ""}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${i === 0 ? "border-foreground text-foreground" : i < 3 ? "border-amber-700 text-amber-400" : "border-border text-muted-foreground"}`}>
                    <span className="text-sm font-medium">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{bp.name}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {bp.category && <span className="text-[10px] text-muted-foreground">{bp.category}</span>}
                      <span className="text-[10px] text-muted-foreground">{bp.agentCount} agents</span>
                      <span className="text-[10px] text-muted-foreground">{bp.totalDeployments ?? 0} deploys</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-light text-emerald-400">${Number(bp.totalValueGenerated ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">value generated</div>
                  </div>
                  <div className="flex items-center gap-1"><Star size={10} className="text-amber-400" /><span className="text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                  {bp.isCertified && <Shield size={13} className="text-emerald-400" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="h-px bg-border" />

      {/* PoO Guarantee */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">The Guarantee</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-6">Proof of Outcome<br />or your money back</h2>
        <p className="text-muted-foreground text-base mb-12 max-w-2xl mx-auto leading-relaxed">
          Every task executed by an OpenCommand agent generates a cryptographically-signed Proof of Outcome receipt documenting the exact value created. No vague promises. No vanity metrics. Just receipts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Labor Hours Saved", value: "321.6 hrs", desc: "Documented in PoO receipts" },
            { label: "Dollar Value Created", value: "$48,240", desc: "Verified and auditable" },
            { label: "Receipts Issued", value: "1,847", desc: "Across all deployments" },
          ].map((s, i) => (
            <div key={i} className="card-minimal p-6">
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">{s.label}</div>
              <div className="text-3xl font-light text-foreground mb-1">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="h-px bg-border" />
      <footer className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center"><span className="text-background text-[8px] font-semibold">OC</span></div>
          <span className="text-xs text-muted-foreground">OpenCommand</span>
        </div>
        <div className="text-[10px] text-muted-foreground">Marketplace · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
