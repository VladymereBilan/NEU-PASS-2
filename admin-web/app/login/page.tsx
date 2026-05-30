"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin01");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username === "admin01" && password === "admin123") {
      window.localStorage.setItem("neu-pass-admin-auth", "demo-token");
      router.push("/dashboard");
      return;
    }
    setError("Invalid demo credentials.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-8 shadow-glow"
      >
        <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
          NEU-Pass Admin
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-400">
          Use the demo credentials to open the web dashboard prototype.
        </p>

        <div className="mt-8 space-y-4">
          <Field label="Username" value={username} onChange={setUsername} />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <button className="mt-6 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
          Sign in
        </button>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div>Demo credentials:</div>
          <div className="mt-2 font-medium text-white">admin01 / admin123</div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
      />
    </label>
  );
}
