"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminUsernameToEmail } from "@/lib/syntheticAuth";
import { AuthShell, Field, UserIcon, LockIcon } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// Best-effort, client-side-only deterrent against rapid repeated guesses —
// it resets if the browser storage is cleared and isn't shared across
// devices/tabs, so it's not a substitute for real server-side rate limiting.
// Mirrors the same "best-effort cooldown" framing used by
// requestAdminPasswordReset's in-memory cooldown.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

type AttemptState = { count: number; lockedUntil: number };

function attemptStorageKey(username: string) {
  return `neu-pass-admin-login-attempts:${username.trim().toLowerCase()}`;
}

function readAttemptState(username: string): AttemptState {
  try {
    const raw = sessionStorage.getItem(attemptStorageKey(username));
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      lockedUntil: typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : 0
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeAttemptState(username: string, state: AttemptState) {
  try {
    sessionStorage.setItem(attemptStorageKey(username), JSON.stringify(state));
  } catch {
    // Storage unavailable (e.g. private browsing) — lockout just won't
    // persist across reloads; login itself still works.
  }
}

function clearAttemptState(username: string) {
  try {
    sessionStorage.removeItem(attemptStorageKey(username));
  } catch {
    // Ignore.
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const resetSuccess = searchParams.get("reset") === "success";

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const lockRemainingSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }

    const attemptState = readAttemptState(username);
    if (attemptState.lockedUntil > Date.now()) {
      setLockedUntil(attemptState.lockedUntil);
      setError("Too many failed attempts. Please wait before trying again.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: adminUsernameToEmail(username),
      password
    });

    if (authError || !data.user) {
      recordFailedAttempt();
      setError("Invalid admin username or password.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, account_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.account_type !== "admin") {
      await supabase.auth.signOut();
      recordFailedAttempt();
      setError("Invalid admin username or password.");
      setLoading(false);
      return;
    }

    if (profile.account_status !== "Active") {
      await supabase.auth.signOut();
      setError("This admin account has been blocked. Contact another administrator.");
      setLoading(false);
      return;
    }

    clearAttemptState(username);
    router.push("/dashboard");
    router.refresh();
  };

  const recordFailedAttempt = () => {
    const current = readAttemptState(username);
    const nextCount = current.count + 1;

    if (nextCount >= MAX_ATTEMPTS) {
      const lockedUntilValue = Date.now() + LOCKOUT_MS;
      writeAttemptState(username, { count: 0, lockedUntil: lockedUntilValue });
      setLockedUntil(lockedUntilValue);
      setNow(Date.now());
    } else {
      writeAttemptState(username, { count: nextCount, lockedUntil: 0 });
    }
  };

  const isLocked = lockRemainingSeconds > 0;

  return (
    <AuthShell
      eyebrow="New Era University"
      title="NEU PASS"
      subtitle="Sign in to access the admin dashboard"
      footerNote={
        <>
          This system is restricted to authorized NEU administrators.
          <br />
          Unauthorized access is strictly prohibited.
        </>
      }
    >
      <form onSubmit={submit}>
        {resetSuccess ? (
          <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
            Password updated. Sign in with your new password.
          </p>
        ) : null}

        <div className="space-y-4">
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            icon={<UserIcon className="h-4 w-4" />}
            placeholder="Enter your username"
          />
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            icon={<LockIcon className="h-4 w-4" />}
            placeholder="Enter your password"
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Link href="/forgot-password" className="text-xs font-medium text-emerald-400/80 hover:text-emerald-300">
            Forgot password?
          </Link>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {error}
            {isLocked ? ` Try again in ${lockRemainingSeconds}s.` : ""}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || isLocked}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-[#04150c] shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLocked ? `Locked (${lockRemainingSeconds}s)` : loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
