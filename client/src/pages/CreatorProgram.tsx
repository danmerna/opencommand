import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowRight, DollarSign, TrendingUp, Users, Star, Check, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function CreatorProgram() {
  const { isAuthenticated } = useAuth();
  const creatorsQ = trpc.creators.list.useQuery();
  const creators = creatorsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
              <span className="text-background text-xs font-semibold">OC</span>
            </div>
            <span className="text-foreground text-sm font-medium tracking-wide">OpenCommand</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link>
          {isAuthenticated ? (
            <Link href="/mission-control"><Button size="sm">Mission Control</Button></Link>
          ) : (
            <a href={getLoginUrl()}><Button size="sm">Sign In</Button></a>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Creator Partnership Program</p>
        <h1 className="text-6xl md:text-7xl font-light text-foreground tracking-tight leading-none mb-2">
          Floor <span className="text-muted-foreground">+</span> Flow
        </h1>
        <h2 className="text-3xl font-light text-muted-foreground tracking-tight mb-6">Revenue Share</h2>
        <p className="text-muted-foreground text-base max-w-2xl mb-8 leading-relaxed">
          Guaranteed monthly income plus performance upside. No unpredictable affiliate commissions. No attribution disputes. Just a transparent partnership that pays you what you're worth.
        </p>
        <div className="flex items-center gap-3">
          <a href="mailto:creators@opencommand.ai">
            <Button size="lg" className="gap-2">Apply Now <ArrowRight size={16} /></Button>
          </a>
          <Link href="/marketplace">
            <Button variant="outline" size="lg">View Marketplace</Button>
          </Link>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Why Floor + Flow */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">The Model</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-12">Why Floor + Flow Beats Affiliate</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          {/* Traditional Affiliate */}
          <div className="card-minimal p-8 opacity-60">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-5">Traditional Affiliate</p>
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
                  <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floor + Flow */}
          <div className="card-minimal p-8 border-foreground/20">
            <p className="text-xs text-accent tracking-widest uppercase mb-5">Floor + Flow — The New Way</p>
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
                  <Check size={13} className="text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tiers */}
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-6">Partnership Tiers</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            {
              tier: "Signal", audience: "10K–100K", floor: "$500", flow: "15%", perks: ["1 endorsed agent", "Co-branded listing", "Weekly payments", "Real-time dashboard"],
            },
            {
              tier: "Amplify", audience: "100K–1M", floor: "$2,500", flow: "20%", perks: ["3 endorsed agents", "Custom agent design", "Priority support", "Quarterly strategy call"], featured: true,
            },
            {
              tier: "Command", audience: "1M+", floor: "Custom", flow: "25%+", perks: ["Unlimited agents", "White-label option", "Dedicated account manager", "Equity consideration"],
            },
          ].map((t, i) => (
            <div key={i} className={`card-minimal p-8 ${t.featured ? "border-foreground/20" : ""}`}>
              {t.featured && <p className="text-[10px] text-accent tracking-widest uppercase mb-2">Most Popular</p>}
              <div className="text-2xl font-light text-foreground mb-1">{t.tier}</div>
              <p className="text-xs text-muted-foreground mb-5">{t.audience} audience</p>
              <div className="mb-5">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-light text-foreground">{t.floor}</span>
                  {t.floor !== "Custom" && <span className="text-muted-foreground text-sm mb-1">/mo floor</span>}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp size={13} className="text-accent" />
                  <span>{t.flow} revenue share</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {t.perks.map((p, pi) => (
                  <li key={pi} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={11} className="text-foreground/40" /> {p}
                  </li>
                ))}
              </ul>
              <a href="mailto:creators@opencommand.ai">
                <Button variant={t.featured ? "default" : "outline"} className="w-full" size="sm">
                  Apply for {t.tier}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Current Partners */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Current Partners</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-10">Endorsed Agents</h2>

        {creatorsQ.isLoading ? (
          <div className="text-muted-foreground text-sm text-center py-8">Loading partners...</div>
        ) : creators.length === 0 ? (
          <div className="card-minimal p-10 text-center">
            <Users size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
            <div className="text-base font-medium text-muted-foreground">Founding Partners Being Onboarded</div>
            <p className="text-muted-foreground text-sm mt-2">Apply now to become a founding creator partner.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map(creator => (
              <div key={creator.id} className="card-minimal p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-foreground text-sm font-medium">{creator.creatorName.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{creator.creatorName}</div>
                    <div className="text-xs text-muted-foreground">{creator.creatorHandle}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">Niche</div>
                <div className="text-sm text-foreground mb-3">{creator.niche}</div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Audience</div>
                    <div className="text-sm text-foreground">{Number(creator.audienceSize ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                    <span className="text-xs border px-2 py-0.5 rounded border-border text-muted-foreground">{creator.status}</span>
                  </div>
                </div>
                {creator.totalEarned && Number(creator.totalEarned) > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Total Earnings</div>
                    <div className="text-lg font-light text-accent">${Number(creator.totalEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="h-px bg-border" />
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Ready to Partner?</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-6">Join the Command Network</h2>
        <p className="text-muted-foreground text-base mb-10 leading-relaxed">
          Be among the first creators to earn guaranteed income from AI agent endorsements. Founding partners receive enhanced terms and equity consideration.
        </p>
        <a href="mailto:creators@opencommand.ai">
          <Button size="lg" className="gap-2">Apply for Partnership <ArrowRight size={16} /></Button>
        </a>
      </section>

      {/* Footer */}
      <div className="h-px bg-border" />
      <footer className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-foreground rounded-sm flex items-center justify-center">
            <span className="text-background text-[8px] font-semibold">OC</span>
          </div>
          <span className="text-xs text-muted-foreground">OpenCommand</span>
        </div>
        <div className="text-xs text-muted-foreground">Creator Program &middot; {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
