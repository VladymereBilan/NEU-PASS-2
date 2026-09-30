"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUsernameToEmail, isSuperuserUsername } from "@/lib/syntheticAuth";

// Callable while signed out, like passwordReset.ts's actions — this IS the
// sign-in check, so it has no requireAdmin() gate of its own.

// Lockout state lives in Postgres (admin_login_attempts, see
// supabase/admin-login-lockout-migration.sql) so it holds across serverless
// instances and restarts — an in-memory Map alone doesn't on Vercel. The Map
// below is only a per-process fallback used if the RPCs are unreachable
// (e.g. the migration hasn't been applied yet), so a database hiccup
// degrades to the old best-effort behavior instead of blocking every login.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const STALE_AFTER_MS = 5 * 60_000;
const MAX_TRACKED_KEYS = 500;

type AttemptState = { count: number; lockedUntil: number; lastAttemptAt: number };
const attempts = new Map<string, AttemptState>();

function sweepAndGet(key: string, now: number): AttemptState {
  for (const [trackedKey, state] of attempts) {
    if (state.lockedUntil < now && now - state.lastAttemptAt > STALE_AFTER_MS) {
      attempts.delete(trackedKey);
    }
  }
  return attempts.get(key) ?? { count: 0, lockedUntil: 0, lastAttemptAt: now };
}

function setState(key: string, state: AttemptState) {
  if (!attempts.has(key) && attempts.size >= MAX_TRACKED_KEYS) {
    const oldestKey = attempts.keys().next().value;
    if (oldestKey !== undefined) attempts.delete(oldestKey);
  }
  attempts.set(key, state);
}

type AdminClient = ReturnType<typeof createAdminClient>;

// Each helper prefers the Postgres-backed state and falls back to the
// in-memory Map on any RPC error.
async function getLockedUntil(admin: AdminClient, key: string, now: number): Promise<number> {
  const { data, error } = await admin.rpc("admin_login_check", { p_key: key });
  if (!error) return data ? new Date(data as string).getTime() : 0;
  return sweepAndGet(key, now).lockedUntil;
}

async function recordFailure(
  admin: AdminClient,
  key: string,
  now: number
): Promise<number | undefined> {
  const { data, error } = await admin.rpc("admin_login_record_failure", {
    p_key: key,
    p_max_attempts: MAX_ATTEMPTS,
    p_lockout_seconds: LOCKOUT_MS / 1000
  });
  if (!error) return data ? new Date(data as string).getTime() : undefined;

  const state = sweepAndGet(key, now);
  const nextCount = state.count + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS;
    setState(key, { count: 0, lockedUntil, lastAttemptAt: now });
    return lockedUntil;
  }
  setState(key, { count: nextCount, lockedUntil: 0, lastAttemptAt: now });
  return undefined;
}

async function clearAttempts(admin: AdminClient, key: string) {
  attempts.delete(key);
  await admin.rpc("admin_login_reset", { p_key: key });
}

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string; lockedUntil?: number };

export async function adminLogin(username: string, password: string): Promise<AdminLoginResult> {
  const trimmedUsername = username.trim();
  if (!trimmedUsername || !password.trim()) {
    return { ok: false, error: "Enter your username and password." };
  }

  const key = trimmedUsername.toLowerCase();
  const now = Date.now();
  const admin = createAdminClient();

  const lockedUntil = await getLockedUntil(admin, key, now);
  if (lockedUntil > now) {
    return {
      ok: false,
      error: "Too many failed attempts. Please wait before trying again.",
      lockedUntil
    };
  }

  const fail = async (message: string): Promise<AdminLoginResult> => {
    const newLockedUntil = await recordFailure(admin, key, now);
    return newLockedUntil
      ? { ok: false, error: message, lockedUntil: newLockedUntil }
      : { ok: false, error: message };
  };

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: adminUsernameToEmail(trimmedUsername),
    password
  });

  if (authError || !data.user) {
    return await fail("Invalid admin username or password.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_status, username")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    await supabase.auth.signOut();
    return await fail("Invalid admin username or password.");
  }

  if (profile.account_status !== "Active" && !isSuperuserUsername(profile.username)) {
    await supabase.auth.signOut();
    // Not a failed-credential case — don't count it toward the lockout.
    return { ok: false, error: "This admin account has been blocked. Contact another administrator." };
  }

  await clearAttempts(admin, key);
  return { ok: true };
}
