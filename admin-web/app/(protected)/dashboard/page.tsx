import { MetricCard } from "@/components/MetricCard";
import { getReportStats } from "@/lib/sample-data";

export default function DashboardPage() {
  const stats = getReportStats();

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
                accent={index % 2 === 0 ? "from-cyan-400 to-blue-500" : "from-violet-400 to-fuchsia-500"}
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
    <section className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-6 shadow-glow">
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
