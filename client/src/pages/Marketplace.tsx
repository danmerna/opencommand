import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowRight, Star, ShoppingBag, Zap, Check, Users } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const listingsQ = trpc.marketplace.list.useQuery();
  const listings = listingsQ.data ?? [];

  const tierOrder = ["solo_founder", "enterprise", "custom"];
  const sorted = [...listings].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

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
      <section className="px-6 pt-16 pb-12 max-w-6xl mx-auto">
        <div className="red-line mb-8" />
        <div className="section-label mb-3">AGENT MARKETPLACE</div>
        <h1 className="text-display text-7xl text-foreground mb-4">DEPLOY YOUR<br /><span className="text-accent">AI TEAM</span></h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Pre-configured AI agents built for specific outcomes. Every agent comes with a Proof of Outcome guarantee — you see the value or you don't pay.
        </p>
      </section>

      <div className="red-line" />

      {/* Listings */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        {listingsQ.isLoading ? (
          <div className="text-muted-foreground font-mono text-sm text-center py-16">LOADING MARKETPLACE...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={48} className="text-muted-foreground mx-auto mb-4" />
            <div className="font-condensed font-bold text-2xl text-muted-foreground">MARKETPLACE LOADING</div>
            <p className="text-muted-foreground text-sm mt-2">Sign in to initialize the marketplace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sorted.map((listing, i) => {
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

                  {/* Tier badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-mono text-xs border px-2 py-1 uppercase ${isEnterprise ? "brutal-border-red text-accent" : "border-border text-muted-foreground"}`}>
                      {listing.tier.replace("_", " ")}
                    </span>
                    {listing.avgRating && Number(listing.avgRating) > 0 && (
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-[oklch(0.82_0.18_90)] fill-[oklch(0.82_0.18_90)]" />
                        <span className="font-mono text-xs text-foreground">{Number(listing.avgRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Name & tagline */}
                  <h2 className="font-condensed font-black text-2xl text-foreground mb-2">{listing.name}</h2>
                  {listing.tagline && <p className="text-accent text-sm font-condensed font-bold mb-3 uppercase tracking-wide">{listing.tagline}</p>}
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">{listing.description}</p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-foreground">
                        <Check size={13} className="text-accent flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Creator endorsement */}
                  {listing.endorsedBy && (
                    <div className="border border-border p-3 mb-5">
                      <div className="section-label mb-2">CREATOR ENDORSED</div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-secondary border border-border flex items-center justify-center">
                          <span className="font-condensed font-bold text-xs">{listing.endorsedBy.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-condensed font-bold text-sm text-foreground">{listing.endorsedBy}</div>
                          <div className="section-label text-[0.6rem]">{listing.endorserHandle} · {listing.endorserNiche}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="border-t border-border pt-4 mb-5">
                    <div className="flex items-end gap-2">
                      {listing.price ? (
                        <>
                          <span className="font-condensed font-black text-4xl text-foreground">${Number(listing.price).toFixed(0)}</span>
                          <span className="text-muted-foreground text-sm mb-1">/{listing.pricingModel === "monthly" ? "mo" : listing.pricingModel}</span>
                        </>
                      ) : (
                        <div>
                          <span className="font-condensed font-black text-2xl text-accent">5% VALUE CAPTURE</span>
                          <div className="section-label mt-1">PAY ONLY WHEN ARIA CREATES VALUE</div>
                        </div>
                      )}
                    </div>
                    {listing.totalPurchases > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={11} className="text-muted-foreground" />
                        <span className="section-label">{listing.totalPurchases} DEPLOYED</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isAuthenticated ? (
                    <Link href="/mission-control">
                      <button className={`w-full flex items-center justify-center gap-2 font-condensed font-bold text-sm py-3 uppercase tracking-widest transition-colors ${isEnterprise ? "bg-accent text-foreground hover:bg-accent/80 glow-red" : "border border-foreground text-foreground hover:bg-foreground hover:text-background"}`}>
                        DEPLOY NOW <ArrowRight size={14} />
                      </button>
                    </Link>
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
          <div className="w-6 h-6 bg-accent flex items-center justify-center">
            <span className="font-condensed font-black text-foreground text-xs">OC</span>
          </div>
          <span className="font-condensed font-bold text-sm text-muted-foreground uppercase tracking-widest">OPENCOMMAND</span>
        </div>
        <div className="section-label">AGENT MARKETPLACE · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
