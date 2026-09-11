"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toOrIlikePattern } from "@/lib/likeEscape";

type AuditLogRow = {
  id: string;
  action: string;
  actor_label: string;
  created_at: string;
};

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      .select("id, action, actor_label, created_at", { count: "exact" });

    const trimmed = debouncedSearch.trim();
    if (trimmed) {
      const pattern = toOrIlikePattern(trimmed);
      query = query.or(`action.ilike.${pattern},actor_label.ilike.${pattern}`);
    }

    query
      .order("created_at", { ascending: false })
      .range(from, to)
      .then(({ data, count, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError("Unable to load audit logs.");
        } else {
          setLogs((data ?? []) as AuditLogRow[]);
          setTotalCount(count ?? 0);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Audit Logs</h2>
          <p className="text-sm text-gray-400">
            Admin actions and visitor workflow events, captured automatically.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search logs"
          className="w-full max-w-xs rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading audit logs...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-400">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No matching audit log entries.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-2xl border border-emerald-500/15 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium text-white">{log.action}</div>
                <div className="text-sm text-gray-400">Actor: {log.actor_label}</div>
              </div>
              <div className="text-sm text-gray-300">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && !error && logs.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-emerald-500/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-400">
            Showing {page * PAGE_SIZE + 1}-{Math.min(totalCount, page * PAGE_SIZE + logs.length)} of{" "}
            {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
              className="rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
              disabled={page + 1 >= totalPages}
              className="rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
