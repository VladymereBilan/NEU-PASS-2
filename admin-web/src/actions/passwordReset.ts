"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { adminUsernameToEmail } from "@/lib/syntheticAuth";

// Callable while signed out — unlike accounts.ts, these actions have no
// requireAdmin() gate. Every path below must return the same generic result
// regardless of whether the username exists or has a recovery email on
// file, so a caller can never use this to enumerate admin accounts.

// Per-process, best-effort cooldown so repeated clicks don't re-trigger a
// generateLink + email send. Resets on server restart and isn't shared
// across instances — acceptable for this prototype's single-process
// deployment, not a substitute for real rate limiting. Capped and swept so
// an attacker spamming distinct usernames can't grow this unboundedly.
const RESET_COOLDOWN_MS = 60_000;
const MAX_TRACKED_KEYS = 500;
const lastRequestedAt = new Map<string, number>();

function shouldSkipForCooldown(key: string, now: number) {
  for (const [trackedKey, requestedAt] of lastRequestedAt) {
    if (now - requestedAt >= RESET_COOLDOWN_MS) {
      lastRequestedAt.delete(trackedKey);
    }
  }

  const last = lastRequestedAt.get(key);
  if (last && now - last < RESET_COOLDOWN_MS) {
    return true;
  }

  if (lastRequestedAt.size < MAX_TRACKED_KEYS) {
    lastRequestedAt.set(key, now);
  }
  return false;
}

// Escapes ILIKE metacharacters (%, _) so a caller can't broaden the match
// beyond the exact username they supplied — e.g. submitting "%" would
// otherwise match every admin row instead of returning no match.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function requestAdminPasswordReset(username: string) {
  const trimmed = username.trim();
  if (!trimmed) {
    return { ok: true } as const;
  }

  const syntheticEmail = adminUsernameToEmail(trimmed);
  const now = Date.now();

  if (shouldSkipForCooldown(syntheticEmail, now)) {
    return { ok: true } as const;
  }

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("recovery_email")
      .eq("account_type", "admin")
      .ilike("username", escapeLikePattern(trimmed))
      .maybeSingle();

    if (profile?.recovery_email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: syntheticEmail,
        options: { redirectTo: `${siteUrl}/reset-password` }
      });

      if (!linkError && linkData?.properties?.action_link) {
        await sendPasswordResetEmail(profile.recovery_email, linkData.properties.action_link);
      }
    }
  } catch {
    // Swallow — the response must never reveal whether this failed or
    // whether the account exists.
  }

  return { ok: true } as const;
}

async function sendPasswordResetEmail(to: string, actionLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your NEU Pass admin password",
      html: `<p>A password reset was requested for your NEU Pass admin account.</p><p><a href="${actionLink}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`
    })
  });
}
