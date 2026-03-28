"use client";

import { useState, useEffect } from "react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  layer: string;
  layerColor: string;
  defaultChecked: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "ga4",
    label: "Google Analytics 4",
    description: "Website traffic & visitor behavior tracking",
    layer: "Behavioral",
    layerColor: "#9B6FCF",
    defaultChecked: true,
  },
  {
    id: "pixel",
    label: "Meta Pixel",
    description: "Ad attribution & retargeting audiences",
    layer: "Behavioral",
    layerColor: "#9B6FCF",
    defaultChecked: true,
  },
  {
    id: "anvil",
    label: "Anvil Pro DMS",
    description: "Inventory, transactions & customer records",
    layer: "Transactional",
    layerColor: "#4A90D9",
    defaultChecked: false,
  },
  {
    id: "tractorhouse",
    label: "TractorHouse Leads",
    description: "Inbound equipment inquiries from marketplace",
    layer: "Market",
    layerColor: "#C8645A",
    defaultChecked: false,
  },
  {
    id: "gmail",
    label: "Gmail / Email",
    description: "Customer communication & lead responses",
    layer: "Relationship",
    layerColor: "#00D4AA",
    defaultChecked: false,
  },
  {
    id: "jdlink",
    label: "John Deere JDLink",
    description: "Machine telematics, hours & location data",
    layer: "Machine",
    layerColor: "#D4883A",
    defaultChecked: false,
  },
  {
    id: "crm",
    label: "CRM System",
    description: "Pipeline, contacts & deal management",
    layer: "Relationship",
    layerColor: "#00D4AA",
    defaultChecked: false,
  },
  {
    id: "competitor",
    label: "Competitor Pricing Feeds",
    description: "Market pricing from RDO, Titan, others",
    layer: "Market",
    layerColor: "#C8645A",
    defaultChecked: false,
  },
];

interface OnboardingChecklistProps {
  onCheckChange: (checked: Record<string, boolean>) => void;
}

export default function OnboardingChecklist({
  onCheckChange,
}: OnboardingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      initial[item.id] = item.defaultChecked;
    });
    return initial;
  });

  useEffect(() => {
    onCheckChange(checked);
  }, [checked]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const connectedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Data Connections
        </h3>
        <span className="text-[11px] font-mono text-text-muted">
          {connectedCount}/{CHECKLIST_ITEMS.length} active
        </span>
      </div>

      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              checked[item.id]
                ? "bg-[#0F1419] border border-[#1E2A35]"
                : "bg-transparent border border-transparent hover:border-[#1E2A35]"
            }`}
          >
            {/* Checkbox */}
            <div
              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                checked[item.id]
                  ? "bg-accent"
                  : "border border-[#2A3A4A]"
              }`}
            >
              {checked[item.id] && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  className="text-bg"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Layer color dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.layerColor }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${
                    checked[item.id]
                      ? "text-text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
                {checked[item.id] && (
                  <span className="text-[9px] font-mono text-accent uppercase tracking-wider">
                    connected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted truncate">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
