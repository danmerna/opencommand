import React from "react";

interface SigmaBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function SigmaBadge({ size = "md", showLabel = true }: SigmaBadgeProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const labelClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Σ Icon with green gradient */}
      <div
        className={`${sizeClasses[size]} rounded flex items-center justify-center bg-gradient-to-br from-[#00D4AA] to-[#00A888] text-white font-bold flex-shrink-0`}
        title="Built with Σ Agent Builder"
      >
        <span className="text-[0.6em]">Σ</span>
      </div>
      {showLabel && (
        <span className={`${labelClasses[size]} text-[#00D4AA] font-medium whitespace-nowrap`}>
          Built with Σ
        </span>
      )}
    </div>
  );
}
