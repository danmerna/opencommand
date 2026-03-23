import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Check, Zap, Bot, Shield, Loader2, ArrowRight, BadgeCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const PLANS = [
  {
    key: "TRIAL",
    name: "Free Trial",
    price: "7 days",
    priceUnit: "free",
    tagline: "Experience the full platform.",
    description: "Full Pro access for 7 days. No credit card required. No commitment — just sign up and start.",
    features: [
      "Full Pro features for 7 days",
      "10 connected tools",
      "5 agents",
      "Self-contextualizing engine",
      "Full PoO receipts",
      "No credit card required",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    icon: Zap,
    isCheckout: false,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$29",
    priceUnit: "/ month",
    tagline: "The full self-contextualizing engine.",
    description: "For serious operators who need autonomous execution with full context engineering.",
    features: [
      "100 commands / month",
      "10 connected tools",
      "5 agents",
      "Self-contextualizing engine",
      "Full + trace PoO receipts",
      "3 workspaces",
      "$10/mo execution credits",
    ],
    cta: "Go Pro",
    highlighted: true,
    icon: Bot,
    isCheckout: true,
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "$99",
    priceUnit: "/ month",
    tagline: "Unlimited everything. Full API access.",
    description: "For teams and agencies running multiple workspaces with marketplace selling.",
    features: [
      "Unlimited commands",
      "Unlimited connected tools",
      "Unlimited agents",
      "Full + custom engine",
      "Full + API PoO receipts",
      "Unlimited workspaces",
      "$50/mo execution credits",
      "Featured marketplace selling",
    ],
    cta: "Contact Us",
    highlighted: false,
    icon: Shield,
    isCheckout: true,
  },
];

export default function Pricing() {
  const { isAuthenticated, user } = useAuth();
  const subscription = useSubscription();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const checkoutMutation = trpc.payments.checkout.useMutation({
    onSuccess: (data) => {
      toast.success("Redirecting to checkout...");
      window.open(data.url, "_blank");
      setLoadingKey(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to start checkout. Please try again.");
      setLoadingKey(null);
    },
  });

  const handleCheckout = (productKey: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    sessionStorage.setItem("oc_checkout_tier", productKey.toLowerCase());
    setLoadingKey(productKey);
    checkoutMutation.mutate({
      productKey,
      origin: window.location.origin,
    });
  };

  const handleTrialStart = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toast.success("Welcome! Your 7-day free trial is active.");
    window.location.href = "/onboarding";
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Personal Intelligence Engine</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight mb-3">
          Try everything free for 7 days.
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg">
          No credit card required. Full access to the self-contextualizing engine for a week. Pick a plan when you're ready.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingKey === plan.key;
          const isCurrentPlan = isAuthenticated && subscription.tier === plan.key.toLowerCase();

          return (
            <div
              key={plan.key}
              className={`relative rounded-xl border p-8 flex flex-col transition-all ${
                plan.highlighted
                  ? "border-foreground/30 bg-white/[0.03]"
                  : "border-border bg-transparent"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-8">
                  <span className="bg-foreground text-background text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={10} /> Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground tracking-widest uppercase">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.priceUnit}</span>
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-sm font-medium text-foreground mb-2">{plan.tagline}</p>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check size={13} className="text-foreground shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Current plan badge */}
              {isCurrentPlan && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-3">
                  <BadgeCheck size={13} />
                  <span>Your current plan</span>
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={() => plan.isCheckout ? handleCheckout(plan.key) : handleTrialStart()}
                disabled={isLoading || isCurrentPlan}
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> Processing...</>
                ) : isCurrentPlan ? (
                  <><BadgeCheck size={14} /> Active Plan</>
                ) : (
                  <>{plan.cta} <ArrowRight size={14} /></>
                )}
              </Button>

              {!isAuthenticated && plan.key === "TRIAL" && (
                <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
                  Sign up to start your free trial
                </p>
              )}
              {!isAuthenticated && plan.isCheckout && (
                <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
                  Sign in required to subscribe
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Founding member callout */}
      <div className="text-center mb-10">
        <p className="text-xs text-muted-foreground">
          <span className="text-amber-400/80">Founding Member pricing:</span>{" "}
          $19/mo for Pro, locked in forever. First 500 users.
        </p>
      </div>

      {/* FAQ / Trust section */}
      <div className="border-t border-border pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-foreground font-medium mb-1">7-day free trial</p>
            <p className="text-muted-foreground text-xs leading-relaxed">Full Pro access for a week. No credit card required. Downgrade or cancel anytime.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Cancel anytime</p>
            <p className="text-muted-foreground text-xs leading-relaxed">No lock-in. Cancel your subscription at any time from your account settings.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Secure payments</p>
            <p className="text-muted-foreground text-xs leading-relaxed">All payments are processed securely via Stripe. We never store your card details.</p>
          </div>
        </div>
      </div>

      {/* Payment history link */}
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
