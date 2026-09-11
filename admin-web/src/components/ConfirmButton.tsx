"use client";

import { useState } from "react";

// A single click on a destructive action (block a guard, overwrite a
// password) is one accidental tap away from happening. This swaps the
// button for an inline Confirm/Cancel pair instead of firing immediately —
// deliberately not a native window.confirm(), which blocks the JS thread
// and is awkward to style/test.
export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  className,
  confirmClassName,
  cancelClassName,
  disabled
}: {
  label: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  className?: string;
  confirmClassName?: string;
  cancelClassName?: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className={
            confirmClassName ??
            "rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setConfirming(false)}
          className={
            cancelClassName ??
            "rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={() => setConfirming(true)} className={className}>
      {label}
    </button>
  );
}
