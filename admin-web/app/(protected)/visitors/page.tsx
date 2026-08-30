"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csvExport";

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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("visitor_registrations")
      .select(
        "id, full_name, purpose_of_visit, registration_status, time_in, time_out, qr_status, expiration_time"
      )
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError("Unable to load visitors.");
        } else {
          setVisitors((data ?? []) as VisitorRow[]);
        }
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return visitors.filter((visitor) => {
      const matchesSearch =
        visitor.full_name.toLowerCase().includes(search.toLowerCase()) ||
        visitor.purpose_of_visit.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" ? true : visitor.registration_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, search, visitors]);

  const rows = filtered.map((visitor) => [
    visitor.full_name,
    visitor.purpose_of_visit,
    visitor.registration_status,
    formatDate(visitor.time_in),
    formatDate(visitor.time_out),
    visitor.qr_status,
    formatDate(visitor.expiration_time)
  ]);

  const handleExport = () => {
    const csv = toCsv(COLUMNS, rows);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`neu-pass-visitors-${timestamp}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search visitors"
          className="w-full rounded-2xl border border-[#d8e3dc] bg-white px-4 py-3 text-[#111827] outline-none placeholder:text-[#6b7280] focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee] lg:max-w-sm"
        />
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-2xl border border-[#d8e3dc] bg-white px-4 py-3 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="whitespace-nowrap rounded-2xl bg-[#0b6e3c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0e7f49] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d8e3dc] bg-white p-5">
        {loading ? (
          <div className="py-16 text-center text-[#4b5563]">Loading visitors...</div>
        ) : error ? (
          <div className="py-16 text-center text-red-700">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#4b5563]">No visitor records found.</div>
        ) : (
          <DataTable columns={COLUMNS} rows={rows} />
        )}
      </div>
    </div>
  );
}
