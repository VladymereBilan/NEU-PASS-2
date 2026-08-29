"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuditLogRow = {
  id: string;
  action: string;
  actor_label: string;
  created_at: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("audit_logs")
      .select("id, action, actor_label, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs((data ?? []) as AuditLogRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) || log.actor_label.toLowerCase().includes(query)
    );
  }, [logs, search]);

  return (
    <div className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-6 shadow-glow">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
          <p className="text-sm text-slate-400">
            Admin actions and visitor workflow events, captured automatically.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search logs"
          className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-slate-400">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-400">No matching audit log entries.</div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-white">{log.action}</div>
                <div className="text-sm text-slate-400">Actor: {log.actor_label}</div>
              </div>
              <div className="text-sm text-slate-300">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
