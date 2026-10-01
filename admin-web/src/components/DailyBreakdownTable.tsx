import { dayParamOf, type DailyBreakdownRow } from "@/lib/reportStats";

// row.date is already a Manila-local "YYYY-MM-DD" string (see dayParamOf in
// reportStats.ts) — parsed and re-formatted as UTC-fixed so the displayed
// weekday never shifts based on the viewer's own browser timezone.
function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const monthName = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${monthName} ${day} · ${weekday}`;
}

export function DailyBreakdownTable({
  rows,
  allRows
}: {
  /** The current page's rows to render. */
  rows: DailyBreakdownRow[];
  /** Every row for the selected month, used only to detect an empty month. */
  allRows: DailyBreakdownRow[];
}) {
  if (allRows.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-6 text-center text-sm text-gray-500">
        No visitor activity recorded for this month.
      </div>
    );
  }

  const today = dayParamOf(new Date());

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-500/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-emerald-500/10 text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Visitors</th>
              <th className="px-4 py-3 font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 text-white">
            {rows.map((row) => {
              const isToday = row.date === today;
              return (
                <tr key={row.date} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span>{formatDisplayDate(row.date)}</span>
                      {isToday ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                          Today
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.visitorsCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.completedCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
