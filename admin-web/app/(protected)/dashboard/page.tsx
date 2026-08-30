import { MetricCard } from "@/components/MetricCard";
import { computeReportStats, type VisitorRow } from "@/lib/reportStats";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visitor_registrations")
    .select(
      "id, full_name, purpose_of_visit, registration_status, checkout_status, qr_status, time_in, time_out, expiration_time, created_at"
    );

  const stats = computeReportStats((data ?? []) as VisitorRow[]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Visitors" value={stats.totalVisitors} />
        <MetricCard label="Active Visitors" value={stats.activeVisitors} />
        <MetricCard label="Completed Visitors" value={stats.completedVisitors} />
        <MetricCard label="Pending Visitors" value={stats.pendingVisitors} />
        <MetricCard label="Expired QR Passes" value={stats.expiredQrPasses} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel title="Purpose-Based Counts">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(stats.purposeCounts).map(([label, value], index) => (
              <MetricCard
                key={label}
                label={label}
                value={value}
                accent={index % 2 === 0 ? "from-emerald-400 to-green-600" : "from-amber-400 to-lime-500"}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Daily and Monthly Logs">
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniStat label="Visitors Today" value={stats.daily.visitorsToday} />
            <MiniStat label="Completed Today" value={stats.daily.completedToday} />
            <MiniStat label="Active Today" value={stats.daily.activeToday} />
            <MiniStat label="Visitors This Month" value={stats.monthly.visitorsThisMonth} />
            <MiniStat label="Completed This Month" value={stats.monthly.completedThisMonth} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-emerald-200/20 bg-[rgba(11,35,28,0.86)] p-6 shadow-[0_10px_28px_rgba(11,110,60,0.10)]">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}
