import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers, Cpu, Wand2, PenLine, Check } from "lucide-react";
import { toast } from "sonner";

// ─── Template options shown in step 2 ────────────────────────────────────────
const STARTER_TEMPLATES = [
  {
    id: "sigma",
    label: "Let Σ build it for me",
    desc: "Answer a few questions and Σ generates the full blueprint automatically.",
    icon: Wand2,
    href: "/intent-engine",
    color: "text-accent",
  },
  {
    id: "blank",
    label: "Start from scratch",
    desc: "Open a blank canvas and drag nodes from the palette.",
    icon: PenLine,
    href: "/blueprints/new/builder",
    color: "text-blue-400",
  },
  {
    id: "trading",
    label: "Prediction Market Trader",
    desc: "Pre-built: Market Scanner → Analyst → Position Manager with HITL gates.",
    icon: Layers,
    href: "/blueprints",
    color: "text-cyan-400",
  },
  {
    id: "content",
    label: "Content Engine",
    desc: "Pre-built: Trend Researcher → Writer → Publisher with goal tracking.",
    icon: Cpu,
    href: "/blueprints",
    color: "text-purple-400",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuickOnboarding({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => {
      const tmpl = STARTER_TEMPLATES.find((t) => t.id === selected);
      onClose();
      if (tmpl) navigate(tmpl.href);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const handleFinish = () => {
    completeOnboarding.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-border">
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <DialogHeader>
                <p className="text-xs text-muted-foreground font-mono mb-1">Step 1 of 3</p>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Welcome to OpenCommand
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-relaxed">
                OpenCommand orchestrates AI agents across your business — routing tasks to the right model,
                enforcing human checkpoints, and verifying every output before it's accepted.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Build", desc: "Visual blueprint builder" },
                  { label: "Deploy", desc: "Agents run autonomously" },
                  { label: "Verify", desc: "Every output checked" },
                ].map((item) => (
                  <div key={item.label} className="bg-background rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <Button
                className="w-full btn-primary gap-2"
                onClick={() => setStep(2)}
              >
                Get started <ArrowRight size={14} />
              </Button>
            </div>
          )}

          {/* Step 2: Choose a starting point */}
          {step === 2 && (
            <div className="space-y-4">
              <DialogHeader>
                <p className="text-xs text-muted-foreground font-mono mb-1">Step 2 of 3</p>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  How do you want to start?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelected(tmpl.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selected === tmpl.id
                        ? "border-accent bg-accent/5"
                        : "border-border/50 bg-background hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tmpl.icon size={16} className={tmpl.color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{tmpl.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{tmpl.desc}</p>
                      </div>
                      {selected === tmpl.id && (
                        <Check size={14} className="text-accent shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1 btn-primary gap-2"
                  disabled={!selected}
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm + go */}
          {step === 3 && (
            <div className="space-y-6">
              <DialogHeader>
                <p className="text-xs text-muted-foreground font-mono mb-1">Step 3 of 3</p>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  You're ready
                </DialogTitle>
              </DialogHeader>
              <div className="bg-background rounded-lg p-4 border border-border/50 space-y-3">
                <p className="text-xs text-muted-foreground font-mono">STARTING WITH</p>
                {(() => {
                  const tmpl = STARTER_TEMPLATES.find((t) => t.id === selected);
                  if (!tmpl) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <tmpl.icon size={18} className={tmpl.color} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tmpl.label}</p>
                        <p className="text-[11px] text-muted-foreground">{tmpl.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-accent" />
                  Every agent task is verified by an independent LLM
                </div>
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-accent" />
                  Human-in-the-loop checkpoints at any step
                </div>
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-accent" />
                  Free during beta — no credit card required
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1 btn-primary gap-2"
                  onClick={handleFinish}
                  disabled={completeOnboarding.isPending}
                >
                  {completeOnboarding.isPending ? "Loading..." : <>Launch <ArrowRight size={14} /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
