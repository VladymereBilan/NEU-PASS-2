import Link from "next/link";
import { MetricCard, PURPOSE_ACCENTS } from "@/components/MetricCard";
import { Panel } from "@/components/Panel";
import { DailyBreakdownTable } from "@/components/DailyBreakdownTable";
import { fetchDashboardData } from "@/lib/dashboardStats";
import { resolveMonthRange } from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

const DAILY_BREAKDOWN_PAGE_SIZE = 10;

export default async function ReportsPage({
  searchParams: searchParamsPromise
}: {
  searchParams: Promise<{ month?: string; page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();
  const monthRange = resolveMonthRange(searchParams.month);
  const { data, error } = await fetchDashboardData(supabase, monthRange);

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6">
        <div className="py-10 text-center text-red-400">Unable to load report data.</div>
      </div>
    );
  }

  const { monthPurposeCounts, dailyBreakdown } = data;

  const totalPages = Math.max(1, Math.ceil(dailyBreakdown.length / DAILY_BREAKDOWN_PAGE_SIZE));
  const requestedPage = Number(searchParams.page) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pagedBreakdown = dailyBreakdown.slice(
    (page - 1) * DAILY_BREAKDOWN_PAGE_SIZE,
    page * DAILY_BREAKDOWN_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
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
        <DailyBreakdownTable rows={pagedBreakdown} allRows={dailyBreakdown} />
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
    </div>
  );
}
