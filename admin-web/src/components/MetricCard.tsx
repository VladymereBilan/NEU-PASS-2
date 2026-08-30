export function MetricCard({
  label,
  value,
  accent = "from-emerald-400 to-green-600"
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-200/20 bg-[rgba(11,35,28,0.88)] p-5 shadow-[0_10px_28px_rgba(11,110,60,0.10)]">
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-emerald-50/75">{label}</div>
    </div>
  );
}
