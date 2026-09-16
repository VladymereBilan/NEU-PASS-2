const CHART_HEIGHT_DEFAULT = 160;
const BAR_GROUP_WIDTH = 24;
const BAR_GAP = 3;
const LABEL_ROW_HEIGHT = 20;

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

  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const seriesCount = seriesLabels.length;
  const barWidth = (BAR_GROUP_WIDTH - BAR_GAP * (seriesCount - 1)) / seriesCount;
  const chartWidth = data.length * BAR_GROUP_WIDTH + (data.length - 1) * BAR_GAP;
  const svgHeight = height + LABEL_ROW_HEIGHT;
  const labelStride = data.length > 15 ? 5 : data.length > 8 ? 2 : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Bar chart"
          height={svgHeight}
          viewBox={`0 0 ${chartWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ width: "100%", minWidth: chartWidth }}
        >
          <line x1={0} y1={height} x2={chartWidth} y2={height} stroke="rgba(148,163,184,0.15)" />
          {data.map((d, i) => {
            const groupX = i * (BAR_GROUP_WIDTH + BAR_GAP);
            return (
              <g key={d.label}>
                {d.values.map((v, s) => {
                  const barHeight = (v / max) * (height - 4);
                  return (
                    <rect
                      key={s}
                      x={groupX + s * (barWidth + BAR_GAP)}
                      y={height - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={1.5}
                      fill={seriesColors[s % seriesColors.length]}
                    />
                  );
                })}
                {i % labelStride === 0 ? (
                  <text
                    x={groupX + BAR_GROUP_WIDTH / 2}
                    y={height + 14}
                    fontSize={9}
                    textAnchor="middle"
                    fill="#93a4be"
                  >
                    {d.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {seriesLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2 text-xs text-gray-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seriesColors[i % seriesColors.length] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
