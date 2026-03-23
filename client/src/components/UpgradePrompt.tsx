import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { Link } from "wouter";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

/**
 * Shown in place of Pro-only features for free/starter users.
 * compact=true renders an inline banner; default renders a full card.
 */
export function UpgradePrompt({ feature, description, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white/[0.02] text-sm">
        <Lock size={13} className="text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-foreground font-medium">{feature}</span>
          {description && <span className="text-muted-foreground ml-2 text-xs">{description}</span>}
        </div>
        <Link href="/pricing">
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-xs h-7">
            <Zap size={11} /> Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-border bg-white/[0.02]">
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center mb-4">
        <Lock size={16} className="text-muted-foreground" />
      </div>
      <p className="text-foreground font-medium mb-1">{feature}</p>
      <p className="text-muted-foreground text-xs mb-6 max-w-xs leading-relaxed">
        {description ?? "This feature is available on the Pro plan. Upgrade to unlock full access."}
      </p>
      <Link href="/pricing">
        <Button className="gap-2">
          <Zap size={13} /> Upgrade to Pro
        </Button>
      </Link>
      <p className="text-[10px] text-muted-foreground/40 mt-3">Starting at $5 / month</p>
    </div>
  );
}
