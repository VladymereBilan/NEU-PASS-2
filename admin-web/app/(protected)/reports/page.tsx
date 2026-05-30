import { MetricCard } from "@/components/MetricCard";
import { getReportStats } from "@/lib/sample-data";

export default function ReportsPage() {
  const stats = getReportStats();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily Visitors" value={stats.daily.visitorsToday} />
        <MetricCard label="Monthly Visitors" value={stats.monthly.visitorsThisMonth} />
        <MetricCard label="Completed Today" value={stats.daily.completedToday} />
        <MetricCard label="Expired QR Count" value={stats.expiredQrPasses} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Daily Logs">
          <div className="space-y-3 text-slate-300">
            <Row label="Visitors today" value={stats.daily.visitorsToday} />
            <Row label="Completed today" value={stats.daily.completedToday} />
            <Row label="Active today" value={stats.daily.activeToday} />
          </div>
        </Panel>
        <Panel title="Monthly Logs">
          <div className="space-y-3 text-slate-300">
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
              accent={index % 2 === 0 ? "from-cyan-400 to-blue-500" : "from-violet-400 to-fuchsia-500"}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Expired QR Count">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
          {stats.expiredQrPasses} expired QR pass{stats.expiredQrPasses === 1 ? "" : "es"} recorded in the prototype dataset.
        </div>
      </Panel>
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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
