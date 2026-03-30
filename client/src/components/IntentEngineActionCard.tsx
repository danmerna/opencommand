import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, RotateCcw, Zap } from "lucide-react";

export interface ActionCardProps {
  id: number;
  question: string;
  recommended: {
    text: string;
    reasoning: string;
  };
  conservative: {
    text: string;
    reasoning: string;
  };
  aggressive: {
    text: string;
    reasoning: string;
  };
  riskLevel: "low" | "medium" | "high";
  onAccept: (option: "recommended" | "conservative" | "aggressive") => void;
  onRegenerate: () => void;
  onAskBoard: () => void;
  isLoading?: boolean;
  isBoardLoading?: boolean;
}

export function IntentEngineActionCard({
  id,
  question,
  recommended,
  conservative,
  aggressive,
  riskLevel,
  onAccept,
  onRegenerate,
  onAskBoard,
  isLoading = false,
  isBoardLoading = false,
}: ActionCardProps) {
  const [selectedOption, setSelectedOption] = useState<"recommended" | "conservative" | "aggressive">(
    "recommended"
  );
  const [showBoardResponse, setShowBoardResponse] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const options = {
    recommended,
    conservative,
    aggressive,
  };

  const selectedText = options[selectedOption];

  return (
    <Card className={`border-2 ${getRiskColor(riskLevel)}`}>
      {/* Header with Ask Board button positioned at top */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{question}</CardTitle>
            <CardDescription className="mt-2">Action #{id}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowBoardResponse(true);
              onAskBoard();
            }}
            disabled={isBoardLoading}
            className="whitespace-nowrap"
          >
            {isBoardLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Asking Board...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1" />
                Ask Board
              </>
            )}
          </Button>
        </div>

        {/* Risk level badge */}
        <div className="mt-3">
          <Badge
            variant="outline"
            className={`${getRiskColor(riskLevel)} border`}
          >
            {riskLevel.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Option selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Choose an approach:</label>
          <div className="grid grid-cols-3 gap-2">
            {(["recommended", "conservative", "aggressive"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSelectedOption(option)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedOption === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <div className="font-medium text-sm capitalize">{option}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {option === "recommended" && "Balanced approach"}
                  {option === "conservative" && "Low risk"}
                  {option === "aggressive" && "High reward"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected option display */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
          <div className="font-medium text-sm">
            {selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1)} Approach
          </div>
          <div className="text-sm text-gray-700">{selectedText.text}</div>
          <div className="text-xs text-gray-600 italic">
            <strong>Reasoning:</strong> {selectedText.reasoning}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onAccept(selectedOption)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
