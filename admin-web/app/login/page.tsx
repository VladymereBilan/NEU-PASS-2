"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetSuccess = searchParams.get("reset") === "success";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
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
      setError("Invalid admin username or password.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.account_type !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not an admin account.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-[#04150c] shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
