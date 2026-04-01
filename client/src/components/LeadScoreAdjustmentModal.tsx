import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Save, X } from "lucide-react";

interface LeadScoreAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  leadName: string;
  currentScore: number;
  currentFactors: {
    equipmentType: number;
    buyerHistory: number;
    engagement: number;
    urgency: number;
  };
  onSave: (adjustments: any) => void;
}

export function LeadScoreAdjustmentModal({
  open,
  onOpenChange,
  leadId,
  leadName,
  currentScore,
  currentFactors,
  onSave,
}: LeadScoreAdjustmentModalProps) {
  const [adjustments, setAdjustments] = useState({
    equipmentType: currentFactors.equipmentType,
    buyerHistory: currentFactors.buyerHistory,
    engagement: currentFactors.engagement,
    urgency: currentFactors.urgency,
  });
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const newScore = Object.values(adjustments).reduce((a, b) => a + b, 0);
  const scoreDelta = newScore - currentScore;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        leadId,
        adjustments,
        reason,
        previousScore: currentScore,
        newScore,
      });
      onOpenChange(false);
      setReason("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjust Lead Score</DialogTitle>
          <DialogDescription>
            Fine-tune the scoring factors for {leadName} to better reflect lead quality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Score */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Current Score</p>
                <p className="text-3xl font-bold">{currentScore}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">New Score</p>
                <p className={`text-3xl font-bold ${scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {newScore}
                </p>
              </div>
              {scoreDelta !== 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Change</p>
                  <p className={`text-2xl font-bold ${scoreDelta > 0 ? "text-green-600" : "text-red-600"}`}>
                    {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scoring Factors */}
          <div className="space-y-4">
            <h3 className="font-semibold">Scoring Factors</h3>

            <div>
              <Label htmlFor="equipment-type">Equipment Type (+0 to 30)</Label>
              <Input
                id="equipment-type"
                type="number"
                min="0"
                max="30"
                value={adjustments.equipmentType}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    equipmentType: Math.max(0, Math.min(30, parseInt(e.target.value) || 0)),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original: {currentFactors.equipmentType} pts
              </p>
            </div>

            <div>
              <Label htmlFor="buyer-history">Buyer History (+0 to 25)</Label>
              <Input
                id="buyer-history"
                type="number"
                min="0"
                max="25"
                value={adjustments.buyerHistory}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    buyerHistory: Math.max(0, Math.min(25, parseInt(e.target.value) || 0)),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original: {currentFactors.buyerHistory} pts
              </p>
            </div>

            <div>
              <Label htmlFor="engagement">Engagement Level (+0 to 25)</Label>
              <Input
                id="engagement"
                type="number"
                min="0"
                max="25"
                value={adjustments.engagement}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    engagement: Math.max(0, Math.min(25, parseInt(e.target.value) || 0)),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original: {currentFactors.engagement} pts
              </p>
            </div>

            <div>
              <Label htmlFor="urgency">Response Urgency (+0 to 20)</Label>
              <Input
                id="urgency"
                type="number"
                min="0"
                max="20"
                value={adjustments.urgency}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    urgency: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original: {currentFactors.urgency} pts
              </p>
            </div>
          </div>

          {/* Reason for Adjustment */}
          <div>
            <Label htmlFor="reason">Reason for Adjustment</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you're adjusting this lead's score (e.g., 'Recent conversation revealed strong buying intent', 'Equipment type changed to higher-value category')"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps track scoring adjustments and improve the algorithm
            </p>
          </div>

          {/* Warning if score exceeds 100 */}
          {newScore > 100 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Score exceeds maximum</p>
                <p className="text-xs text-yellow-700">
                  Scores are capped at 100. Your adjustments total {newScore}, which will be normalized.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !reason.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Adjustment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
