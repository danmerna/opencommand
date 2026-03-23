import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Check, Zap, Bot, Loader2, ArrowRight, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    price: "$1",
    interval: "/ month",
    tagline: "Start executing.",
    description: "For individual operators getting started with autonomous AI execution.",
    features: [
      "1 active agent",
      "Basic context engineering",
      "Intent-to-outcome workflows",
      "Standard execution speed",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
    icon: Zap,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$5",
    interval: "/ month",
    tagline: "The ultimate force multiplier.",
    description: "For high-performance operators who need full orchestration power.",
    features: [
      "Unlimited active agents",
      "Advanced context engineering",
      "Multi-step workflow orchestration",
      "Priority execution speed",
      "Proof of Outcome receipts",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
    icon: Bot,
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
    // Store the tier so PaymentSuccess can route Pro users to onboarding
    sessionStorage.setItem("oc_checkout_tier", productKey.toLowerCase());
    setLoadingKey(productKey);
    checkoutMutation.mutate({
      productKey,
      origin: window.location.origin,
    });
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">IntelligenceOS</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight mb-3">
          Simple, transparent pricing.
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg">
          Start free, scale as you grow. Every plan includes access to the IntelligenceOS orchestration layer.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingKey === plan.key;

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
                  <span className="bg-foreground text-background text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full">
                    Most Popular
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
                    <span className="text-sm text-muted-foreground">{plan.interval}</span>
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
              {isAuthenticated && subscription.tier === plan.key.toLowerCase() && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-3">
                  <BadgeCheck size={13} />
                  <span>Your current plan</span>
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={() => handleCheckout(plan.key)}
                disabled={isLoading || (isAuthenticated && subscription.tier === plan.key.toLowerCase())}
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> Processing...</>
                ) : isAuthenticated && subscription.tier === plan.key.toLowerCase() ? (
                  <><BadgeCheck size={14} /> Active Plan</>
                ) : (
                  <>{plan.cta} <ArrowRight size={14} /></>
                )}
              </Button>

              {!isAuthenticated && (
                <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
                  Sign in required to subscribe
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ / Trust section */}
      <div className="border-t border-border pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-foreground font-medium mb-1">Cancel anytime</p>
            <p className="text-muted-foreground text-xs leading-relaxed">No lock-in. Cancel your subscription at any time from your account settings.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Secure payments</p>
            <p className="text-muted-foreground text-xs leading-relaxed">All payments are processed securely via Stripe. We never store your card details.</p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Test with confidence</p>
            <p className="text-muted-foreground text-xs leading-relaxed">Use card <span className="font-mono">4242 4242 4242 4242</span> with any future date to test checkout.</p>
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
