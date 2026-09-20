import { MetricCard, PURPOSE_CHART_COLORS } from "@/components/MetricCard";
import { MiniStat, Panel } from "@/components/Panel";
import { MonthlyArchiveButton } from "@/components/MonthlyArchiveButton";
import { BarChart } from "@/components/BarChart";
import { DonutChart } from "@/components/DonutChart";
import {
  computeDailyBreakdown,
  computePurposeCounts,
  computeReportStats,
  fetchAllRows,
  resolveMonthRange,
  type VisitorRow
} from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

function formatRelativeTime(iso: string, now: Date) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { rows: fetchedRows, error } = await fetchAllRows<VisitorRow>((from, to) =>
    supabase
      .from("visitor_registrations")
      .select(
        "id, full_name, purpose_of_visit, registration_status, checkout_status, qr_status, time_in, time_out, expiration_time, created_at"
      )
      .range(from, to)
  );

  if (error) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6">
        <div className="py-10 text-center text-red-400">Unable to load dashboard data.</div>
      </div>
    );
  }

  const rows = fetchedRows;
  const stats = computeReportStats(rows);

  const monthRange = resolveMonthRange();
  const monthRows = rows.filter((row) => {
    const created = new Date(row.created_at).getTime();
    return created >= monthRange.start.getTime() && created < monthRange.end.getTime();
  });
  const monthPurposeCounts = computePurposeCounts(monthRows);
  // computeDailyBreakdown buckets visitorsCount by created_at and
  // completedCount by time_out independently, so its input must include a
  // row if EITHER falls in this month — otherwise a row registered last
  // month but checked out this month is invisible to the "Completed" bucket,
  // silently undercounting it versus stats.monthly.completedThisMonth
  // (computed from the unfiltered `rows`). monthRows above stays scoped to
  // created_at only, since Purpose-Based Counts should reflect this month's
  // registrations, not checkouts of visits registered elsewhere.
  const dailyBreakdownRows = rows.filter((row) => {
    const created = new Date(row.created_at).getTime();
    if (created >= monthRange.start.getTime() && created < monthRange.end.getTime()) return true;
    if (!row.time_out) return false;
    const completed = new Date(row.time_out).getTime();
    return completed >= monthRange.start.getTime() && completed < monthRange.end.getTime();
  });
  const dailyBreakdown = computeDailyBreakdown(dailyBreakdownRows, monthRange.start, monthRange.end);

  const now = new Date();
  const lastCheckIn = rows.reduce<VisitorRow | null>((latest, row) => {
    if (!row.time_in) return latest;
    if (!latest || new Date(row.time_in).getTime() > new Date(latest.time_in as string).getTime()) {
      return row;
    }
    return latest;
  }, null);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Visitors" value={stats.totalVisitors} accent="from-emerald-400 to-emerald-600" />
        <MetricCard label="Active Visitors" value={stats.activeVisitors} accent="from-sky-400 to-sky-600" />
        <MetricCard label="Pending Visitors" value={stats.pendingVisitors} accent="from-amber-400 to-amber-600" />
        <MetricCard label="Expired QR Passes" value={stats.expiredQrPasses} accent="from-amber-400 to-amber-600" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel
          title="Purpose-Based Counts"
          eyebrow="Breakdown"
          action={
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              {monthRange.label}
            </span>
          }
        >
          <DonutChart
            size={200}
            segments={Object.entries(monthPurposeCounts).map(([label, value], index) => ({
              label,
              value,
              color: PURPOSE_CHART_COLORS[index % PURPOSE_CHART_COLORS.length]
            }))}
          />
        </Panel>

        <Panel title="Daily and Monthly Logs" eyebrow="Activity">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Daily
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniStat label="Visitors Today" value={stats.daily.visitorsToday} />
                <MiniStat label="Completed Today" value={stats.daily.completedToday} />
                <MiniStat label="Active Today" value={stats.daily.activeToday} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Monthly
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniStat label="Visitors This Month" value={stats.monthly.visitorsThisMonth} />
                <MiniStat label="Completed This Month" value={stats.monthly.completedThisMonth} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={`${monthRange.label} Trend`} eyebrow="Activity">
        <BarChart
          data={dailyBreakdown.map((d) => ({
            label: String(Number(d.date.slice(-2))),
            values: [d.visitorsCount, d.completedCount]
          }))}
          seriesLabels={["Visitors", "Completed"]}
          seriesColors={["#22c55e", "#f59e0b"]}
          height={200}
        />
      </Panel>

      <Panel title="Monthly Archive" eyebrow="Data retention">
        <MonthlyArchiveButton />
      </Panel>

      <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/15 bg-[#0a1f14]/60 px-5 py-4 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {lastCheckIn ? (
            <span>
              Last visitor check-in:{" "}
              <span className="font-semibold text-white">
                {formatRelativeTime(lastCheckIn.time_in as string, now)}
              </span>
            </span>
          ) : (
            <span>No visitor check-ins recorded yet.</span>
          )}
        </div>
        <div className="text-xs text-gray-500">Version 2.0.0</div>
      </div>
    </div>
  );
}
