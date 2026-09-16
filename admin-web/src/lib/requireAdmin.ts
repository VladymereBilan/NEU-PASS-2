import "server-only";
import { createClient } from "@/lib/supabase/server";

// Not itself a "use server" module — importable by Server Actions/Server
// Components without becoming a directly-invokable network endpoint.
//
// Server Actions are callable directly over the network by anyone who can
// reach this app, regardless of which page renders the button that
// triggers them — so every action that uses this must independently verify
// the caller is a signed-in admin before touching the service_role client.
// Never skip this just because the page that calls it happens to be behind
// the (protected) layout's own check.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    throw new Error("Only admins can perform this action.");
  }

  if (profile?.account_status !== "Active") {
    throw new Error("Your admin account has been blocked.");
  }

  return user;
}
