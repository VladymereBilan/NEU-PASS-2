export function MetricCard({
  label,
  value,
  accent = "from-cyan-400 to-blue-500"
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.95)] p-5 shadow-glow">
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </div>
  );
}
