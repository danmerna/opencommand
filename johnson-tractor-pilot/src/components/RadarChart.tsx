"use client";

import { useMemo } from "react";

interface DataLayer {
  label: string;
  key: string;
  color: string;
  value: number; // 0-100
}

interface RadarChartProps {
  layers: DataLayer[];
}

export default function RadarChart({ layers }: RadarChartProps) {
  const size = 280;
  const center = size / 2;
  const radius = 110;
  const levels = 4;

  const angleStep = (2 * Math.PI) / layers.length;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let level = 1; level <= levels; level++) {
      const points = layers.map((_, i) => {
        const p = getPoint(i, (level / levels) * 100);
        return `${p.x},${p.y}`;
      });
      lines.push(points.join(" "));
    }
    return lines;
  }, [layers.length]);

  const dataPath = layers
    .map((layer, i) => {
      const p = getPoint(i, layer.value);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {gridLines.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#1E2A35"
            strokeWidth="1"
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {layers.map((_, i) => {
          const p = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#1E2A35"
              strokeWidth="1"
              opacity={0.4}
            />
          );
        })}

        {/* Data polygon fill */}
        <polygon
          points={dataPath}
          fill="#00D4AA"
          fillOpacity={0.1}
          stroke="#00D4AA"
          strokeWidth="2"
          strokeOpacity={0.6}
        />

        {/* Data points with layer colors */}
        {layers.map((layer, i) => {
          const p = getPoint(i, layer.value);
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={layer.color}
                stroke="#0A0F14"
                strokeWidth="2"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill={layer.color}
                fillOpacity={0.2}
              />
            </g>
          );
        })}

        {/* Labels */}
        {layers.map((layer, i) => {
          const p = getPoint(i, 125);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-mono"
              fill={layer.color}
            >
              {layer.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {layers.map((layer) => (
          <div key={layer.key} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: layer.color }}
            />
            <span className="text-[11px] text-text-muted font-mono">
              {layer.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
