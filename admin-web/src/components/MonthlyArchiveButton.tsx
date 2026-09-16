"use client";

import { useState } from "react";
import { runMonthlyArchiveNow } from "@/actions/archive";

const CONFIRM_MESSAGE =
  "This emails a CSV archive to every admin with a recovery email set, then " +
  "PERMANENTLY DELETES the archived visitor registrations (Completed/Rejected, " +
  "from before this month) and their ID/face photos. This cannot be undone.\n\n" +
  "Continue?";

export function MonthlyArchiveButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!window.confirm(CONFIRM_MESSAGE)) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await runMonthlyArchiveNow();
      setResult(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Emails every admin with a recovery email a CSV of finished visits from before this
        month, then deletes those rows and their photos. Runs automatically on the 1st of each
        month — use this to test the pipeline or force an off-cycle run.
      </p>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={running}
        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? "Running archive…" : "Run Monthly Archive Now"}
      </button>
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
