"use client";

import Image from "next/image";
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
    <div className="min-h-screen bg-[#f5faf6] text-[#111827]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 flex-col border-r border-[#d8e3dc] bg-white p-6 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/neu-logo.webp"
              alt="NEU Pass Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#0b6e3c]">
                NEU PASS
              </div>
              <div className="text-lg font-semibold text-[#111827]">Admin Console</div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#eaf5ee] text-[#0b6e3c]"
                      : "text-[#4b5563] hover:bg-[#f5faf6]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => void signOut()}
            className="mt-4 rounded-2xl border border-[#d8e3dc] px-4 py-3 text-sm font-semibold text-[#4b5563] hover:bg-[#f5faf6]"
          >
            Sign out
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#d8e3dc] bg-white px-5 py-4 lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4b5563]">
                Security Operations
              </div>
              <h1 className="text-2xl font-bold text-[#111827]">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[#d8e3dc] bg-[#f5faf6] px-4 py-2 text-sm font-medium text-[#374151] md:block">
                {adminUsername}
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
