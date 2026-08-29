import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    redirect("/login");
  }

  return <AdminShell adminUsername={profile.username ?? "admin"}>{children}</AdminShell>;
}
