import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  "Unlimited commands",
  "Unlimited connected tools",
  "Unlimited agents",
  "Self-contextualizing engine",
  "Full Proof of Outcome receipts",
  "All workspaces",
  "Company Blueprints (when live)",
  "Priority support",
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    window.location.href = "/onboarding";
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Pricing</p>
          <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">Beta</span>
        </div>
        <h1 className="text-4xl font-light text-foreground tracking-tight mb-3">
          Free during beta. Full access.
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg">
          Every account gets unrestricted access to the entire platform. No credit card required. No tiers. No limits. Paid plans will be introduced later — early users will be grandfathered.
        </p>
      </div>

      {/* Single card */}
      <div className="border border-border rounded-xl p-8 md:p-10 bg-white/[0.02] max-w-2xl mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
            <Zap size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Full Access</h3>
            <p className="text-xs text-muted-foreground">Everything included. No restrictions.</p>
          </div>
          <div className="ml-auto">
            <span className="text-3xl font-light text-foreground">$0</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Check size={13} className="text-emerald-400 shrink-0" />
              {feature}
            </div>
          ))}
        </div>

        <Button
          onClick={handleGetStarted}
          className="w-full gap-2"
        >
          {isAuthenticated ? (
            <>Go to Mission Control <ArrowRight size={14} /></>
          ) : (
            <>Get Started — It's Free <ArrowRight size={14} /></>
          )}
        </Button>

        {!isAuthenticated && (
          <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
            Sign up to get full access
          </p>
        )}
      </div>

      {/* FAQ / Trust section */}
      <div className="border-t border-border pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-foreground font-medium mb-1">Free during beta</p>
            <p className="text-muted-foreground text-xs leading-relaxed">Full access to every feature while we're in beta. No credit card required.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Early adopter benefits</p>
            <p className="text-muted-foreground text-xs leading-relaxed">When paid plans launch, beta users will be grandfathered into founding member pricing.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">No surprises</p>
            <p className="text-muted-foreground text-xs leading-relaxed">We'll give advance notice before any pricing changes. You'll always know what's coming.</p>
          </div>
        </div>
      </div>

      {/* Payment history link (keep for any existing payments) */}
      {isAuthenticated && (
        <div className="mt-8 text-center">
          <Link href="/payments">
            <span className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
              View payment history →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
