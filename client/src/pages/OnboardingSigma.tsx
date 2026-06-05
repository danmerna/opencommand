import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { SigmaImportModal } from "@/components/SigmaImportModal";

export function OnboardingSigma() {
  const { user } = useAuth();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedAgent, setImportedAgent] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to continue</p>
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[oklch(0.72 0.12 250)] to-[oklch(0.60 0.10 250)] text-white flex items-center justify-center font-bold">
              Σ
            </div>
            <h1 className="text-xl font-bold text-foreground">Sigma → OpenCommand</h1>
          </div>
          <Link href="/mission-control">
            <Button variant="outline">Skip to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Step 1: Discover */}
          <Card className="relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[oklch(0.72 0.12 250)] text-black font-bold flex items-center justify-center text-sm">
              1
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-[oklch(0.72 0.12 250)] to-[oklch(0.60 0.10 250)] text-white flex items-center justify-center text-xs font-bold">
                  Σ
                </div>
                Discover Your Agent
              </CardTitle>
              <CardDescription>Use Sigma Agent Builder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Visit Sigma Agent Builder to describe your workflow. Sigma will ask targeted Socratic questions to understand your needs.
              </p>
              <a
                href="https://okcomputer.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button className="w-full bg-[oklch(0.72 0.12 250)] hover:bg-[oklch(0.60 0.10 250)] text-black">
                  Open Sigma Agent Builder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground">
                Sigma will generate a structured agent spec for you to copy.
              </p>
            </CardContent>
          </Card>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Step 2: Import */}
          <Card className="relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[oklch(0.72 0.12 250)] text-black font-bold flex items-center justify-center text-sm">
              2
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[oklch(0.72 0.12 250)]" />
                Import to OpenCommand
              </CardTitle>
              <CardDescription>Deploy your agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste your Sigma agent spec below. OpenCommand will create the agent and prepare it for deployment.
              </p>
              <Button
                onClick={() => setShowImportModal(true)}
                className="w-full"
                variant="outline"
              >
                Import Agent Spec
              </Button>
              {importedAgent && (
                <div className="p-3 rounded bg-[oklch(0.72 0.12 250)]/10 border border-[oklch(0.72 0.12 250)]/20">
                  <p className="text-sm text-[oklch(0.72 0.12 250)] font-medium">✓ Agent imported successfully</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Step 3: Execute */}
          <Card className="relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[oklch(0.72 0.12 250)] text-black font-bold flex items-center justify-center text-sm">
              3
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[oklch(0.72 0.12 250)]" />
                Execute & Monitor
              </CardTitle>
              <CardDescription>Watch it work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your agent is now live. Configure autonomy levels, set up heartbeats, and monitor performance in real-time.
              </p>
              <Link href="/mission-control">
                <Button className="w-full bg-[oklch(0.72 0.12 250)] hover:bg-[oklch(0.60 0.10 250)] text-black">
                  Go to Mission Control
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Sigma Agent Builder</strong> is a Socratic questioning tool that helps you discover the perfect agent for your workflow. Through conversation, it builds a structured specification.
            </p>
            <p>
              <strong>OpenCommand</strong> takes that specification and deploys it as a fully autonomous agent with context awareness, autonomy controls, and real-time monitoring.
            </p>
            <p>
              Together, they form a complete workflow: <strong>Discover → Deploy → Execute</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <SigmaImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={() => {
          setImportedAgent("Agent imported");
        }}
      />
    </div>
  );
}
