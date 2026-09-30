// Aggregate visitor stats (dashboard/reports) are computed SQL-side now —
// see dashboardStats.ts — rather than fetching every visitor_registrations
// row and reducing in JS, which got slower as the table grew and every page
// load transferred the entire table. This module keeps the pieces that
// logic still needs: the month-range URL-param resolver, the purpose list,
// and the Manila-timezone day/month boundary helpers.

export const PURPOSE_OPTIONS = [
  "Inquiries",
  "Enrollment",
  "Tuition Fee Payment",
  "Other Payments",
  "Others"
] as const;

// Philippines has no DST, so a fixed UTC+8 offset is safe — kept consistent
// with the approve_visitor RPC's own "Asia/Manila" expiration-time logic.
export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function startOfDayManila(reference: Date): Date {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      MANILA_OFFSET_MS
  );
}

export function startOfMonthManila(reference: Date): Date {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - MANILA_OFFSET_MS);
}

// "YYYY-MM" in Manila-local terms, e.g. for building prev/next month links.
function monthParamOf(reference: Date): string {
  const shifted = new Date(reference.getTime() + MANILA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// "YYYY-MM-DD" in Manila-local terms.
export function dayParamOf(reference: Date): string {
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

export type MonthRange = ReturnType<typeof resolveMonthRange>;

export type DailyBreakdownRow = {
  date: string;
  visitorsCount: number;
  completedCount: number;
};
