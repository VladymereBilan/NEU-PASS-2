"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { createClient } from "@/lib/supabase/client";

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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
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
      .then(({ data }) => {
        setVisitors((data ?? []) as VisitorRow[]);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search visitors"
          className="w-full rounded-2xl border border-white/10 bg-[rgba(13,23,40,0.92)] px-4 py-3 text-white outline-none placeholder:text-slate-500 lg:max-w-sm"
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-[rgba(13,23,40,0.92)] px-4 py-3 text-white outline-none"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading visitors...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No visitor records found.</div>
        ) : (
          <DataTable
            columns={[
              "Visitor Name",
              "Purpose",
              "Status",
              "Time In",
              "Time Out",
              "QR Status",
              "Expiration Time"
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}
