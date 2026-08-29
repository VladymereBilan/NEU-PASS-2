import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role client — bypasses RLS entirely. Only ever import this from a
// "use server" Server Action or Route Handler, and always verify the caller
// is actually a signed-in admin (via the request-scoped client in server.ts)
// before using it to do anything privileged. Never expose this key or this
// client to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
