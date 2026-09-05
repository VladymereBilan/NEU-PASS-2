"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AuditIcon,
  ChevronLeftIcon,
  DashboardIcon,
  ReportsIcon,
  SignOutIcon,
  UsersManageIcon,
  VisitorsIcon
} from "@/components/icons";
import { ShieldIcon } from "@/components/AuthShell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/visitors", label: "Visitors", icon: VisitorsIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
  { href: "/users", label: "Users", icon: UsersManageIcon },
  { href: "/audit-logs", label: "Audit Logs", icon: AuditIcon }
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
  const [collapsed, setCollapsed] = useState(false);

  const title = useMemo(() => {
    if (pathname.includes("/visitors")) return "Visitor Monitoring";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/users")) return "User Management";
    if (pathname.includes("/audit-logs")) return "Audit Logs";
    return "Dashboard";
  }, [pathname]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila"
      }),
    []
  );

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 15, 9, 0.9), rgba(3, 15, 9, 0.94)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <aside
          className={`hidden flex-col border-r border-emerald-500/15 bg-[#040f0a]/95 p-5 backdrop-blur-sm transition-all duration-200 lg:flex ${
            collapsed ? "w-24" : "w-72"
          }`}
        >
          <div className="mb-8 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/60">
                <ShieldIcon className="h-5 w-5 text-emerald-400" />
              </div>
              {!collapsed ? (
                <div className="overflow-hidden">
                  <div className="truncate text-xs font-bold uppercase tracking-[0.3em] text-white">
                    NEU PASS
                  </div>
                  <div className="truncate text-sm font-semibold text-emerald-400">
                    Admin Console
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 text-gray-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <ChevronLeftIcon className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => void signOut()}
            title={collapsed ? "Sign out" : undefined}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
          >
            <SignOutIcon className="h-5 w-5 shrink-0" />
            {!collapsed ? <span>Sign Out</span> : null}
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/15 bg-[#040f0a]/80 px-5 py-4 backdrop-blur-sm lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
                Security Operations
              </div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-sm text-gray-400 md:block">{today}</div>
              <div className="hidden items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 sm:flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Online
              </div>
              <div className="flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-white/5 py-1.5 pl-1.5 pr-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-[#04150c]">
                  {adminUsername.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-white">{adminUsername}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    Administrator
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
