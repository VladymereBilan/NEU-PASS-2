"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const CHART_HEIGHT_DEFAULT = 220;

export function BarChart({
  data,
  seriesLabels,
  seriesColors,
  height = CHART_HEIGHT_DEFAULT
}: {
  data: { label: string; values: number[] }[];
  seriesLabels: string[];
  seriesColors: string[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-6 text-center text-sm text-gray-500">
        No data for this period.
      </div>
    );
  }

  const chartData = data.map((d) => {
    const row: Record<string, string | number> = { label: d.label };
    seriesLabels.forEach((seriesLabel, i) => {
      row[seriesLabel] = d.values[i] ?? 0;
    });
    return row;
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#93a4be", fontSize: 11 }}
            axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#93a4be", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            contentStyle={{
              backgroundColor: "#0a1f14",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 12,
              color: "#fff"
            }}
            labelStyle={{ color: "#93a4be" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#93a4be", paddingTop: 8 }} iconType="circle" />
          {seriesLabels.map((seriesLabel, i) => (
            <Bar
              key={seriesLabel}
              dataKey={seriesLabel}
              fill={seriesColors[i % seriesColors.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              animationDuration={400}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
