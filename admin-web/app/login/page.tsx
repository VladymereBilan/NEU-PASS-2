"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { adminLogin } from "@/actions/adminLogin";
import { AuthShell, Field, UserIcon, LockIcon } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
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

  // The lockout itself is enforced server-side in adminLogin() — this local
  // state is only for the countdown display, seeded from that action's
  // response. Switching usernames clears it rather than tracking per-name
  // state locally, since only the server knows who's actually locked.
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setLockedUntil(0);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await adminLogin(username, password);

    if (!result.ok) {
      setError(result.error);
      setNow(Date.now());
      setLockedUntil(result.lockedUntil ?? 0);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            onChange={handleUsernameChange}
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
