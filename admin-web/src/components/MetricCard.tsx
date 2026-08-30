export function MetricCard({
  label,
  value,
  accent = "from-[#0b6e3c] to-[#0e7f49]"
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#d8e3dc] bg-white p-5 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-3xl font-bold text-[#111827]">{value}</div>
      <div className="mt-2 text-sm text-[#4b5563]">{label}</div>
    </div>
  );
}
