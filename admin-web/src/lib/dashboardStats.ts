import type { createClient } from "@/lib/supabase/server";
import {
  PURPOSE_OPTIONS,
  dayParamOf,
  startOfDayManila,
  startOfMonthManila,
  type DailyBreakdownRow,
  type MonthRange
} from "@/lib/reportStats";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const TABLE = "visitor_registrations";

export type DashboardStats = {
  activeVisitors: number;
  pendingVisitors: number;
  expiredQrPasses: number;
  daily: { visitorsToday: number; completedToday: number };
  monthly: { visitorsThisMonth: number; completedThisMonth: number };
};

export type DashboardData = {
  stats: DashboardStats;
  monthPurposeCounts: Record<string, number>;
  dailyBreakdown: DailyBreakdownRow[];
  lastCheckInTime: string | null;
};

async function countRows(
  build: (
    query: ReturnType<SupabaseServerClient["from"]>
  ) => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  supabase: SupabaseServerClient
): Promise<number> {
  const { count, error } = await build(supabase.from(TABLE));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Every count below is a single indexed COUNT query (head: true — no row
// data transferred), run in parallel via Promise.all, replacing what used
// to be one full-table fetch of every visitor_registrations row followed by
// counting/filtering in JS. daily/monthly figures are always relative to
// the real current day/month (`now`), independent of `monthRange` below —
// that matches the original behavior, where the KPI cards never moved when
// the Purpose-Based Counts panel's month selector changed.
export async function fetchDashboardData(
  supabase: SupabaseServerClient,
  monthRange: MonthRange
): Promise<{ data: DashboardData | null; error: string | null }> {
  try {
    const now = new Date();
    const todayStartIso = startOfDayManila(now).toISOString();
    const monthStartIso = startOfMonthManila(now).toISOString();
    const nowIso = now.toISOString();

    const [
      activeVisitors,
      pendingVisitors,
      expiredQrPasses,
      visitorsToday,
      completedToday,
      visitorsThisMonth,
      completedThisMonth,
      purposeCountEntries,
      dailyBreakdownResult,
      lastCheckInResult
    ] = await Promise.all([
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).eq("registration_status", "Active"),
        supabase
      ),
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).eq("registration_status", "Pending"),
        supabase
      ),
      countRows(
        (q) =>
          q
            .select("*", { count: "exact", head: true })
            .lt("expiration_time", nowIso)
            .neq("qr_status", "Used/Invalid"),
        supabase
      ),
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).gte("created_at", todayStartIso),
        supabase
      ),
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).gte("time_out", todayStartIso),
        supabase
      ),
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).gte("created_at", monthStartIso),
        supabase
      ),
      countRows(
        (q) => q.select("*", { count: "exact", head: true }).gte("time_out", monthStartIso),
        supabase
      ),
      Promise.all(
        PURPOSE_OPTIONS.map(async (purpose) => {
          const count = await countRows(
            (q) =>
              q
                .select("*", { count: "exact", head: true })
                .eq("purpose_of_visit", purpose)
                .gte("created_at", monthRange.start.toISOString())
                .lt("created_at", monthRange.end.toISOString()),
            supabase
          );
          return [purpose, count] as const;
        })
      ),
      supabase.rpc("get_daily_breakdown", {
        p_month_start: monthRange.start.toISOString(),
        p_month_end: monthRange.end.toISOString()
      }),
      supabase
        .from(TABLE)
        .select("time_in")
        .not("time_in", "is", null)
        .order("time_in", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (dailyBreakdownResult.error) throw new Error(dailyBreakdownResult.error.message);
    if (lastCheckInResult.error) throw new Error(lastCheckInResult.error.message);

    const dailyBreakdown: DailyBreakdownRow[] = (
      (dailyBreakdownResult.data ?? []) as { day: string; visitors_count: number; completed_count: number }[]
    ).map((row) => ({
      date: dayParamOf(new Date(row.day)),
      visitorsCount: row.visitors_count,
      completedCount: row.completed_count
    }));

    return {
      data: {
        stats: {
          activeVisitors,
          pendingVisitors,
          expiredQrPasses,
          daily: { visitorsToday, completedToday },
          monthly: { visitorsThisMonth, completedThisMonth }
        },
        monthPurposeCounts: Object.fromEntries(purposeCountEntries),
        dailyBreakdown,
        lastCheckInTime: (lastCheckInResult.data as { time_in: string } | null)?.time_in ?? null
      },
      error: null
    };
  } catch (exception) {
    return {
      data: null,
      error: exception instanceof Error ? exception.message : "Unable to load dashboard data."
    };
  }
}
