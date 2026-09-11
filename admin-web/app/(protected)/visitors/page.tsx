"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csvExport";
import { toOrIlikePattern, toOrInPattern } from "@/lib/likeEscape";
import { PURPOSE_OPTIONS } from "@/lib/reportStats";

type VisitorRow = {
  id: string;
  full_name: string;
  purpose_of_visit: string;
  registration_status: string;
  time_in: string | null;
  time_out: string | null;
  qr_status: string;
  expiration_time: string | null;
};

const COLUMNS = [
  "Visitor Name",
  "Purpose",
  "Status",
  "Time In",
  "Time Out",
  "QR Status",
  "Expiration Time"
];

const PAGE_SIZE = 20;
// A query this filter can't further narrow down; used as the cap for a CSV
// export so one admin can't accidentally pull the entire table in a single
// unbounded request.
const EXPORT_ROW_CAP = 5000;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function toRow(visitor: VisitorRow): Array<string> {
  return [
    visitor.full_name,
    visitor.purpose_of_visit,
    visitor.registration_status,
    formatDate(visitor.time_in),
    formatDate(visitor.time_out),
    visitor.qr_status,
    formatDate(visitor.expiration_time)
  ];
}

// Builds the `.or()` search operand for the current search box value, or
// null when there's nothing to search for — shared between the paginated
// on-screen fetch and the "export everything that matches" fetch so the two
// can never drift out of sync with each other.
function searchOperand(search: string) {
  const trimmed = search.trim();
  if (!trimmed) return null;

  const clauses = [`full_name.ilike.${toOrIlikePattern(trimmed)}`];

  // purpose_of_visit is a Postgres enum column — ILIKE has no operator
  // defined for enum types, and PostgREST's `.or()` logic-tree grammar
  // doesn't support an inline `::text` cast to work around that (only
  // top-level filters do). Match it via `.in()` against whichever known
  // purpose values contain the search term instead.
  const matchingPurposes = PURPOSE_OPTIONS.filter((purpose) =>
    purpose.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (matchingPurposes.length > 0) {
    clauses.push(`purpose_of_visit.in.${toOrInPattern([...matchingPurposes])}`);
  }

  return clauses.join(",");
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("visitor_registrations")
      .select(
        "id, full_name, purpose_of_visit, registration_status, time_in, time_out, qr_status, expiration_time",
        { count: "exact" }
      );

    const operand = searchOperand(debouncedSearch);
    if (operand) query = query.or(operand);
    if (filter !== "All") query = query.eq("registration_status", filter);

    query
      .order("created_at", { ascending: false })
      .range(from, to)
      .then(({ data, count, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError("Unable to load visitors.");
        } else {
          setVisitors((data ?? []) as VisitorRow[]);
          setTotalCount(count ?? 0);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filter, page]);

  const rows = useMemo(() => visitors.map(toRow), [visitors]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError("");

      const supabase = createClient();
      let query = supabase
        .from("visitor_registrations")
        .select(
          "id, full_name, purpose_of_visit, registration_status, time_in, time_out, qr_status, expiration_time"
        );

      const operand = searchOperand(debouncedSearch);
      if (operand) query = query.or(operand);
      if (filter !== "All") query = query.eq("registration_status", filter);

      const { data, error: exportFetchError } = await query
        .order("created_at", { ascending: false })
        .limit(EXPORT_ROW_CAP);
      if (exportFetchError) {
        setExportError("Unable to export visitors.");
        return;
      }

      const csv = toCsv(COLUMNS, ((data ?? []) as VisitorRow[]).map(toRow));
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`neu-pass-visitors-${timestamp}.csv`, csv);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search visitors"
          className="w-full rounded-2xl border border-emerald-500/20 bg-[#0a1f14]/80 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 lg:max-w-sm"
        />
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-2xl border border-emerald-500/20 bg-[#0a1f14]/80 px-4 py-3 text-white outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            onClick={() => void handleExport()}
            disabled={exporting || totalCount === 0}
            className="whitespace-nowrap rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#04150c] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {exportError}
        </div>
      ) : null}

      <div className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-5">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading visitors...</div>
        ) : error ? (
          <div className="py-16 text-center text-red-400">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No visitor records found.</div>
        ) : (
          <>
            <DataTable columns={COLUMNS} rows={rows} />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">
                Showing {page * PAGE_SIZE + 1}-{Math.min(totalCount, page * PAGE_SIZE + rows.length)} of{" "}
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
          </>
        )}
      </div>
    </div>
  );
}
