"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const SIZE_DEFAULT = 160;

export function DonutChart({
  segments,
  size = SIZE_DEFAULT
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-6 text-center text-sm text-gray-500">
        No data for this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={size / 2 - 22}
              outerRadius={size / 2}
              paddingAngle={segments.length > 1 ? 2 : 0}
              stroke="none"
              animationDuration={400}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {segments.map((s, index) => (
                <Cell
                  key={s.label}
                  fill={s.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                  style={{ cursor: "pointer", transition: "opacity 150ms ease" }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const numericValue = Number(value) || 0;
                const percent = total ? Math.round((numericValue / total) * 100) : 0;
                return [`${numericValue} (${percent}%)`, name];
              }}
              contentStyle={{
                backgroundColor: "#0a1f14",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 12,
                color: "#fff"
              }}
              labelStyle={{ color: "#93a4be" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Total</div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        {segments.map((s, index) => (
          <div
            key={s.label}
            className="flex cursor-default items-center justify-between gap-3 rounded-lg px-1.5 py-0.5 text-sm transition-colors"
            style={{ backgroundColor: activeIndex === index ? "rgba(255,255,255,0.06)" : "transparent" }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
            <div className="whitespace-nowrap text-gray-500">
              {s.value} <span className="text-gray-600">({total ? Math.round((s.value / total) * 100) : 0}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
