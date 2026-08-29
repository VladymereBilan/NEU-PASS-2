import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Anon-key client scoped to the signed-in admin's own session (cookies) —
// every query through this client is subject to RLS as that admin user.
// Use in Server Components, Server Actions, and Route Handlers to read data
// or to verify who's calling before doing anything privileged.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as the session-refreshing middleware is running.
          }
        }
      }
    }
  );
}
