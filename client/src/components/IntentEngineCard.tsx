import React, { useState } from "react";
import { GestureHandler } from "./GestureHandler";
import { ChevronRight, Zap, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";

export interface IntentEngineCardProps {
  id: string;
  title: string;
  description: string;
  boardQuestion: string;
  options: {
    recommended: {
      title: string;
      description: string;
      dataPoints: string[];
      riskLevel: "low" | "medium" | "high";
    };
    conservative: {
      title: string;
      description: string;
      dataPoints: string[];
      riskLevel: "low" | "medium" | "high";
    };
    aggressive: {
      title: string;
      description: string;
      dataPoints: string[];
      riskLevel: "low" | "medium" | "high";
    };
  };
  onApprove: (actionId: string, option: "recommended" | "conservative" | "aggressive") => void;
  onDismiss: (actionId: string) => void;
  onAskBoard: (actionId: string) => void;
}

const getRiskColor = (level: "low" | "medium" | "high") => {
  switch (level) {
    case "low":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "medium":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "high":
      return "text-red-400 bg-red-400/10 border-red-400/30";
  }
};

const getRiskIcon = (level: "low" | "medium" | "high") => {
  switch (level) {
    case "low":
      return <AlertCircle size={14} />;
    case "medium":
      return <Zap size={14} />;
    case "high":
      return <TrendingUp size={14} />;
  }
};

export const IntentEngineCard: React.FC<IntentEngineCardProps> = ({
  id,
  title,
  description,
  boardQuestion,
  options,
  onApprove,
  onDismiss,
  onAskBoard,
}) => {
  const [selectedOption, setSelectedOption] = useState<"recommended" | "conservative" | "aggressive" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSwipeRight = () => {
    if (selectedOption) {
      onApprove(id, selectedOption);
    }
  };

  const handleSwipeLeft = () => {
    onDismiss(id);
  };

  const handleTap = () => {
    setShowDetails(!showDetails);
  };

  return (
    <GestureHandler
      onSwipeRight={handleSwipeRight}
      onSwipeLeft={handleSwipeLeft}
      onTap={handleTap}
      threshold={50}
      className="w-full"
    >
      <div className="card-minimal overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
          </div>
          <div className="text-xs text-muted-foreground ml-2">Swipe to decide</div>
        </div>

        {/* Option Selection */}
        <div className="space-y-2 mb-4">
          {(["recommended", "conservative", "aggressive"] as const).map((optionType) => {
            const option = options[optionType];
            const isSelected = selectedOption === optionType;

            return (
              <button
                key={optionType}
                onClick={() => setSelectedOption(isSelected ? null : optionType)}
                className={`w-full text-left p-3 rounded border transition-all ${
                  isSelected
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-border hover:border-border/80 bg-background/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{option.title}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider border rounded px-1.5 py-0.5 ${getRiskColor(option.riskLevel)}`}>
                        {getRiskIcon(option.riskLevel)}
                        {option.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {option.dataPoints.map((point, idx) => (
                        <span key={idx} className="text-[10px] bg-background/80 border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded border mt-0.5 ml-2 flex-shrink-0 transition-all ${isSelected ? "bg-cyan-400 border-cyan-400" : "border-border"}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Details Section (Expandable) */}
        {showDetails && (
          <div className="mb-4 p-3 bg-background/50 border border-border rounded">
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Escalate to Board:</span>
            </p>
            <p className="text-sm text-foreground">{boardQuestion}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {selectedOption ? (
            <>
              <button
                onClick={() => handleSwipeRight()}
                className="flex-1 btn-primary text-xs py-2 gap-1"
              >
                <ChevronRight size={14} /> Approve
              </button>
              <button
                onClick={() => handleSwipeLeft()}
                className="flex-1 btn-outline text-xs py-2"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAskBoard(id)}
                className="flex-1 btn-outline text-xs py-2"
              >
                Ask Board
              </button>
              <button
                onClick={() => handleSwipeLeft()}
                className="flex-1 btn-outline text-xs py-2 text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                Skip
              </button>
            </>
          )}
        </div>

        {/* Swipe Hint */}
        <div className="mt-3 text-center text-[10px] text-muted-foreground">
          👉 Swipe right to approve • Swipe left to dismiss
        </div>
      </div>
    </GestureHandler>
  );
};

export default IntentEngineCard;
