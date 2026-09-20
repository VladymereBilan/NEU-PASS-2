import Link from "next/link";
import { MetricCard, PURPOSE_ACCENTS } from "@/components/MetricCard";
import { Panel, Row } from "@/components/Panel";
import { DataTable } from "@/components/DataTable";
import {
  computeDailyBreakdown,
  computePurposeCounts,
  computeReportStats,
  fetchAllRows,
  resolveMonthRange,
  type VisitorRow
} from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

const DAILY_BREAKDOWN_PAGE_SIZE = 10;

export default async function ReportsPage({
  searchParams
}: {
  searchParams: { month?: string; page?: string };
}) {
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
        <div className="py-10 text-center text-red-400">Unable to load report data.</div>
      </div>
    );
  }

  const rows = fetchedRows;
  const stats = computeReportStats(rows);

  const monthRange = resolveMonthRange(searchParams.month);
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

  const totalPages = Math.max(1, Math.ceil(dailyBreakdown.length / DAILY_BREAKDOWN_PAGE_SIZE));
  const requestedPage = Number(searchParams.page) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pagedBreakdown = dailyBreakdown.slice(
    (page - 1) * DAILY_BREAKDOWN_PAGE_SIZE,
    page * DAILY_BREAKDOWN_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily Visitors" value={stats.daily.visitorsToday} accent="from-emerald-400 to-emerald-600" />
        <MetricCard label="Monthly Visitors" value={stats.monthly.visitorsThisMonth} accent="from-sky-400 to-sky-600" />
        <MetricCard label="Completed Today" value={stats.daily.completedToday} accent="from-emerald-400 to-emerald-600" />
        <MetricCard label="Expired QR Count" value={stats.expiredQrPasses} accent="from-amber-400 to-amber-600" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Daily Logs">
          <div className="space-y-3">
            <Row label="Visitors today" value={stats.daily.visitorsToday} />
            <Row label="Completed today" value={stats.daily.completedToday} />
            <Row label="Active today" value={stats.daily.activeToday} />
          </div>
        </Panel>
        <Panel title="Monthly Logs">
          <div className="space-y-3">
            <Row label="Visitors this month" value={stats.monthly.visitorsThisMonth} />
            <Row label="Completed this month" value={stats.monthly.completedThisMonth} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Purpose-Based Counts"
        eyebrow="By month"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/reports?month=${monthRange.prevParam}`}
              className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            >
              ← Prev
            </Link>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              {monthRange.label}
            </span>
            {monthRange.nextParam ? (
              <Link
                href={`/reports?month=${monthRange.nextParam}`}
                className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
              >
                Next →
              </Link>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(monthPurposeCounts).map(([label, value], index) => (
            <MetricCard
              key={label}
              label={label}
              value={value}
              accent={PURPOSE_ACCENTS[index % PURPOSE_ACCENTS.length]}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Daily Breakdown" eyebrow={monthRange.label}>
        <DataTable
          columns={["Date", "Visitors", "Completed"]}
          rows={pagedBreakdown.map((day) => [
            day.date,
            String(day.visitorsCount),
            String(day.completedCount)
          ])}
        />
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={`/reports?month=${monthRange.param}&page=${page - 1}`}
                className="rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/reports?month=${monthRange.param}&page=${page + 1}`}
                className="rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </Panel>

      <Panel title="Expired QR Count">
        <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-4 text-gray-300">
          {stats.expiredQrPasses} expired QR pass{stats.expiredQrPasses === 1 ? "" : "es"} recorded.
        </div>
      </Panel>
    </div>
  );
}
