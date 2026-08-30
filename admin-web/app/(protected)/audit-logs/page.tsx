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
    <div className="rounded-3xl border border-[#d8e3dc] bg-white p-6 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Audit Logs</h2>
          <p className="text-sm text-[#4b5563]">
            Admin actions and visitor workflow events, captured automatically.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search logs"
          className="w-full max-w-xs rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-3 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-[#4b5563]">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[#4b5563]">No matching audit log entries.</div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium text-[#111827]">{log.action}</div>
                <div className="text-sm text-[#4b5563]">Actor: {log.actor_label}</div>
              </div>
              <div className="text-sm text-[#374151]">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
