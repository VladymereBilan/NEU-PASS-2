"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/visitors", label: "Visitors" },
  { href: "/reports", label: "Reports" },
  { href: "/users", label: "Users" },
  { href: "/audit-logs", label: "Audit Logs" }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("neu-pass-admin-auth");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const title = useMemo(() => {
    if (pathname.includes("/visitors")) return "Visitor Monitoring";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/users")) return "User Management";
    if (pathname.includes("/audit-logs")) return "Audit Logs";
    return "Dashboard";
  }, [pathname]);

  const signOut = () => {
    window.localStorage.removeItem("neu-pass-admin-auth");
    router.push("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300">
        Loading admin session...
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 border-r border-white/10 bg-[rgba(13,23,40,0.92)] p-6 lg:flex lg:flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
              NEU-Pass
            </div>
            <div className="mt-2 text-2xl font-semibold">Admin Console</div>
            <div className="mt-2 text-sm text-slate-400">
              Prototype web dashboard for operations and reporting.
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={signOut}
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Sign out
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[rgba(9,16,28,0.86)] px-5 py-4 backdrop-blur lg:px-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Security Operations
              </div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 md:block">
                admin01
              </div>
              <button
                onClick={signOut}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
