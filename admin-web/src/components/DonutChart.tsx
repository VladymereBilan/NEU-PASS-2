const SIZE_DEFAULT = 160;
const STROKE_WIDTH = 22;

export function DonutChart({
  segments,
  size = SIZE_DEFAULT
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-6 text-center text-sm text-gray-500">
        No data for this period.
      </div>
    );
  }

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const offset = -cumulative * circumference;
              cumulative += fraction;
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Total</div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
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
