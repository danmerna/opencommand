import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SigmaImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: number;
  onSuccess?: () => void;
}

export function SigmaImportModal({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: SigmaImportModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const importMutation = trpc.agents.importFromSpec.useMutation();

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error("Please paste a Σ agent spec");
      return;
    }

    try {
      setIsLoading(true);
      const spec = JSON.parse(jsonInput);
      await importMutation.mutateAsync({
        spec,
        companyId,
      });
      toast.success("Agent imported from Σ successfully!");
      setJsonInput("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("Invalid JSON. Please check your Σ agent spec.");
      } else {
        toast.error("Failed to import agent");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00D4AA] to-[#00A888] text-white flex items-center justify-center text-xs font-bold">
              Σ
            </div>
            Import Agent from Σ Agent Builder
          </DialogTitle>
          <DialogDescription>
            Paste your Σ agent specification JSON below. Your agent will be created and ready to deploy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Agent Specification (JSON)
            </label>
            <Textarea
              placeholder={`{
  "name": "My Sales Agent",
  "role": "VP of Sales",
  "capabilities": ["lead-scoring", "outreach"],
  "dataSources": ["hubspot", "gmail"],
  "systemInstructions": "..."
}`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="font-mono text-sm h-64"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading || !jsonInput.trim()}
              className="bg-[#00D4AA] hover:bg-[#00A888] text-black"
            >
              {isLoading ? "Importing..." : "Import Agent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
