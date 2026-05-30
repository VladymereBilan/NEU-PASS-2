import { auditLogs } from "@/lib/sample-data";

export default function AuditLogsPage() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-6 shadow-glow">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Prototype Audit Logs</h2>
          <p className="text-sm text-slate-400">
            Demo logs for admin actions and visitor workflow events.
          </p>
        </div>
        <input
          placeholder="Search logs"
          className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div
            key={`${log.action}-${log.time}`}
            className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="text-white">{log.action}</div>
              <div className="text-sm text-slate-400">Actor: {log.actor}</div>
            </div>
            <div className="text-sm text-slate-300">{log.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
