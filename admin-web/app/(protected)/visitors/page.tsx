"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { visitors } from "@/lib/sample-data";

export default function VisitorsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    return visitors.filter((visitor) => {
      const matchesSearch =
        visitor.visitorName.toLowerCase().includes(search.toLowerCase()) ||
        visitor.purpose.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" ? true : visitor.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, search]);

  const rows = filtered.map((visitor) => [
    visitor.visitorName,
    visitor.purpose,
    visitor.status,
    visitor.timeIn,
    visitor.timeOut,
    visitor.qrStatus,
    visitor.expirationTime
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
        </select>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-5">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No visitor records found.
          </div>
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
