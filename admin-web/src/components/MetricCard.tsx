export const PURPOSE_ACCENTS = [
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600"
];

// Index-aligned with PURPOSE_OPTIONS — mirrors tailwind.config.ts's
// good/accent/warn/accent2/muted tokens, which nothing else in the app uses.
export const PURPOSE_CHART_COLORS = ["#22c55e", "#67e8f9", "#f59e0b", "#8b5cf6", "#93a4be"];

export function MetricCard({
  label,
  value,
  accent = "from-emerald-400 to-emerald-600"
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-5 backdrop-blur-sm">
      <div className={`mb-4 h-1 w-12 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-2 text-sm text-gray-400">{label}</div>
    </div>
  );
}
