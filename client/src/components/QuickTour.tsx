import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, BookOpen, Zap, Brain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TourStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "strategy",
    title: "Strategy Tab",
    description: "View Arch's strategic proposals, accept plans, and track execution. This is where your AI CEO translates context into actionable strategy.",
    icon: <BookOpen size={16} className="text-amber-400" />,
    targetSelector: '[data-tour="strategy"]',
    position: "right",
  },
  {
    id: "fleet",
    title: "Agent Fleet",
    description: "Monitor your executive agents in real-time. Each agent's status, health score, and recent actions are visible here. Click any agent to drill into their performance.",
    icon: <Zap size={16} className="text-blue-400" />,
    targetSelector: '[data-tour="fleet"]',
    position: "right",
  },
  {
    id: "intent-engine",
    title: "Intent Engine",
    description: "Ask questions in natural language and get answers grounded in your live business data. The engine self-contextualizes — pulling from every connected tool to give you accurate, real-time intelligence.",
    icon: <Brain size={16} className="text-purple-400" />,
    targetSelector: '[data-tour="intent-engine"]',
    position: "left",
  },
];

const TOUR_STORAGE_KEY = "opencommand_tour_completed";

interface QuickTourProps {
  isFirstTime: boolean;
}

export function QuickTour({ isFirstTime }: QuickTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    if (!isFirstTime) return;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTime]);

  const positionTooltip = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const target = document.querySelector(step.targetSelector);
    if (!target) {
      // If target not found, position in center
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160 });
      setSpotlightRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    setSpotlightRect(rect);

    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const gap = 16;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case "bottom":
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    // Clamp to viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => window.removeEventListener("resize", positionTooltip);
  }, [isActive, currentStep, positionTooltip]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[9998]" onClick={handleSkip}>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-spotlight">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 6}
                  y={spotlightRect.top - 6}
                  width={spotlightRect.width + 12}
                  height={spotlightRect.height + 12}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#tour-spotlight)"
          />
        </svg>
      </div>

      {/* Spotlight ring */}
      {spotlightRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-blue-400/60 ring-offset-2 ring-offset-transparent animate-pulse"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[10000] w-80 animate-fade-in"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onClick={e => e.stopPropagation()}
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Quick Tour</span>
            </div>
            <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              {step.icon}
              <h3 className="text-sm font-medium text-foreground">{step.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStep ? "bg-blue-400 scale-125" : i < currentStep ? "bg-emerald-400" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 px-2 text-xs gap-1">
                  <ArrowLeft size={10} /> Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs gap-1">
                {isLast ? (
                  <><CheckCircle2 size={10} /> Got it</>
                ) : (
                  <>Next <ArrowRight size={10} /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
