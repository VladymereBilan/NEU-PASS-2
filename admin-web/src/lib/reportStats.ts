export type VisitorRow = {
  id: string;
  full_name: string;
  purpose_of_visit: string;
  registration_status: string;
  checkout_status: string;
  qr_status: string;
  time_in: string | null;
  time_out: string | null;
  expiration_time: string | null;
  created_at: string;
};

export const PURPOSE_OPTIONS = [
  "Inquiries",
  "Enrollment",
  "Tuition Fee Payment",
  "Other Payments",
  "Others"
] as const;

// Philippines has no DST, so a fixed UTC+8 offset is safe — kept consistent
// with the approve_visitor RPC's own "Asia/Manila" expiration-time logic.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function startOfDayManila(reference: Date) {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      MANILA_OFFSET_MS
  );
}

function startOfMonthManila(reference: Date) {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - MANILA_OFFSET_MS);
}

// "YYYY-MM" in Manila-local terms, e.g. for building prev/next month links.
function monthParamOf(reference: Date) {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// "YYYY-MM-DD" in Manila-local terms.
function dayParamOf(reference: Date) {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_PARAM_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

// Resolves a "?month=YYYY-MM" search param into a [start, end) range in
// Manila time, defaulting to (and clamping future months down to) the
// current month — there's never data beyond "now" to show anyway.
export function resolveMonthRange(monthParam?: string) {
  const now = new Date();
  const shiftedNow = new Date(now.getTime() + MANILA_OFFSET_MS);
  const currentYear = shiftedNow.getUTCFullYear();
  const currentMonth = shiftedNow.getUTCMonth();

  const match = monthParam?.match(MONTH_PARAM_PATTERN);
  let year = match ? Number(match[1]) : currentYear;
  let month = match ? Number(match[2]) - 1 : currentMonth;

  // Clamp a future month down to the current one — there's never data
  // beyond "now" to show anyway.
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    year = currentYear;
    month = currentMonth;
  }

  const start = new Date(Date.UTC(year, month, 1) - MANILA_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 1) - MANILA_OFFSET_MS);
  const isCurrentMonth = year === currentYear && month === currentMonth;

  return {
    start,
    end,
    label: `${MONTH_NAMES[month]} ${year}`,
    param: monthParamOf(start),
    isCurrentMonth,
    prevParam: monthParamOf(new Date(start.getTime() - 1)),
    nextParam: isCurrentMonth ? null : monthParamOf(end)
  };
}

export function computePurposeCounts(visitors: VisitorRow[]) {
  const purposeCounts = Object.fromEntries(
    PURPOSE_OPTIONS.map((purpose) => [purpose, 0])
  ) as Record<(typeof PURPOSE_OPTIONS)[number], number>;

  visitors.forEach((visitor) => {
    const purpose = visitor.purpose_of_visit as (typeof PURPOSE_OPTIONS)[number];
    if (purpose in purposeCounts) {
      purposeCounts[purpose] += 1;
    }
  });

  return purposeCounts;
}

export type DailyBreakdownRow = {
  date: string;
  visitorsCount: number;
  completedCount: number;
};

// One row per calendar day in [monthStart, monthEnd) — pass a range already
// scoped to a single month (see resolveMonthRange) and rows already filtered
// to that range for efficiency, though filtering again here would be
// harmless (each day-bucket check is independent of what's outside it).
export function computeDailyBreakdown(
  visitors: VisitorRow[],
  monthStart: Date,
  monthEnd: Date
): DailyBreakdownRow[] {
  const days: DailyBreakdownRow[] = [];

  for (
    let dayStart = monthStart;
    dayStart.getTime() < monthEnd.getTime();
    dayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const visitorsCount = visitors.filter((visitor) => {
      const created = new Date(visitor.created_at).getTime();
      return created >= dayStart.getTime() && created < dayEnd.getTime();
    }).length;

    const completedCount = visitors.filter((visitor) => {
      if (!visitor.time_out) return false;
      const completed = new Date(visitor.time_out).getTime();
      return completed >= dayStart.getTime() && completed < dayEnd.getTime();
    }).length;

    days.push({ date: dayParamOf(dayStart), visitorsCount, completedCount });
  }

  return days;
}

export function computeReportStats(visitors: VisitorRow[]) {
  const now = new Date();
  const today = startOfDayManila(now);
  const monthStart = startOfMonthManila(now);
  const purposeCounts = computePurposeCounts(visitors);

  return {
    totalVisitors: visitors.length,
    activeVisitors: visitors.filter((v) => v.registration_status === "Active").length,
    completedVisitors: visitors.filter((v) => v.checkout_status === "Completed").length,
    pendingVisitors: visitors.filter((v) => v.registration_status === "Pending").length,
    // A pass past its expiration time that was never used/checked out — not
    // simply "any used pass", which is what the old sample data conflated.
    expiredQrPasses: visitors.filter((v) => {
      if (!v.expiration_time) return false;
      return (
        new Date(v.expiration_time).getTime() < now.getTime() && v.qr_status !== "Used/Invalid"
      );
    }).length,
    purposeCounts,
    daily: {
      visitorsToday: visitors.filter((v) => new Date(v.created_at) >= today).length,
      completedToday: visitors.filter((v) => v.time_out && new Date(v.time_out) >= today).length,
      activeToday: visitors.filter(
        (v) => v.time_in && new Date(v.time_in) >= today && v.registration_status === "Active"
      ).length
    },
    monthly: {
      visitorsThisMonth: visitors.filter((v) => new Date(v.created_at) >= monthStart).length,
      completedThisMonth: visitors.filter((v) => v.time_out && new Date(v.time_out) >= monthStart)
        .length
    },
    generatedAt: now.toISOString()
  };
}
