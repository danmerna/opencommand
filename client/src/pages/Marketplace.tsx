import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Star, ShoppingBag, Zap, Check, Users, Package,
  Cpu, Shield, TrendingUp, Award, Wrench, Download, ChevronRight
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

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
    onError: (err) => {
      toast.error("Checkout failed", { description: err.message });
    },
  });

  const listings = listingsQ.data ?? [];
  const blueprints = blueprintsQ.data ?? [];
  const skills = skillsQ.data ?? [];

  const tierOrder = ["solo_founder", "enterprise", "custom"];
  const sorted = [...listings].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  // Leaderboard: top blueprints by value generated
  const leaderboard = [...blueprints].sort((a, b) => Number(b.totalValueGenerated ?? 0) - Number(a.totalValueGenerated ?? 0)).slice(0, 10);

  const tabs: { id: Tab; label: string; icon: typeof ShoppingBag; count: number }[] = [
    { id: "agents", label: "AI AGENTS", icon: Cpu, count: listings.length },
    { id: "blueprints", label: "COMPANY BLUEPRINTS", icon: Package, count: blueprints.length },
    { id: "skills", label: "SKILLS", icon: Wrench, count: skills.length },
    { id: "leaderboard", label: "LEADERBOARD", icon: Award, count: leaderboard.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent flex items-center justify-center">
              <span className="font-condensed font-black text-foreground text-sm">OC</span>
            </div>
            <span className="font-condensed font-black text-foreground text-xl tracking-widest uppercase">OPENCOMMAND</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/blueprints" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors">Blueprints</Link>
          <Link href="/creator-program" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors">Creators</Link>
          {isAuthenticated ? (
            <Link href="/mission-control" className="bg-foreground text-background font-condensed font-bold text-sm px-5 py-2 uppercase tracking-widest hover:bg-accent hover:text-foreground transition-colors">
              MISSION CONTROL
            </Link>
          ) : (
            <a href={getLoginUrl()} className="bg-foreground text-background font-condensed font-bold text-sm px-5 py-2 uppercase tracking-widest hover:bg-accent hover:text-foreground transition-colors">
              AUTHENTICATE
            </a>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="px-6 pt-16 pb-8 max-w-6xl mx-auto">
        <div className="red-line mb-8" />
        <div className="section-label mb-3">OPENCOMMAND MARKETPLACE</div>
        <h1 className="text-display text-6xl lg:text-7xl text-foreground mb-4">DEPLOY YOUR<br /><span className="text-accent">ZERO-HUMAN COMPANY</span></h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          AI agents, company blueprints, and skills — everything you need to build and scale autonomous businesses with verified Proof of Outcome.
        </p>
      </section>

      <div className="red-line" />

      {/* Tabs */}
      <div className="px-6 max-w-6xl mx-auto">
        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-4 font-condensed font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon size={14} />
              {t.label}
              <span className="font-mono text-xs text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ AI AGENTS ═══ */}
      {tab === "agents" && (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag size={48} className="text-muted-foreground mx-auto mb-4" />
              <div className="font-condensed font-bold text-2xl text-muted-foreground">MARKETPLACE LOADING</div>
              <p className="text-muted-foreground text-sm mt-2">Sign in to initialize the marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {sorted.map(listing => {
                const isEnterprise = listing.tier === "enterprise";
                const features: string[] = (() => {
                  try { return JSON.parse(listing.features as unknown as string ?? "[]"); } catch { return []; }
                })();
                return (
                  <div key={listing.id} className={`flex flex-col ${isEnterprise ? "brutal-border-red glow-red" : "brutal-card"} p-6 relative`}>
                    {isEnterprise && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-accent text-foreground font-condensed font-black text-xs px-3 py-1 uppercase tracking-widest">FLAGSHIP</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`font-mono text-xs border px-2 py-1 uppercase ${isEnterprise ? "brutal-border-red text-accent" : "border-border text-muted-foreground"}`}>{listing.tier.replace("_", " ")}</span>
                      {listing.avgRating && Number(listing.avgRating) > 0 && (
                        <div className="flex items-center gap-1"><Star size={12} className="text-[oklch(0.82_0.18_90)] fill-[oklch(0.82_0.18_90)]" /><span className="font-mono text-xs text-foreground">{Number(listing.avgRating).toFixed(1)}</span></div>
                      )}
                    </div>
                    <h2 className="font-condensed font-black text-2xl text-foreground mb-2">{listing.name}</h2>
                    {listing.tagline && <p className="text-accent text-sm font-condensed font-bold mb-3 uppercase tracking-wide">{listing.tagline}</p>}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">{listing.description}</p>
                    <ul className="space-y-2 mb-6">
                      {features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-foreground"><Check size={13} className="text-accent flex-shrink-0 mt-0.5" />{f}</li>
                      ))}
                    </ul>
                    {listing.endorsedBy && (
                      <div className="border border-border p-3 mb-5">
                        <div className="section-label mb-2">CREATOR ENDORSED</div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-secondary border border-border flex items-center justify-center"><span className="font-condensed font-bold text-xs">{listing.endorsedBy.charAt(0)}</span></div>
                          <div>
                            <div className="font-condensed font-bold text-sm text-foreground">{listing.endorsedBy}</div>
                            <div className="section-label text-[0.6rem]">{listing.endorserHandle} · {listing.endorserNiche}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="border-t border-border pt-4 mb-5">
                      <div className="flex items-end gap-2">
                        {listing.price ? (
                          <><span className="font-condensed font-black text-4xl text-foreground">${Number(listing.price).toFixed(0)}</span><span className="text-muted-foreground text-sm mb-1">/{listing.pricingModel === "monthly" ? "mo" : listing.pricingModel}</span></>
                        ) : (
                          <div><span className="font-condensed font-black text-2xl text-accent">5% VALUE CAPTURE</span><div className="section-label mt-1">PAY ONLY WHEN ARIA CREATES VALUE</div></div>
                        )}
                      </div>
                      {listing.totalPurchases > 0 && (
                        <div className="flex items-center gap-1 mt-1"><Users size={11} className="text-muted-foreground" /><span className="section-label">{listing.totalPurchases} DEPLOYED</span></div>
                      )}
                    </div>
                    {isAuthenticated ? (
                      <button
                        onClick={() => {
                          const productKey = listing.tier === "enterprise" ? "enterprise_ceo" : "solo_founder_ceo";
                          checkoutMut.mutate({ productKey, listingId: listing.id, origin: window.location.origin });
                        }}
                        disabled={checkoutMut.isPending}
                        className={`w-full flex items-center justify-center gap-2 font-condensed font-bold text-sm py-3 uppercase tracking-widest transition-colors ${isEnterprise ? "bg-accent text-foreground hover:bg-accent/80 glow-red" : "border border-foreground text-foreground hover:bg-foreground hover:text-background"} disabled:opacity-50`}
                      >
                        {checkoutMut.isPending ? "PROCESSING..." : <>DEPLOY NOW <ArrowRight size={14} /></>}
                      </button>
                    ) : (
                      <a href={getLoginUrl()} className={`w-full flex items-center justify-center gap-2 font-condensed font-bold text-sm py-3 uppercase tracking-widest transition-colors ${isEnterprise ? "bg-accent text-foreground hover:bg-accent/80 glow-red" : "border border-foreground text-foreground hover:bg-foreground hover:text-background"}`}>
                        GET STARTED <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ COMPANY BLUEPRINTS ═══ */}
      {tab === "blueprints" && (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="section-label">ZERO-HUMAN COMPANY BLUEPRINTS — DEPLOY IN ONE CLICK</div>
            {isAuthenticated && (
              <Link href="/blueprints">
                <button className="flex items-center gap-1.5 font-condensed font-bold text-xs text-accent uppercase tracking-wide hover:text-foreground transition-colors">
                  MANAGE BLUEPRINTS <ChevronRight size={12} />
                </button>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprints.map(bp => (
              <div key={bp.id} className="brutal-card-hover p-6 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs border px-2 py-0.5 uppercase text-muted-foreground border-muted-foreground">{bp.pricingModel.replace("_", " ")}</span>
                  {bp.isCertified && <Shield size={14} className="text-[oklch(0.65_0.18_142)]" />}
                </div>
                <div className="font-condensed font-black text-xl text-foreground mb-1">{bp.name}</div>
                {bp.category && <div className="section-label mb-2">{bp.category}</div>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{bp.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-4 pt-3 border-t border-border">
                  <div><div className="section-label">AGENTS</div><div className="font-condensed font-bold text-foreground flex items-center gap-1"><Cpu size={10} /> {bp.agentCount}</div></div>
                  <div><div className="section-label">EST. COST</div><div className="font-condensed font-bold text-accent">${Number(bp.estimatedMonthlyCost ?? 0).toFixed(0)}/mo</div></div>
                  <div><div className="section-label">VALUE GEN</div><div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">${Number(bp.totalValueGenerated ?? 0).toFixed(0)}</div></div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><Star size={10} className="text-[oklch(0.82_0.18_90)]" /><span className="font-mono text-xs text-muted-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                    <div className="flex items-center gap-1"><Download size={10} className="text-muted-foreground" /><span className="font-mono text-xs text-muted-foreground">{bp.totalDeployments ?? 0}</span></div>
                  </div>
                  {Number(bp.price ?? 0) > 0 ? <div className="font-condensed font-bold text-foreground">${Number(bp.price).toLocaleString()}</div> : <div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">FREE</div>}
                </div>
                {bp.endorsedBy && (
                  <div className="border border-border p-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary border border-border flex items-center justify-center"><span className="font-condensed font-bold text-[0.6rem]">{bp.endorsedBy.charAt(0)}</span></div>
                      <div><div className="font-condensed font-bold text-xs text-foreground">{bp.endorsedBy}</div><div className="section-label text-[0.55rem]">{bp.endorserHandle}</div></div>
                    </div>
                  </div>
                )}
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      if (Number(bp.price ?? 0) > 0) {
                        checkoutMut.mutate({ productKey: "blueprint_" + bp.id, blueprintId: bp.id, origin: window.location.origin });
                      } else {
                        toast("Free blueprint!", { description: "Redirecting to deployment..." });
                        window.location.href = "/blueprints";
                      }
                    }}
                    disabled={checkoutMut.isPending}
                    className="w-full bg-accent/10 border border-accent text-accent font-condensed font-bold text-xs py-2.5 uppercase tracking-wide hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Package size={12} /> {Number(bp.price ?? 0) > 0 ? (checkoutMut.isPending ? "PROCESSING..." : "PURCHASE & DEPLOY") : "DEPLOY FREE"}
                  </button>
                ) : (
                  <a href={getLoginUrl()} className="w-full bg-accent/10 border border-accent text-accent font-condensed font-bold text-xs py-2.5 uppercase tracking-wide hover:bg-accent/20 transition-colors flex items-center justify-center gap-2">
                    <Package size={12} /> GET STARTED
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SKILLS ═══ */}
      {tab === "skills" && (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          <div className="section-label mb-6">AGENT SKILLS MARKETPLACE — EXTEND YOUR AGENTS' CAPABILITIES</div>
          {skills.length === 0 ? (
            <div className="text-center py-16">
              <Wrench size={48} className="text-muted-foreground mx-auto mb-4" />
              <div className="font-condensed font-bold text-2xl text-muted-foreground">SKILLS LOADING</div>
              <p className="text-muted-foreground text-sm mt-2">Sign in to initialize the skills marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="brutal-card-hover p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-xs border px-2 py-0.5 uppercase text-[oklch(0.62_0.18_240)] border-[oklch(0.62_0.18_240)]">{skill.category}</span>
                    <div className="flex items-center gap-1"><Star size={10} className="text-[oklch(0.82_0.18_90)]" /><span className="font-mono text-xs text-muted-foreground">{Number(skill.avgRating ?? 0).toFixed(1)}</span></div>
                  </div>
                  <div className="font-condensed font-black text-lg text-foreground mb-1">{skill.name}</div>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">{skill.description}</p>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="section-label">{skill.totalInstalls ?? 0} INSTALLS</span>
                      <span className="font-mono text-muted-foreground">{skill.category}</span>
                    </div>
                    {Number(skill.price ?? 0) > 0 ? <span className="font-condensed font-bold text-foreground">${Number(skill.price).toFixed(0)}</span> : <span className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">FREE</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ LEADERBOARD ═══ */}
      {tab === "leaderboard" && (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          <div className="section-label mb-6">TOP PERFORMING BLUEPRINTS — RANKED BY VERIFIED VALUE GENERATED</div>
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Award size={48} className="text-muted-foreground mx-auto mb-4" />
              <div className="font-condensed font-bold text-2xl text-muted-foreground">NO DATA YET</div>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((bp, i) => (
                <div key={bp.id} className={`brutal-card p-5 flex items-center gap-5 ${i === 0 ? "border-l-2 border-l-accent" : ""}`}>
                  <div className={`w-10 h-10 flex items-center justify-center border ${i === 0 ? "border-accent text-accent" : i < 3 ? "border-[oklch(0.82_0.18_90)] text-[oklch(0.82_0.18_90)]" : "border-border text-muted-foreground"}`}>
                    <span className="font-condensed font-black text-lg">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-bold text-lg text-foreground">{bp.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {bp.category && <span className="section-label">{bp.category}</span>}
                      <span className="font-mono text-[0.6rem] text-muted-foreground">{bp.agentCount} agents</span>
                      <span className="font-mono text-[0.6rem] text-muted-foreground">{bp.totalDeployments ?? 0} deploys</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-condensed font-black text-xl text-[oklch(0.65_0.18_142)]">${Number(bp.totalValueGenerated ?? 0).toLocaleString()}</div>
                    <div className="section-label">VALUE GENERATED</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1"><Star size={10} className="text-[oklch(0.82_0.18_90)]" /><span className="font-mono text-xs text-foreground">{Number(bp.avgRating ?? 0).toFixed(1)}</span></div>
                  </div>
                  {bp.isCertified && <Shield size={14} className="text-[oklch(0.65_0.18_142)]" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="red-line" />

      {/* PoO Guarantee */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center">
        <div className="section-label mb-4">THE GUARANTEE</div>
        <h2 className="text-display text-5xl text-foreground mb-6">PROOF OF OUTCOME<br />OR YOUR MONEY BACK</h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
          Every task executed by an OpenCommand agent generates a cryptographically-signed Proof of Outcome receipt documenting the exact value created. No vague promises. No vanity metrics. Just receipts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {[
            { label: "LABOR HOURS SAVED", value: "321.6 HRS", desc: "Documented in PoO receipts" },
            { label: "DOLLAR VALUE CREATED", value: "$48,240", desc: "Verified and auditable" },
            { label: "RECEIPTS ISSUED", value: "1,847", desc: "Across all deployments" },
          ].map((s, i) => (
            <div key={i} className="bg-background brutal-card p-6">
              <div className="section-label mb-2">{s.label}</div>
              <div className="font-condensed font-black text-4xl text-accent mb-1">{s.value}</div>
              <div className="section-label">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="red-line" />
      <footer className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-accent flex items-center justify-center"><span className="font-condensed font-black text-foreground text-xs">OC</span></div>
          <span className="font-condensed font-bold text-sm text-muted-foreground uppercase tracking-widest">OPENCOMMAND</span>
        </div>
        <div className="section-label">MARKETPLACE · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
