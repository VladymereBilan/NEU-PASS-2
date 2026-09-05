import { MetricCard, PURPOSE_ACCENTS } from "@/components/MetricCard";
import { Panel, Row } from "@/components/Panel";
import { computeReportStats, type VisitorRow } from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select(
      "id, full_name, purpose_of_visit, registration_status, checkout_status, qr_status, time_in, time_out, expiration_time, created_at"
    );

  if (error) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6">
        <div className="py-10 text-center text-red-400">Unable to load report data.</div>
      </div>
    );
  }

  const stats = computeReportStats((data ?? []) as VisitorRow[]);

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

      <Panel title="Purpose-Based Counts">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(stats.purposeCounts).map(([label, value], index) => (
            <MetricCard
              key={label}
              label={label}
              value={value}
              accent={PURPOSE_ACCENTS[index % PURPOSE_ACCENTS.length]}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Expired QR Count">
        <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-4 text-gray-300">
          {stats.expiredQrPasses} expired QR pass{stats.expiredQrPasses === 1 ? "" : "es"} recorded.
        </div>
      </Panel>
    </div>
  );
}
