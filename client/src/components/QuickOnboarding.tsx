import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers, TrendingUp, FileText, Wand2, Check, X } from "lucide-react";
import { toast } from "sonner";

// ─── Blueprint template options ───────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "trading",
    label: "Prediction Market Trader",
    desc: "Market Scanner → Event Analyst → Position Manager. HITL approval before each trade.",
    icon: TrendingUp,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-500/5",
    href: "/blueprints/1/builder",
  },
  {
    id: "content",
    label: "Content Engine",
    desc: "Trend Researcher → Content Writer → Publisher. Review before publishing.",
    icon: FileText,
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
    href: "/blueprints/2/builder",
  },
  {
    id: "research",
    label: "Market Intelligence",
    desc: "Competitor Monitor → Analyst → Briefing Writer. Weekly intelligence reports.",
    icon: Layers,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/5",
    href: "/blueprints/30001/builder",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuickOnboarding({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const finish = (destination: string) => {
    completeOnboarding.mutate(undefined, {
      onSettled: () => {
        onClose();
        navigate(destination);
      },
    });
  };

  const handleSkip = () => {
    completeOnboarding.mutate(undefined, {
      onSettled: () => onClose(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-border">
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <div className="p-6">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="space-y-5">
              <DialogHeader>
                <p className="text-xs text-muted-foreground font-mono mb-1">1 of 2</p>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Welcome to OpenCommand
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Orchestrate AI agents across your business. Every task is verified by an independent LLM before it's accepted. You stay in control with human-in-the-loop checkpoints.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Build", desc: "Visual blueprint builder" },
                  { label: "Deploy", desc: "Agents run autonomously" },
                  { label: "Verify", desc: "Every output checked" },
                ].map((item) => (
                  <div key={item.label} className="bg-background rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleSkip}
                  disabled={completeOnboarding.isPending}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 btn-primary gap-2"
                  onClick={() => setStep(2)}
                >
                  Choose a starting point <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Choose starting point ── */}
          {step === 2 && (
            <div className="space-y-4">
              <DialogHeader>
                <p className="text-xs text-muted-foreground font-mono mb-1">2 of 2</p>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Pick a blueprint to start
                </DialogTitle>
              </DialogHeader>

              <p className="text-xs text-muted-foreground">
                Choose a pre-built template or let Σ build one for you from scratch.
              </p>

              {/* Template cards */}
              <div className="space-y-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelected(tmpl.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selected === tmpl.id
                        ? `${tmpl.borderColor} ${tmpl.bgColor}`
                        : "border-border/50 bg-background hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tmpl.icon size={15} className={tmpl.color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{tmpl.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{tmpl.desc}</p>
                      </div>
                      {selected === tmpl.id && (
                        <Check size={13} className="text-accent shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Start new with Σ */}
              <button
                onClick={() => finish("/intent-engine")}
                disabled={completeOnboarding.isPending}
                className="w-full text-left p-3 rounded-lg border border-border/50 bg-background hover:border-accent/50 hover:bg-accent/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Wand2 size={15} className="text-accent group-hover:text-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Start new with Σ</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Answer a few questions and Σ builds the full blueprint for you.</p>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                </div>
              </button>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleSkip}
                  disabled={completeOnboarding.isPending}
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1 btn-primary gap-2"
                  disabled={!selected || completeOnboarding.isPending}
                  onClick={() => {
                    const tmpl = TEMPLATES.find((t) => t.id === selected);
                    if (tmpl) finish(tmpl.href);
                  }}
                >
                  {completeOnboarding.isPending ? "Loading..." : <>Open blueprint <ArrowRight size={14} /></>}
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
