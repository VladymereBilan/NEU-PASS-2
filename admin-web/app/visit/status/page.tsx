"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import {
  buildVisitorQrValue,
  getExpirationStatus,
  type ExpirationStatus
} from "@/lib/visitorRegistrationConstants";

type RegistrationRow = {
  id: string;
  full_name: string;
  purpose_of_visit: string;
  other_agenda: string | null;
  registration_status: "Pending" | "Active" | "Rejected" | "Completed";
  qr_status: string;
  visitor_pass_number: string | null;
  time_in: string | null;
  expiration_time: string | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "no-session" }
  | { status: "error"; message: string }
  | { status: "loaded"; row: RegistrationRow | null };

const POLL_INTERVAL_MS = 20000;
const TERMINAL_STATUSES = new Set(["Completed", "Rejected"]);

export default function VisitStatusPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(
    null
  );
  const userIdRef = useRef<string | null>(null);
  const lastExpirationStatusRef = useRef<ExpirationStatus | null>(null);

  // Browsers only ever show the permission prompt in response to a real
  // user gesture (a click) — calling requestPermission() on mount/effect is
  // silently ignored (confirmed: permission stays "default" forever, the
  // notification would never fire for anyone). So this only reads the
  // current permission to decide whether to show the "Enable" button below;
  // the actual request happens in that button's onClick.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setNotificationPermission(Notification.permission);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  }, []);

  const fetchLatest = useCallback(async () => {
    const supabase = createClient();

    let userId = userIdRef.current;
    if (!userId) {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        setState({ status: "no-session" });
        return;
      }
      userId = session.user.id;
      userIdRef.current = userId;
    }

    const { data, error } = await supabase
      .from("visitor_registrations")
      .select(
        "id, full_name, purpose_of_visit, other_agenda, registration_status, qr_status, visitor_pass_number, time_in, expiration_time"
      )
      .eq("visitor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setState({ status: "error", message: "Unable to load your registration status." });
      return;
    }

    setState({ status: "loaded", row: data as RegistrationRow | null });
  }, []);

  useEffect(() => {
    void fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (state.status !== "loaded" || !state.row) return undefined;
    if (TERMINAL_STATUSES.has(state.row.registration_status)) return undefined;

    const interval = setInterval(() => void fetchLatest(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state, fetchLatest]);

  // Fires a native browser notification exactly once, the moment this
  // poll cycle first observes the pass cross into "Near Expiration" — not
  // on every 20s tick while it stays there. Works even if the tab is
  // backgrounded (not fully closed) and permission was granted above.
  useEffect(() => {
    if (state.status !== "loaded" || !state.row || !state.row.expiration_time) {
      lastExpirationStatusRef.current = null;
      return;
    }
    if (state.row.registration_status !== "Active") {
      lastExpirationStatusRef.current = null;
      return;
    }

    const currentStatus = getExpirationStatus(state.row.expiration_time);
    const previousStatus = lastExpirationStatusRef.current;
    lastExpirationStatusRef.current = currentStatus;

    const justEnteredNearExpiration =
      currentStatus === "Near Expiration" && previousStatus !== "Near Expiration";
    const canNotify =
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted";

    if (justEnteredNearExpiration && canNotify) {
      new Notification("Your NEU-Pass visitor pass is expiring soon", {
        body: `Pass ${state.row.visitor_pass_number ?? ""} expires at ${formatDate(
          state.row.expiration_time
        )}. Please proceed to checkout.`
      });
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== "loaded" || !state.row) {
      setQrDataUrl("");
      return;
    }
    const { row } = state;
    // registration_status only reaches "Completed" once a guard completes
    // checkout (see complete_checkout in CLAUDE.md's state machine), so
    // "Active" alone is the right window to show the QR in.
    if (row.registration_status !== "Active") {
      setQrDataUrl("");
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(buildVisitorQrValue(row.id, row.visitor_pass_number || ""))
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center bg-[#040f0a] px-4 py-10 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 15, 9, 0.82), rgba(3, 15, 9, 0.88)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="w-full max-w-md rounded-[22px] border border-emerald-500/25 bg-[#0a1f14]/85 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
        {renderBody(state, qrDataUrl, fetchLatest, notificationPermission, requestNotificationPermission)}
      </div>
    </main>
  );
}

function renderBody(
  state: LoadState,
  qrDataUrl: string,
  refresh: () => void,
  notificationPermission: NotificationPermission | null,
  onEnableNotifications: () => void
) {
  if (state.status === "loading") {
    return <p className="text-center text-sm text-gray-400">Loading your status…</p>;
  }

  if (state.status === "no-session") {
    return (
      <>
        <h1 className="text-xl font-extrabold text-white">Registration not found</h1>
        <p className="mt-3 text-sm text-gray-400">
          We can&apos;t find a registration in this browser. If you registered on a different
          device, please ask a guard for help.
        </p>
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-gray-400">{state.message}</p>
        <RefreshButton onClick={refresh} />
      </>
    );
  }

  const { row } = state;

  if (!row || row.registration_status === "Completed") {
    return (
      <>
        <h1 className="text-xl font-extrabold text-white">No active visit</h1>
        <p className="mt-3 text-sm text-gray-400">
          Register a visit and a guard will review it shortly.
        </p>
        <VisitLink />
      </>
    );
  }

  if (row.registration_status === "Rejected") {
    return (
      <>
        <h1 className="text-xl font-extrabold text-white">Registration declined</h1>
        <p className="mt-3 text-sm text-gray-400">You can submit a new registration anytime.</p>
        <VisitLink />
      </>
    );
  }

  if (row.registration_status === "Pending") {
    return (
      <>
        <h1 className="text-xl font-extrabold text-white">Waiting for guard approval</h1>
        <p className="mt-3 text-sm text-gray-400">
          You&apos;ll see your visitor pass here as soon as a guard reviews your registration.
        </p>
        <RefreshButton onClick={refresh} />
      </>
    );
  }

  const expirationStatus = row.expiration_time ? getExpirationStatus(row.expiration_time) : "Active";

  return (
    <>
      <h1 className="text-xl font-extrabold text-white">Your Visitor Pass</h1>
      <div className="mt-4 space-y-1.5 text-sm text-gray-300">
        <p className="text-base font-bold text-white">{row.full_name}</p>
        <p>Purpose: {row.purpose_of_visit}</p>
        {row.purpose_of_visit === "Others" && row.other_agenda ? (
          <p>Other Agenda: {row.other_agenda}</p>
        ) : null}
        <p>Visitor Pass: {row.visitor_pass_number || "-"}</p>
        <p>Time In: {formatDate(row.time_in)}</p>
        <p>Expiration: {formatDate(row.expiration_time)}</p>
        <p>QR Status: {row.qr_status}</p>
      </div>

      {expirationStatus === "Expired" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
          Your visitor pass has expired. Please proceed to the guard for checkout.
        </p>
      ) : expirationStatus === "Near Expiration" ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300">
          Your pass expires within 15 minutes. Please head to checkout.
        </p>
      ) : null}

      {notificationPermission === "default" ? (
        <button
          type="button"
          onClick={onEnableNotifications}
          className="mt-4 w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          Enable alert when my pass is about to expire
        </button>
      ) : null}

      {qrDataUrl ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl bg-[#F9FAFB] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Visitor pass QR code" className="h-44 w-44" />
          <p className="text-xs text-gray-500">Show this to a guard at checkout</p>
        </div>
      ) : null}

      <RefreshButton onClick={refresh} />
    </>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 w-full rounded-xl border border-emerald-500/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-emerald-400 hover:bg-emerald-500/10"
    >
      Refresh
    </button>
  );
}

function VisitLink() {
  return (
    <Link
      href="/visit"
      className="mt-5 block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-[#04150c] transition hover:bg-emerald-400"
    >
      Register a Visit
    </Link>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}
