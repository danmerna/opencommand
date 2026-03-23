import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  // Clear any legacy tier data
  useEffect(() => {
    sessionStorage.removeItem("oc_checkout_tier");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center gap-2 border border-emerald-500/30 rounded-full px-4 py-1.5 text-xs text-emerald-400 mb-6">
          <Sparkles size={11} />
          Beta Access — Full Features Unlocked
        </div>
        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Welcome to OpenCommand</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your account is ready. Let's build your AI executive team — we'll connect to your tools, pull your context, and personalize each agent to your business.
        </p>
        <Link href="/onboarding/pro">
          <Button className="w-full h-11 gap-2">
            Start Executive Onboarding <ArrowRight size={14} />
          </Button>
        </Link>
        <p className="text-[11px] text-muted-foreground mt-4">
          Or <Link href="/mission-control" className="text-foreground underline underline-offset-2">go to Mission Control</Link> to explore first.
        </p>
      </div>
    </div>
  );
}
