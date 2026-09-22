"use server";

import { createClient } from "@/lib/supabase/server";
import { adminUsernameToEmail, isSuperuserUsername } from "@/lib/syntheticAuth";

// Callable while signed out, like passwordReset.ts's actions — this IS the
// sign-in check, so it has no requireAdmin() gate of its own.

// Server-side lockout tracking, same shape/caveats as passwordReset.ts's
// cooldown Map: per-process and in-memory (resets on restart, not shared
// across server instances), but unlike the old client-side sessionStorage
// version, it can't be bypassed by clearing browser storage or scripting
// requests directly — the credential check itself only happens here.
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
  const state = sweepAndGet(key, now);

  if (state.lockedUntil > now) {
    return {
      ok: false,
      error: "Too many failed attempts. Please wait before trying again.",
      lockedUntil: state.lockedUntil
    };
  }

  const fail = (message: string): AdminLoginResult => {
    const nextCount = state.count + 1;
    if (nextCount >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_MS;
      setState(key, { count: 0, lockedUntil, lastAttemptAt: now });
      return { ok: false, error: message, lockedUntil };
    }
    setState(key, { count: nextCount, lockedUntil: 0, lastAttemptAt: now });
    return { ok: false, error: message };
  };

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: adminUsernameToEmail(trimmedUsername),
    password
  });

  if (authError || !data.user) {
    return fail("Invalid admin username or password.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_status, username")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    await supabase.auth.signOut();
    return fail("Invalid admin username or password.");
  }

  if (profile.account_status !== "Active" && !isSuperuserUsername(profile.username)) {
    await supabase.auth.signOut();
    // Not a failed-credential case — don't count it toward the lockout.
    return { ok: false, error: "This admin account has been blocked. Contact another administrator." };
  }

  attempts.delete(key);
  return { ok: true };
}
