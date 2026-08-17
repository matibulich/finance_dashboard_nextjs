"use client";

import { useState } from "react";
import { PnLHistoryEntry } from "@/app/(backend)/types/portfolio";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

export function PnLChart({ pnlHistory }: { pnlHistory: PnLHistoryEntry[] }) {
  if (pnlHistory.length === 0) return null;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedHistory = [...pnlHistory].sort((a, b) => new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime());

  let cumulative = 0;
  const points = sortedHistory.map((h) => {
    cumulative += h.pnlARS;
    return {
      date: h.soldAt,
      symbol: h.symbol,
      pnlARS: h.pnlARS,
      cumulativePnL: cumulative,
    };
  });

  const minCumulative = Math.min(0, ...points.map(p => p.cumulativePnL));
  const maxCumulative = Math.max(0, ...points.map(p => p.cumulativePnL));
  const range = maxCumulative - minCumulative || 1;

  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const xScale = (i: number) => padding + (i / (points.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => padding + chartHeight - ((value - minCumulative) / range) * chartHeight;

  const zeroY = padding + chartHeight - ((0 - minCumulative) / range) * chartHeight;

  const pathData = points.map((p, i) => `${xScale(i)},${yScale(p.cumulativePnL)}`).join(" ");
  const areaPathData = [
    `${padding},${zeroY}`,
    ...points.map((p, i) => `${xScale(i)},${yScale(p.cumulativePnL)}`),
    `${padding + chartWidth},${zeroY}`,
  ].join(" ");

  const lastPoint = points[points.length - 1];
  const lastValue = lastPoint.cumulativePnL;
  const lastColor = lastValue >= 0 ? "#10b981" : "#ef4444";

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const index = Math.round(((mouseX - padding) / chartWidth) * (points.length - 1));
    const clampedIndex = Math.max(0, Math.min(points.length - 1, index));
    setHoveredIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-slate-100">P&L acumulado de operaciones cerradas</h3>
      <div className="relative" style={{ width: "100%", maxWidth: width }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1={padding}
            y1={zeroY}
            x2={padding + chartWidth}
            y2={zeroY}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          <path
            d={areaPathData}
            fill="url(#areaGradient)"
          />

          <path
            d={`M${pathData}`}
            fill="none"
            stroke={lastColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(p.cumulativePnL)}
              r={hoveredIndex === i ? 6 : 4}
              fill={p.cumulativePnL >= 0 ? "#10b981" : "#ef4444"}
              stroke="white"
              strokeWidth={2}
            />
          ))}

        </svg>

        {hoveredIndex !== null && (
          <div
            className="absolute z-10 px-3 py-2 bg-slate-900 text-white text-xs rounded shadow-lg dark:bg-slate-700"
            style={{
              left: xScale(hoveredIndex) + 10,
              top: yScale(points[hoveredIndex].cumulativePnL) - 60,
              transform: "translateX(-50%)",
            }}
          >
            <div>Fecha: {formatDate(points[hoveredIndex].date)}</div>
            <div>Símbolo: {points[hoveredIndex].symbol}</div>
            <div>P&L operación: {formatARS(points[hoveredIndex].pnlARS)}</div>
            <div className="font-medium">P&L acumulado: {formatARS(points[hoveredIndex].cumulativePnL)}</div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{formatDate(points[0].date)}</span>
          <span>{formatDate(points[points.length - 1].date)}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {points.slice(-5).map((p, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                p.cumulativePnL >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {formatARS(p.cumulativePnL)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}