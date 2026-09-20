// Deno Edge Function — deploy with `supabase functions deploy send-expiration-reminder-emails`.
// Not part of either Next.js/Expo TypeScript project; lives here (repo-root
// supabase/functions/) so admin-web's tsconfig never tries to type-check
// Deno-only globals against Node/DOM lib settings.
//
// Triggered every 5 minutes by pg_cron. Emails a visitor once, ~10-15
// minutes before their Active pass's expiration_time, via Resend (the same
// account already used by monthly-archive and the admin password-reset
// flow — no new provider/cost). This is the primary, always-on reminder;
// send-expiration-reminders (SMS, via Semaphore/PhilSMS) is paused pending
// provider budget/approval and is independent of this function — separate
// email_reminder_sent_at column, separate cron job, no shared state.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// See monthly-archive/index.ts and send-expiration-reminders/index.ts for
// why this is a manually-set secret distinct from SUPABASE_SERVICE_ROLE_KEY
// (this project's dual legacy-JWT/sb_secret_ key system means that reserved
// name resolves to a value neither pg_cron nor admin-web actually present).
const EDGE_FUNCTIONS_AUTH_TOKEN = Deno.env.get("EDGE_FUNCTIONS_AUTH_TOKEN")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Same self-contained gate as monthly-archive/index.ts. Duplicated, not
// imported — these functions share no code, each is its own Deno runtime.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function formatManilaTime(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + MANILA_OFFSET_MS);
  const hours24 = shifted.getUTCHours();
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

type ReminderRow = {
  id: string;
  email: string;
  full_name: string;
  visitor_pass_number: string | null;
  expiration_time: string;
};

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer (.+)$/);
  const presentedToken = bearerMatch?.[1] ?? "";
  if (!presentedToken || !timingSafeEqual(presentedToken, EDGE_FUNCTIONS_AUTH_TOKEN)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return jsonResponse(
      { error: "RESEND_API_KEY/RESEND_FROM_EMAIL secrets are not configured — nothing sent." },
      500
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const cutoff = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: rows, error: queryError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, visitor_pass_number, expiration_time")
    .eq("registration_status", "Active")
    .is("email_reminder_sent_at", null)
    .not("expiration_time", "is", null)
    .gte("expiration_time", now.toISOString())
    .lte("expiration_time", cutoff.toISOString());

  if (queryError) {
    return jsonResponse({ error: `Query failed: ${queryError.message}` }, 500);
  }

  const candidates = (rows ?? []) as ReminderRow[];
  if (candidates.length === 0) {
    return jsonResponse({ message: "No visitors due for an expiration reminder." }, 200);
  }

  let sent = 0;
  const failures: string[] = [];

  for (const row of candidates) {
    const expiresAt = formatManilaTime(row.expiration_time);

    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: row.email,
          subject: "Your NEU-Pass visitor pass is about to expire",
          text:
            `Hi ${row.full_name},\n\n` +
            `Your visitor pass ${row.visitor_pass_number ?? ""} will expire at ${expiresAt}. ` +
            `Please proceed to checkout with a guard before then.\n\n` +
            `— NEU-Pass`
        })
      });

      if (!emailResponse.ok) {
        const detail = await emailResponse.text().catch(() => "");
        failures.push(`${row.id}: HTTP ${emailResponse.status} ${detail}`);
        continue;
      }

      // Mark sent even if a later row in this batch fails — one bad
      // address must not cause this row to be retried (and re-emailed)
      // every 5 minutes for the rest of its 15-minute window.
      const { error: updateError } = await supabase
        .from("visitor_registrations")
        .update({ email_reminder_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if (updateError) {
        failures.push(
          `${row.id}: sent but failed to mark email_reminder_sent_at: ${updateError.message}`
        );
        continue;
      }

      sent++;
    } catch (err) {
      failures.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return jsonResponse(
    {
      message: `Sent ${sent} of ${candidates.length} reminder(s).`,
      failures
    },
    200
  );
});
