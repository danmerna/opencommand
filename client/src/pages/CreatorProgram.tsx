import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowRight, DollarSign, TrendingUp, Users, Star, Check, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CreatorProgram() {
  const { isAuthenticated } = useAuth();
  const creatorsQ = trpc.creators.list.useQuery();
  const creators = creatorsQ.data ?? [];

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
          <Link href="/marketplace" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors">Marketplace</Link>
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

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 max-w-6xl mx-auto">
        <div className="red-line mb-8" />
        <div className="section-label mb-3">CREATOR PARTNERSHIP PROGRAM</div>
        <h1 className="text-display text-7xl text-foreground mb-4">
          FLOOR<span className="text-accent"> + </span>FLOW<br />
          <span className="text-5xl text-muted-foreground">REVENUE SHARE</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-8">
          Guaranteed monthly income plus performance upside. No unpredictable affiliate commissions. No attribution disputes. Just a transparent partnership that pays you what you're worth.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <a href="mailto:creators@opencommand.ai" className="flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-lg px-8 py-4 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
            APPLY NOW <ArrowRight size={18} />
          </a>
          <Link href="/marketplace" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors border border-border px-6 py-4">
            VIEW MARKETPLACE
          </Link>
        </div>
      </section>

      <div className="red-line" />

      {/* Why Floor + Flow */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="section-label mb-3">THE MODEL</div>
        <h2 className="text-display text-5xl text-foreground mb-12">WHY FLOOR + FLOW BEATS AFFILIATE</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Traditional Affiliate */}
          <div className="brutal-card p-8 opacity-60">
            <div className="section-label mb-4 text-accent">TRADITIONAL AFFILIATE — THE OLD WAY</div>
            <div className="space-y-3">
              {[
                "Unpredictable income — zero guaranteed",
                "30-day cookie windows lose half your sales",
                "Attribution disputes with no resolution",
                "Delayed payments, complex dashboards",
                "No creative control over the product",
                "Treated as a traffic source, not a partner",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 border border-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-0.5 bg-accent" />
                  </div>
                  <span className="text-muted-foreground text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floor + Flow */}
          <div className="brutal-border-red p-8">
            <div className="red-line-thin mb-4" />
            <div className="section-label mb-4 text-[oklch(0.65_0.18_142)]">FLOOR + FLOW — THE NEW WAY</div>
            <div className="space-y-3">
              {[
                "Guaranteed monthly floor — paid regardless of performance",
                "Unlimited upside through revenue share on every sale",
                "Transparent tracking — real-time dashboard access",
                "Weekly payments, no minimum threshold",
                "Co-create the agent with your brand and audience",
                "Treated as a co-founder, not a traffic source",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={14} className="text-[oklch(0.65_0.18_142)] flex-shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="section-label mb-6">PARTNERSHIP TIERS</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mb-16">
          {[
            {
              tier: "SIGNAL", audience: "10K–100K", floor: "$500", flow: "15%", perks: ["1 endorsed agent", "Co-branded listing", "Weekly payments", "Real-time dashboard"],
            },
            {
              tier: "AMPLIFY", audience: "100K–1M", floor: "$2,500", flow: "20%", perks: ["3 endorsed agents", "Custom agent design", "Priority support", "Quarterly strategy call"], featured: true,
            },
            {
              tier: "COMMAND", audience: "1M+", floor: "CUSTOM", flow: "25%+", perks: ["Unlimited agents", "White-label option", "Dedicated account manager", "Equity consideration"],
            },
          ].map((t, i) => (
            <div key={i} className={`bg-background p-8 ${t.featured ? "brutal-border-red" : "brutal-card"}`}>
              {t.featured && <div className="section-label text-accent mb-2">MOST POPULAR</div>}
              <div className="font-condensed font-black text-3xl text-foreground mb-1">{t.tier}</div>
              <div className="section-label mb-5">{t.audience} AUDIENCE</div>
              <div className="mb-5">
                <div className="flex items-end gap-2 mb-1">
                  <span className="font-condensed font-black text-4xl text-foreground">{t.floor}</span>
                  {t.floor !== "CUSTOM" && <span className="text-muted-foreground text-sm mb-1">/mo floor</span>}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-accent" />
                  <span className="font-condensed font-bold text-lg text-accent">{t.flow} REVENUE SHARE</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {t.perks.map((p, pi) => (
                  <li key={pi} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={12} className="text-accent" /> {p}
                  </li>
                ))}
              </ul>
              <a href="mailto:creators@opencommand.ai" className={`block text-center font-condensed font-bold text-sm py-3 uppercase tracking-widest transition-colors ${t.featured ? "bg-accent text-foreground hover:bg-accent/80" : "border border-border text-foreground hover:bg-secondary"}`}>
                APPLY FOR {t.tier}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="red-line" />

      {/* Current Partners */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="section-label mb-3">CURRENT PARTNERS</div>
        <h2 className="text-display text-5xl text-foreground mb-10">ENDORSED AGENTS</h2>

        {creatorsQ.isLoading ? (
          <div className="text-muted-foreground font-mono text-sm text-center py-8">LOADING PARTNERS...</div>
        ) : creators.length === 0 ? (
          <div className="brutal-card p-8 text-center">
            <Users size={32} className="text-muted-foreground mx-auto mb-3" />
            <div className="font-condensed font-bold text-lg text-muted-foreground">FOUNDING PARTNERS BEING ONBOARDED</div>
            <p className="text-muted-foreground text-sm mt-2">Apply now to become a founding creator partner.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map(creator => (
              <div key={creator.id} className="brutal-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-secondary border border-border flex items-center justify-center">
                    <span className="font-condensed font-black text-xl text-foreground">{creator.creatorName.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-condensed font-bold text-base text-foreground">{creator.creatorName}</div>
                    <div className="section-label">{creator.creatorHandle}</div>
                  </div>
                </div>
                <div className="section-label mb-1">NICHE</div>
                <div className="font-condensed font-bold text-sm text-foreground mb-3">{creator.niche}</div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="section-label mb-1">AUDIENCE</div>
                    <div className="font-condensed font-bold text-sm text-foreground">{Number(creator.audienceSize ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="section-label mb-1">TIER</div>
                    <span className="font-mono text-xs border px-2 py-0.5 uppercase border-border text-muted-foreground">
                      {creator.status}
                    </span>
                  </div>
                </div>
              {creator.totalEarned && Number(creator.totalEarned) > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="section-label mb-1">TOTAL EARNINGS</div>
                    <div className="font-condensed font-black text-xl text-[oklch(0.65_0.18_142)]">${Number(creator.totalEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="red-line" />
      <section className="px-6 py-16 text-center max-w-3xl mx-auto">
        <div className="section-label mb-4">READY TO PARTNER?</div>
        <h2 className="text-display text-5xl text-foreground mb-6">JOIN THE COMMAND NETWORK</h2>
        <p className="text-muted-foreground text-lg mb-10">
          Be among the first creators to earn guaranteed income from AI agent endorsements. Founding partners receive enhanced terms and equity consideration.
        </p>
        <a href="mailto:creators@opencommand.ai" className="inline-flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-xl px-10 py-5 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
          APPLY FOR PARTNERSHIP <ArrowRight size={20} />
        </a>
      </section>

      {/* Footer */}
      <div className="red-line" />
      <footer className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-accent flex items-center justify-center">
            <span className="font-condensed font-black text-foreground text-xs">OC</span>
          </div>
          <span className="font-condensed font-bold text-sm text-muted-foreground uppercase tracking-widest">OPENCOMMAND</span>
        </div>
        <div className="section-label">CREATOR PROGRAM · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
