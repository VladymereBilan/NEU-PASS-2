export const PURPOSE_ACCENTS = [
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600"
];

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
