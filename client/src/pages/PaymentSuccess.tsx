import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();

  // Read session_id from URL to detect tier
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id") ?? "";

  // We detect Pro by checking the Pricing page's product key stored in sessionStorage
  const tier = sessionStorage.getItem("oc_checkout_tier") ?? "";
  const isPro = tier === "pro" || tier === "PRO_MONTHLY";

  useEffect(() => {
    // Clear the stored tier after reading
    sessionStorage.removeItem("oc_checkout_tier");
  }, []);

  if (isPro) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-8">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center gap-2 border border-amber-400/30 rounded-full px-4 py-1.5 text-xs text-amber-400 mb-6">
            <Sparkles size={11} />
            Pro Plan Activated
          </div>
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Welcome to Pro</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Your executive team is ready to be assembled. Let's set up your company, onboard each C-suite agent, and generate your first combined strategy.
          </p>
          <Link href="/onboarding/pro">
            <Button className="w-full h-11 gap-2">
              Begin Executive Onboarding <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-md w-full text-center">
        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-6" />
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Payment Confirmed</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your purchase has been processed successfully. Your plan is now active.
        </p>
        <Link href="/mission-control">
          <Button className="w-full h-11">Go to Mission Control</Button>
        </Link>
      </div>
    </div>
  );
}
