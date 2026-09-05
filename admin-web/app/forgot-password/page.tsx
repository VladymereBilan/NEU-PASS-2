"use client";

import Link from "next/link";
import { useState } from "react";
import { requestAdminPasswordReset } from "@/actions/passwordReset";
import { AuthShell, Field, UserIcon } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || submitting) return;

    setSubmitting(true);
    await requestAdminPasswordReset(username);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <AuthShell
      eyebrow="New Era University"
      title="Forgot Password"
      subtitle="Enter your admin username to request a reset link"
    >
      {submitted ? (
        <div className="space-y-5">
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-300">
            If that account exists and has a recovery email on file, we&apos;ve sent reset
            instructions to it.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-center text-base font-bold text-[#04150c] transition hover:bg-emerald-400"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            icon={<UserIcon className="h-4 w-4" />}
            placeholder="Enter your username"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-[#04150c] shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>

          <Link
            href="/login"
            className="block text-center text-xs font-medium text-emerald-400/80 hover:text-emerald-300"
          >
            Back to Sign In
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
