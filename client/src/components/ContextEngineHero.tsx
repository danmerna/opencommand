import { useEffect, useState, useRef } from "react";

/**
 * Animated hero illustration showing data flowing from tool icons into a central "brain" node.
 * Pure CSS/SVG animation — no external dependencies.
 */

const TOOLS = [
  { name: "HubSpot", color: "#FF7A59", icon: "H", angle: 30 },
  { name: "Salesforce", color: "#00A1E0", icon: "S", angle: 75 },
  { name: "Google Ads", color: "#4285F4", icon: "G", angle: 120 },
  { name: "Stripe", color: "#635BFF", icon: "$", angle: 165 },
  { name: "Slack", color: "#E01E5A", icon: "#", angle: 210 },
  { name: "GA4", color: "#F9AB00", icon: "A", angle: 255 },
  { name: "Meta", color: "#1877F2", icon: "M", angle: 300 },
  { name: "Shopify", color: "#96BF48", icon: "S", angle: 345 },
];

const DATA_LABELS = [
  "pipeline_revenue",
  "lead_score: 87",
  "campaign_roas: 4.2x",
  "mrr: $42,800",
  "churn_rate: 1.2%",
  "cac: $127",
  "ltv: $3,400",
  "nps_score: 72",
  "active_deals: 34",
  "email_open_rate: 38%",
  "conversion: 3.8%",
  "arr_growth: +22%",
];

interface Particle {
  id: number;
  toolIndex: number;
  label: string;
  progress: number;
  opacity: number;
}

export function ContextEngineHero() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pulsePhase, setPulsePhase] = useState(0);
  const nextId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Spawn particles from tool nodes toward center
  useEffect(() => {
    const interval = setInterval(() => {
      const toolIndex = Math.floor(Math.random() * TOOLS.length);
      const label = DATA_LABELS[Math.floor(Math.random() * DATA_LABELS.length)];
      setParticles(prev => [
        ...prev.filter(p => p.progress < 1.05),
        { id: nextId.current++, toolIndex, label, progress: 0, opacity: 1 },
      ]);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Animate particles toward center
  useEffect(() => {
    const frame = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            progress: p.progress + 0.018,
            opacity: p.progress > 0.7 ? Math.max(0, 1 - (p.progress - 0.7) / 0.3) : 1,
          }))
          .filter(p => p.progress < 1.1)
      );
    }, 16);
    return () => clearInterval(frame);
  }, []);

  // Pulse animation for the center brain
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const cx = 200;
  const cy = 200;
  const orbitRadius = 150;

  return (
    <div ref={containerRef} className="relative w-full max-w-[420px] aspect-square mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Radial glow for center */}
          <radialGradient id="brain-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.72 0.12 250)" stopOpacity="0.3" />
            <stop offset="60%" stopColor="oklch(0.72 0.12 250)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="oklch(0.72 0.12 250)" stopOpacity="0" />
          </radialGradient>

          {/* Orbit ring gradient */}
          <radialGradient id="orbit-glow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="85%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cy} r={160} fill="url(#brain-glow)" />

        {/* Orbit rings */}
        <circle cx={cx} cy={cy} r={orbitRadius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx={cx} cy={cy} r={orbitRadius * 0.6} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="2 6" />

        {/* Connection lines from tools to center */}
        {TOOLS.map((tool, i) => {
          const rad = (tool.angle * Math.PI) / 180;
          const tx = cx + Math.cos(rad) * orbitRadius;
          const ty = cy + Math.sin(rad) * orbitRadius;
          return (
            <line
              key={`line-${i}`}
              x1={tx} y1={ty} x2={cx} y2={cy}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.5"
              strokeDasharray="3 6"
            />
          );
        })}

        {/* Animated particles flowing toward center */}
        {particles.map(p => {
          const tool = TOOLS[p.toolIndex];
          const rad = (tool.angle * Math.PI) / 180;
          const startX = cx + Math.cos(rad) * orbitRadius;
          const startY = cy + Math.sin(rad) * orbitRadius;
          const x = startX + (cx - startX) * p.progress;
          const y = startY + (cy - startY) * p.progress;
          return (
            <g key={p.id} opacity={p.opacity}>
              <circle cx={x} cy={y} r={2} fill={tool.color} />
              <circle cx={x} cy={y} r={4} fill={tool.color} opacity={0.2} />
              {p.progress < 0.5 && (
                <text
                  x={x + 6} y={y + 3}
                  fill="rgba(255,255,255,0.25)"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Tool nodes on orbit */}
        {TOOLS.map((tool, i) => {
          const rad = (tool.angle * Math.PI) / 180;
          const tx = cx + Math.cos(rad) * orbitRadius;
          const ty = cy + Math.sin(rad) * orbitRadius;
          return (
            <g key={`tool-${i}`}>
              {/* Glow behind node */}
              <circle cx={tx} cy={ty} r={18} fill={tool.color} opacity={0.08} />
              {/* Node background */}
              <circle cx={tx} cy={ty} r={14} fill="#111" stroke={tool.color} strokeWidth="1.5" opacity={0.9} />
              {/* Icon letter */}
              <text
                x={tx} y={ty + 4}
                textAnchor="middle"
                fill={tool.color}
                fontSize="10"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {tool.icon}
              </text>
              {/* Label */}
              <text
                x={tx} y={ty + 26}
                textAnchor="middle"
                fill="rgba(255,255,255,0.35)"
                fontSize="7"
                fontFamily="system-ui, sans-serif"
              >
                {tool.name}
              </text>
            </g>
          );
        })}

        {/* Center brain node */}
        <circle
          cx={cx} cy={cy} r={32}
          fill="#0a0a0a"
          stroke="oklch(0.72 0.12 250)"
          strokeWidth="2"
          opacity={0.95}
        />
        <circle
          cx={cx} cy={cy} r={36}
          fill="none"
          stroke="oklch(0.72 0.12 250)"
          strokeWidth="0.5"
          opacity={0.2 + 0.15 * Math.sin((pulsePhase * Math.PI) / 180)}
        />
        <circle
          cx={cx} cy={cy} r={42}
          fill="none"
          stroke="oklch(0.72 0.12 250)"
          strokeWidth="0.3"
          opacity={0.1 + 0.1 * Math.sin(((pulsePhase + 90) * Math.PI) / 180)}
        />

        {/* Brain icon (simplified neural network) */}
        <g transform={`translate(${cx - 12}, ${cy - 12})`} opacity={0.9}>
          {/* Neural nodes */}
          <circle cx="12" cy="4" r="2" fill="oklch(0.72 0.12 250)" />
          <circle cx="4" cy="12" r="2" fill="oklch(0.72 0.12 250)" />
          <circle cx="20" cy="12" r="2" fill="oklch(0.72 0.12 250)" />
          <circle cx="8" cy="20" r="2" fill="oklch(0.72 0.12 250)" />
          <circle cx="16" cy="20" r="2" fill="oklch(0.72 0.12 250)" />
          <circle cx="12" cy="12" r="2.5" fill="oklch(0.72 0.12 250)" />
          {/* Connections */}
          <line x1="12" y1="4" x2="4" y2="12" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="12" y1="4" x2="20" y2="12" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="12" y1="4" x2="12" y2="12" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="4" y1="12" x2="12" y2="12" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="20" y1="12" x2="12" y2="12" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="4" y1="12" x2="8" y2="20" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="20" y1="12" x2="16" y2="20" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="12" y1="12" x2="8" y2="20" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
          <line x1="12" y1="12" x2="16" y2="20" stroke="oklch(0.72 0.12 250)" strokeWidth="0.5" opacity={0.5} />
        </g>

        {/* Center label */}
        <text
          x={cx} y={cy + 52}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="9"
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.08em"
        >
          CONTEXT ENGINE
        </text>
      </svg>
    </div>
  );
}
