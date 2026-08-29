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

const PURPOSE_OPTIONS = [
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

export function computeReportStats(visitors: VisitorRow[]) {
  const now = new Date();
  const today = startOfDayManila(now);
  const monthStart = startOfMonthManila(now);

  const purposeCounts = Object.fromEntries(
    PURPOSE_OPTIONS.map((purpose) => [purpose, 0])
  ) as Record<(typeof PURPOSE_OPTIONS)[number], number>;

  visitors.forEach((visitor) => {
    const purpose = visitor.purpose_of_visit as (typeof PURPOSE_OPTIONS)[number];
    if (purpose in purposeCounts) {
      purposeCounts[purpose] += 1;
    }
  });

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
