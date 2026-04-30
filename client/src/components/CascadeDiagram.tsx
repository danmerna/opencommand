/**
 * CascadeDiagram — 5-4-3-2-1-Σ Temporal Cascade visualization
 *
 * Renders an inline SVG showing the full executive cascade:
 *   ARCH (5yr) → LEDGER (4mo) → SIGNAL (3wk) → FORGE (2d) → YOU (now) → Σ (highest-leverage)
 *
 * Each node uses its persona color. Connecting arrows show context inheritance.
 * Σ is visually distinct at the bottom as the synthesis node.
 */

import { useState } from "react";

interface CascadeNode {
  id: string;
  name: string;
  label: string;
  timeHorizon: string;
  focus: string;
  number: string;
  color: string;        // fill color for the circle
  textColor: string;    // text color for labels
  glowColor: string;    // glow/shadow color
}

const CASCADE_NODES: CascadeNode[] = [
  {
    id: "arch",
    name: "ARCH",
    label: "CEO",
    timeHorizon: "5 Years",
    focus: "Vision & Market Position",
    number: "5",
    color: "#818CF8",      // indigo-400
    textColor: "#A5B4FC",  // indigo-300
    glowColor: "#6366F1",  // indigo-500
  },
  {
    id: "ledger",
    name: "LEDGER",
    label: "CFO",
    timeHorizon: "4 Months",
    focus: "Quarterly Feasibility",
    number: "4",
    color: "#34D399",      // emerald-400
    textColor: "#6EE7B7",  // emerald-300
    glowColor: "#10B981",  // emerald-500
  },
  {
    id: "signal",
    name: "SIGNAL",
    label: "CMO",
    timeHorizon: "3 Weeks",
    focus: "Market Timing",
    number: "3",
    color: "#FBBF24",      // amber-400
    textColor: "#FCD34D",  // amber-300
    glowColor: "#F59E0B",  // amber-500
  },
  {
    id: "forge",
    name: "FORGE",
    label: "CTO",
    timeHorizon: "2 Days",
    focus: "Sprint Execution",
    number: "2",
    color: "#F87171",      // red-400
    textColor: "#FCA5A5",  // red-300
    glowColor: "#EF4444",  // red-500
  },
  {
    id: "you",
    name: "YOU",
    label: "Operator",
    timeHorizon: "Now",
    focus: "Decision Point",
    number: "1",
    color: "#94A3B8",      // slate-400
    textColor: "#CBD5E1",  // slate-300
    glowColor: "#64748B",  // slate-500
  },
];

const SIGMA_NODE: CascadeNode = {
  id: "sigma",
  name: "Σ",
  label: "Synthesis",
  timeHorizon: "NOW",
  focus: "Highest-Leverage Move",
  number: "Σ",
  color: "#00D4AA",
  textColor: "#00D4AA",
  glowColor: "#00D4AA",
};

interface CascadeDiagramProps {
  /** Optional: highlight a specific step (0-5, where 5 = Σ) */
  activeStep?: number;
  /** Optional: compact mode for embedding in smaller spaces */
  compact?: boolean;
  /** Optional: animate the cascade flow */
  animated?: boolean;
}

export default function CascadeDiagram({
  activeStep = -1,
  compact = false,
  animated = true,
}: CascadeDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Layout constants
  const nodeRadius = compact ? 24 : 32;
  const nodeSpacingY = compact ? 72 : 90;
  const svgWidth = compact ? 340 : 480;
  const startY = compact ? 40 : 50;
  const centerX = svgWidth / 2;
  const labelOffsetX = nodeRadius + (compact ? 14 : 20);

  // Total height: 5 cascade nodes + sigma + padding
  const cascadeHeight = CASCADE_NODES.length * nodeSpacingY;
  const sigmaGap = compact ? 30 : 40;
  const sigmaY = startY + cascadeHeight + sigmaGap;
  const svgHeight = sigmaY + nodeRadius + (compact ? 40 : 60);

  const renderNode = (node: CascadeNode, index: number, isSigma: boolean) => {
    const y = isSigma ? sigmaY : startY + index * nodeSpacingY;
    const isActive = isSigma ? activeStep >= CASCADE_NODES.length : activeStep >= index;
    const isHovered = hoveredNode === node.id;
    const r = isSigma ? nodeRadius + 6 : nodeRadius;
    const opacity = activeStep === -1 ? 1 : isActive ? 1 : 0.35;

    return (
      <g
        key={node.id}
        opacity={opacity}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: "pointer", transition: "opacity 0.4s ease" }}
      >
        {/* Glow effect */}
        {(isActive || activeStep === -1) && (
          <circle
            cx={centerX}
            cy={y}
            r={r + 8}
            fill="none"
            stroke={node.glowColor}
            strokeWidth={1.5}
            opacity={isHovered ? 0.6 : 0.2}
            style={{ transition: "opacity 0.3s ease" }}
          />
        )}

        {/* Outer ring for Σ */}
        {isSigma && (
          <circle
            cx={centerX}
            cy={y}
            r={r + 4}
            fill="none"
            stroke={node.color}
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.5}
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${centerX} ${y}`}
                to={`360 ${centerX} ${y}`}
                dur="20s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}

        {/* Main circle */}
        <circle
          cx={centerX}
          cy={y}
          r={r}
          fill={`${node.color}15`}
          stroke={node.color}
          strokeWidth={isSigma ? 2.5 : 1.5}
        />

        {/* Number / symbol */}
        <text
          x={centerX}
          y={y + (compact ? 1 : 1)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={node.color}
          fontSize={isSigma ? (compact ? 18 : 22) : (compact ? 13 : 16)}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {node.number}
        </text>

        {/* Left label: Name + Role */}
        <text
          x={centerX - labelOffsetX}
          y={y - (compact ? 6 : 8)}
          textAnchor="end"
          fill={node.textColor}
          fontSize={compact ? 11 : 13}
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          {node.name}
        </text>
        <text
          x={centerX - labelOffsetX}
          y={y + (compact ? 7 : 9)}
          textAnchor="end"
          fill="#71717A"
          fontSize={compact ? 9 : 10}
          fontFamily="system-ui, sans-serif"
        >
          {node.label} · {node.timeHorizon}
        </text>

        {/* Right label: Focus */}
        <text
          x={centerX + labelOffsetX}
          y={y - (compact ? 6 : 8)}
          textAnchor="start"
          fill="#A1A1AA"
          fontSize={compact ? 9 : 10}
          fontFamily="system-ui, sans-serif"
        >
          {node.focus}
        </text>
        {isSigma && (
          <text
            x={centerX + labelOffsetX}
            y={y + (compact ? 7 : 9)}
            textAnchor="start"
            fill={node.color}
            fontSize={compact ? 9 : 10}
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            Do This Now →
          </text>
        )}

        {/* Hover tooltip */}
        {isHovered && !compact && (
          <g>
            <rect
              x={centerX + labelOffsetX}
              y={y + 16}
              width={160}
              height={24}
              rx={4}
              fill="#18181B"
              stroke={node.color}
              strokeWidth={0.5}
              opacity={0.95}
            />
            <text
              x={centerX + labelOffsetX + 8}
              y={y + 32}
              fill="#D4D4D8"
              fontSize={9}
              fontFamily="monospace"
            >
              {isSigma ? "Synthesizes all perspectives" : `Inherits context from above`}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderConnector = (fromIndex: number, toIndex: number, toSigma: boolean) => {
    const fromY = startY + fromIndex * nodeSpacingY + nodeRadius;
    const toY = toSigma
      ? sigmaY - (nodeRadius + 6)
      : startY + toIndex * nodeSpacingY - nodeRadius;
    const isActive = activeStep === -1 || (toSigma ? activeStep >= CASCADE_NODES.length : activeStep >= toIndex);

    return (
      <g key={`conn-${fromIndex}-${toIndex}`} opacity={isActive ? 1 : 0.2}>
        {/* Connector line */}
        <line
          x1={centerX}
          y1={fromY + 4}
          x2={centerX}
          y2={toY - 4}
          stroke={isActive ? "#3F3F46" : "#27272A"}
          strokeWidth={1.5}
          strokeDasharray={toSigma ? "6 4" : "none"}
        />
        {/* Arrow head */}
        <polygon
          points={`${centerX},${toY - 2} ${centerX - 4},${toY - 8} ${centerX + 4},${toY - 8}`}
          fill={isActive ? "#52525B" : "#27272A"}
        />
        {/* Animated flow dot */}
        {animated && isActive && (
          <circle r={2} fill={toSigma ? SIGMA_NODE.color : CASCADE_NODES[toIndex]?.color ?? "#52525B"}>
            <animateMotion
              dur={`${1.5 + fromIndex * 0.3}s`}
              repeatCount="indefinite"
              path={`M${centerX},${fromY + 4} L${centerX},${toY - 4}`}
            />
          </circle>
        )}
      </g>
    );
  };

  return (
    <div className="relative">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="cascade-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#09090B" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <filter id="sigma-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connectors between cascade nodes */}
        {CASCADE_NODES.map((_, i) => {
          if (i < CASCADE_NODES.length - 1) {
            return renderConnector(i, i + 1, false);
          }
          return null;
        })}

        {/* Connector from last cascade node (YOU) to Σ */}
        {renderConnector(CASCADE_NODES.length - 1, CASCADE_NODES.length, true)}

        {/* Cascade nodes */}
        {CASCADE_NODES.map((node, i) => renderNode(node, i, false))}

        {/* Σ node */}
        {renderNode(SIGMA_NODE, CASCADE_NODES.length, true)}

        {/* Title at top */}
        {!compact && (
          <text
            x={centerX}
            y={14}
            textAnchor="middle"
            fill="#52525B"
            fontSize={10}
            fontFamily="monospace"
            letterSpacing="0.15em"
          >
            5-4-3-2-1-Σ TEMPORAL CASCADE
          </text>
        )}
      </svg>
    </div>
  );
}
