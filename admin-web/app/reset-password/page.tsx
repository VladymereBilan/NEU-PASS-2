"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Field, LockIcon } from "@/components/AuthShell";

type Status = "verifying" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const establishSession = async () => {
      const supabase = createClient();
      const url = new URL(window.location.href);

      // admin.auth.admin.generateLink({ type: "recovery" }) — used by
      // requestAdminPasswordReset since the link is generated server-side,
      // with no browser involved to hold a PKCE code_verifier — redirects
      // here with `token_hash`/`type`, meant for verifyOtp(). This is the
      // primary path for every link this app actually sends.
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery"
        });
        setStatus(verifyError ? "invalid" : "ready");
        return;
      }

      // Fallbacks for a PKCE `code` or an implicit-flow hash fragment, in
      // case Supabase Auth is configured in a way that redirects with one
      // of those shapes instead.
      const code = url.searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setStatus(exchangeError ? "invalid" : "ready");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        setStatus(sessionError ? "invalid" : "ready");
        return;
      }

      setStatus("invalid");
    };

    void establishSession();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Unable to reset password. Try requesting a new link.");
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=success");
  };

  return (
    <AuthShell
      eyebrow="New Era University"
      title="Reset Password"
      subtitle="Choose a new password for your admin account"
    >
      {status === "verifying" ? (
        <p className="text-center text-sm text-gray-400">Verifying your reset link...</p>
      ) : status === "invalid" ? (
        <div className="space-y-5">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-300">
            This reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-center text-base font-bold text-[#04150c] transition hover:bg-emerald-400"
          >
            Request a New Link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            icon={<LockIcon className="h-4 w-4" />}
            placeholder="Enter a new password"
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
          />
          <Field
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={setConfirm}
            icon={<LockIcon className="h-4 w-4" />}
            placeholder="Re-enter the new password"
          />

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-[#04150c] shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Set New Password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
