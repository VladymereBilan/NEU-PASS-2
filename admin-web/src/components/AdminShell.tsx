"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/visitors", label: "Visitors" },
  { href: "/reports", label: "Reports" },
  { href: "/users", label: "Users" },
  { href: "/audit-logs", label: "Audit Logs" }
];

export function AdminShell({
  children,
  adminUsername
}: {
  children: React.ReactNode;
  adminUsername: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const title = useMemo(() => {
    if (pathname.includes("/visitors")) return "Visitor Monitoring";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/users")) return "User Management";
    if (pathname.includes("/audit-logs")) return "Audit Logs";
    return "Dashboard";
  }, [pathname]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        backgroundImage:
          "linear-gradient(rgba(10, 30, 22, 0.52), rgba(10, 30, 22, 0.62)), url('/NEWERABG.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundColor: "#edf7f0"
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 border-r border-white/20 bg-white/15 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md lg:flex lg:flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.35em] text-[#0b6e3c]">
              NEU PASS
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">Admin Console</div>
            <div className="mt-2 text-sm text-slate-200/90">
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
                      ? "bg-[#0b6e3c]/80 text-white ring-1 ring-[#0b6e3c]"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => void signOut()}
            className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
          >
            Sign out
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/20 bg-white/10 px-5 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.10)] backdrop-blur-md lg:px-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-200">
                Security Operations
              </div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 md:block">
                {adminUsername}
              </div>
              <button
                onClick={() => void signOut()}
                className="rounded-full bg-[#0b6e3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e7f49]"
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
