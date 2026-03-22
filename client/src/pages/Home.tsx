import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Zap, Target, BarChart3, Users, ShoppingBag } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center">
            <span className="font-condensed font-black text-foreground text-sm">OC</span>
          </div>
          <span className="font-condensed font-black text-foreground text-xl tracking-widest uppercase">OPENCOMMAND</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/marketplace" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors">Marketplace</Link>
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

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-6xl mx-auto">
        <div className="red-line mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="section-label mb-4">THE INTENT-TO-OUTCOME ENGINE</div>
            <h1 className="text-display text-7xl lg:text-9xl text-foreground leading-none mb-6">
              OPEN<br />
              <span className="text-accent">COM</span><br />
              MAND
            </h1>
            <div className="red-line-thin mb-6" />
            <p className="text-muted-foreground font-sans text-lg leading-relaxed mb-8 max-w-md">
              An AI Agent CEO that runs your business. Orchestrates autonomous task execution. Generates verified Proof of Outcome receipts for every action taken.
            </p>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link href="/mission-control" className="flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-lg px-8 py-4 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
                  ENTER MISSION CONTROL <ArrowRight size={18} />
                </Link>
              ) : (
                <a href={getLoginUrl()} className="flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-lg px-8 py-4 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
                  DEPLOY YOUR AI CEO <ArrowRight size={18} />
                </a>
              )}
              <Link href="/marketplace" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors border border-border px-6 py-4">
                VIEW MARKETPLACE
              </Link>
            </div>
          </div>

          {/* Live metrics panel */}
          <div className="brutal-card p-6 space-y-4">
            <div className="section-label mb-4">LIVE SYSTEM METRICS</div>
            <div className="red-line-thin" />
            {[
              { label: "VALUE CREATED TODAY", value: "$48,240", change: "+12.4%" },
              { label: "LABOR HOURS SAVED", value: "321.6 HRS", change: "+8.2%" },
              { label: "PoO RECEIPTS ISSUED", value: "1,847", change: "+23 TODAY" },
              { label: "ACTIVE AGENTS", value: "94", change: "ONLINE" },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="section-label">{m.label}</span>
                <div className="text-right">
                  <div className="font-condensed font-black text-xl text-foreground">{m.value}</div>
                  <div className="ticker-line text-xs">{m.change}</div>
                </div>
              </div>
            ))}
            <div className="red-line-thin" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)] animate-pulse" />
              <span className="section-label">ARIA AI CEO — ONLINE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Red divider */}
      <div className="red-line" />

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="section-label mb-2">CORE SYSTEMS</div>
        <h2 className="text-display text-5xl text-foreground mb-12">THE COMMAND STACK</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {[
            { icon: LayoutDashboardIcon, title: "MISSION CONTROL", desc: "Real-time OKR tracking, agent fleet monitoring, human-in-the-loop inbox, and PoO ledger in a single command center.", href: "/mission-control" },
            { icon: ZapIcon, title: "SOCRATIC ENGINE", desc: "Transforms vague requests into structured intent objects through guided AI questioning. Every task starts with clarity.", href: "/intent-engine" },
            { icon: BotIcon, title: "AI CEO — ARIA", desc: "Executive Core, Orchestration Layer, and Memory Engine. ARIA runs your company and compounds intelligence over time.", href: "/ai-ceo" },
            { icon: TargetIcon, title: "PROOF OF OUTCOME", desc: "Every completed task generates a verifiable PoO receipt documenting labor saved, dollar value created, and outcome quality.", href: "/mission-control" },
            { icon: ShoppingBagIcon, title: "AGENT MARKETPLACE", desc: "Browse and deploy specialized AI agents. Solo-Founder CEO at $199/mo. Enterprise CEO with 5% value capture.", href: "/marketplace" },
            { icon: UsersIcon, title: "CREATOR PROGRAM", desc: "Floor + Flow revenue share. Guaranteed monthly minimum plus performance upside. Easier than traditional affiliate.", href: "/creator-program" },
          ].map((f, i) => (
            <Link key={i} href={f.href}>
              <div className="bg-background p-8 brutal-card-hover group h-full">
                <f.icon className="text-accent mb-4" size={24} />
                <h3 className="font-condensed font-black text-xl text-foreground mb-3 group-hover:text-accent transition-colors">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="section-label text-accent">EXPLORE</span>
                  <ArrowRight size={12} className="text-accent" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Red divider */}
      <div className="red-line" />

      {/* CTA */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="section-label mb-4">READY TO DEPLOY</div>
        <h2 className="text-display text-6xl text-foreground mb-6">HIRE YOUR AI CEO TODAY</h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
          Stop managing tasks. Start commanding outcomes. ARIA handles the execution while you focus on the vision.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {isAuthenticated ? (
            <Link href="/mission-control" className="flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-xl px-10 py-5 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
              ENTER MISSION CONTROL <ArrowRight size={20} />
            </Link>
          ) : (
            <a href={getLoginUrl()} className="flex items-center gap-2 bg-accent text-foreground font-condensed font-bold text-xl px-10 py-5 uppercase tracking-widest hover:bg-accent/80 transition-colors glow-red">
              DEPLOY YOUR AI CEO <ArrowRight size={20} />
            </a>
          )}
          <Link href="/marketplace" className="font-condensed font-bold text-sm text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors border border-border px-8 py-5">
            BROWSE MARKETPLACE
          </Link>
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
        <div className="section-label">THE INTENT-TO-OUTCOME ENGINE · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}

// Icon wrappers for use in the features grid
function LayoutDashboardIcon(props: { className?: string; size?: number }) {
  return <BarChart3 {...props} />;
}
function ZapIcon(props: { className?: string; size?: number }) {
  return <Zap {...props} />;
}
function BotIcon(props: { className?: string; size?: number }) {
  return <Target {...props} />;
}
function TargetIcon(props: { className?: string; size?: number }) {
  return <Target {...props} />;
}
function ShoppingBagIcon(props: { className?: string; size?: number }) {
  return <ShoppingBag {...props} />;
}
function UsersIcon(props: { className?: string; size?: number }) {
  return <Users {...props} />;
}
