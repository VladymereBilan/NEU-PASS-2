import Link from "next/link";
import { DailyBreakdownTable } from "@/components/DailyBreakdownTable";
import { fetchDashboardData } from "@/lib/dashboardStats";
import { resolveMonthRange } from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

const DAILY_BREAKDOWN_PAGE_SIZE = 10;

const CARD = "rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm";
const EYEBROW = "text-xs font-semibold uppercase tracking-[0.2em] text-gray-500";
const PILL =
  "rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400";

function CountChip({
  label,
  value,
  highlight,
  spread
}: {
  label: string;
  value: number;
  highlight: boolean;
  /** Label on the left and number on the right (building row) instead of number then label. */
  spread?: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-2xl border px-5 py-4 ${
        spread ? "justify-between" : "gap-3"
      } ${
        highlight ? "border-emerald-500/30 bg-emerald-500/15" : "border-emerald-500/10 bg-white/5"
      }`}
    >
      {spread ? (
        <>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
          <span className="text-3xl font-bold text-white">{value}</span>
        </>
      ) : (
        <>
          <span className="text-3xl font-bold text-white">{value}</span>
          <span className="text-sm leading-tight text-gray-400">{label}</span>
        </>
      )}
    </div>
  );
}

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

  const { monthPurposeCounts, monthBuildingCounts, dailyBreakdown } = data;

  const purposeEntries = Object.entries(monthPurposeCounts);
  const buildingEntries = Object.entries(monthBuildingCounts);
  const topPurpose = Math.max(0, ...purposeEntries.map(([, value]) => value));
  const topBuilding = Math.max(0, ...buildingEntries.map(([, value]) => value));

  const totalPages = Math.max(1, Math.ceil(dailyBreakdown.length / DAILY_BREAKDOWN_PAGE_SIZE));
  const requestedPage = Number(searchParams.page) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pagedBreakdown = dailyBreakdown.slice(
    (page - 1) * DAILY_BREAKDOWN_PAGE_SIZE,
    page * DAILY_BREAKDOWN_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={EYEBROW}>Visit Summary</div>
            <h2 className="mt-1 text-lg font-bold text-white">Why visitors are coming</h2>
            <p className="mt-2 text-sm text-gray-400">Number of visits for each purpose in {monthRange.label}.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/reports?month=${monthRange.prevParam}`}
              className={`${PILL} hover:bg-emerald-500/20`}
            >
              ← Prev
            </Link>
            <span className={PILL}>{monthRange.label}</span>
            {monthRange.nextParam ? (
              <Link
                href={`/reports?month=${monthRange.nextParam}`}
                className={`${PILL} hover:bg-emerald-500/20`}
              >
                Next →
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {purposeEntries.map(([label, value]) => (
            <CountChip key={label} label={label} value={value} highlight={topPurpose > 0 && value === topPurpose} />
          ))}
        </div>

        <div className="my-6 border-t border-emerald-500/10" />

        <div className="grid items-center gap-4 lg:grid-cols-[auto_1fr]">
          <div className="lg:w-56">
            <h3 className="text-base font-bold text-white">Where they are going</h3>
            <p className="mt-0.5 text-sm text-gray-500">Visits by campus building</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {buildingEntries.map(([label, value]) => (
              <CountChip
                key={label}
                label={label}
                value={value}
                spread
                highlight={topBuilding > 0 && value === topBuilding}
              />
            ))}
          </div>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-emerald-500/10 pb-4">
          <div>
            <div className={EYEBROW}>{monthRange.label}</div>
            <h2 className="mt-1 text-lg font-bold text-white">Visits by day</h2>
          </div>
          <p className="text-xs text-gray-500">
            Visitors are new registrations · Completed visitors have checked out
          </p>
        </div>

        <div className="mt-5">
          <DailyBreakdownTable rows={pagedBreakdown} allRows={dailyBreakdown} />
        </div>

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
      </section>
    </div>
  );
}
