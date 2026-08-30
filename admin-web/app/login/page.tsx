"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminUsernameToEmail } from "@/lib/syntheticAuth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(12, 26, 20, 0.36), rgba(12, 26, 20, 0.46)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="w-full max-w-md">
        <form
          onSubmit={submit}
          className="rounded-[28px] border border-[#d8e3dc] bg-white/90 p-7 shadow-[0_18px_45px_rgba(11,110,60,0.10)] backdrop-blur-sm"
        >
          <div className="flex flex-col items-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#edf7f0] ring-8 ring-[#edf7f0]">
              <Image
                src="/neu-logo.webp"
                alt="NEU Pass Logo"
                width={72}
                height={72}
                priority
              />
            </div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-[#0b6e3c] uppercase">
              NEW ERA UNIVERSITY
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-[#111827]">NEU PASS</h1>
            <p className="mt-2 text-center text-sm text-[#4b5563]">
              Sign in to access the admin dashboard.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            <Field label="Username" value={username} onChange={setUsername} icon="user" />
            <Field
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              icon="lock"
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[#0b6e3c] px-4 py-3.5 text-base font-bold text-white shadow-[0_10px_25px_rgba(11,110,60,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0e7f49] hover:shadow-[0_14px_30px_rgba(11,110,60,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  showPassword,
  onTogglePassword
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: "user" | "lock";
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  const iconMarkup =
    icon === "user" ? "👤" : icon === "lock" ? "🔒" : "";

  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-[#374151]">{label}</div>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#0b6e3c]">
          {iconMarkup}
        </span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] py-3.5 pl-11 text-[#111827] outline-none transition placeholder:text-[#6b7280] focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee] ${
            label === "Password" ? "pr-12" : "pr-4"
          }`}
          placeholder={label}
        />
        {label === "Password" && onTogglePassword ? (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-2 transition hover:bg-[#edf7f0]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span
              className="text-lg"
              style={{
                filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
                color: "#111827",
                textShadow: "0 0 0 #111827"
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </button>
        ) : null}
      </div>
    </label>
  );
}
