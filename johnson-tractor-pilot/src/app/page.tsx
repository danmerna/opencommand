"use client";

import { useState, useCallback } from "react";
import SigmaChat from "@/components/SigmaChat";
import RadarChart from "@/components/RadarChart";
import OnboardingChecklist from "@/components/OnboardingChecklist";

const LAYER_MAP: Record<string, { key: string; label: string; color: string; items: string[] }> = {
  Transactional: {
    key: "transactional",
    label: "Transactional",
    color: "#4A90D9",
    items: ["anvil"],
  },
  Behavioral: {
    key: "behavioral",
    label: "Behavioral",
    color: "#9B6FCF",
    items: ["ga4", "pixel"],
  },
  Relationship: {
    key: "relationship",
    label: "Relationship",
    color: "#00D4AA",
    items: ["gmail", "crm"],
  },
  Machine: {
    key: "machine",
    label: "Machine & Fleet",
    color: "#D4883A",
    items: ["jdlink"],
  },
  Market: {
    key: "market",
    label: "Market & Intent",
    color: "#C8645A",
    items: ["tractorhouse", "competitor"],
  },
};

function computeLayerValues(checked: Record<string, boolean>) {
  return Object.values(LAYER_MAP).map((layer) => {
    const active = layer.items.filter((id) => checked[id]).length;
    const value = layer.items.length > 0 ? Math.round((active / layer.items.length) * 100) : 0;
    return {
      key: layer.key,
      label: layer.label,
      color: layer.color,
      value,
    };
  });
}

export default function Home() {
  const [layers, setLayers] = useState(() =>
    computeLayerValues({ ga4: true, pixel: true })
  );

  const handleCheckChange = useCallback((checked: Record<string, boolean>) => {
    setLayers(computeLayerValues(checked));
  }, []);

  const coverage = Math.round(
    layers.reduce((sum, l) => sum + l.value, 0) / layers.length
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1E2A35]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
            <span className="text-bg font-bold text-sm">Σ</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">
              Johnson Tractor
            </h1>
            <p className="text-[11px] text-text-muted">
              Sigma Pilot Experience
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-text-muted">Context Coverage</p>
            <p className="text-sm font-mono text-accent">{coverage}%</p>
          </div>
          <div className="w-px h-8 bg-[#1E2A35]" />
          <div className="text-right">
            <p className="text-[11px] text-text-muted">Agent Level</p>
            <p className="text-sm font-mono text-accent">L1 — Drafts</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Σ Chat */}
        <div className="flex-1 flex flex-col border-r border-[#1E2A35] min-w-0">
          <SigmaChat />
        </div>

        {/* Right: Context Map + Checklist */}
        <div className="w-[380px] flex flex-col overflow-y-auto">
          {/* Radar chart */}
          <div className="p-5 border-b border-[#1E2A35]">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Context Map
            </h3>
            <RadarChart layers={layers} />
          </div>

          {/* Checklist */}
          <div className="p-5 flex-1">
            <OnboardingChecklist onCheckChange={handleCheckChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
