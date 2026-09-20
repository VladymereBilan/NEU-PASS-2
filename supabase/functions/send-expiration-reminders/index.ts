// Deno Edge Function — deploy with `supabase functions deploy send-expiration-reminders`.
// Not part of either Next.js/Expo TypeScript project; lives here (repo-root
// supabase/functions/) so admin-web's tsconfig never tries to type-check
// Deno-only globals against Node/DOM lib settings.
//
// Triggered every 5 minutes by pg_cron. Texts a visitor once, ~10-15 minutes
// before their Active pass's expiration_time, via the PhilSMS API — the
// only visitor-facing warning today is the "Near Expiration" badge on
// /visit/status, which only reaches a visitor who still has that tab open.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// A manually-set secret, distinct from SUPABASE_SERVICE_ROLE_KEY: this
// project has both the legacy JWT key system and the newer sb_secret_/
// sb_publishable_ system enabled, and Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
// resolves to the *new* sb_secret_ value at runtime — but both legitimate
// callers (pg_cron's Vault-stored secret, admin-web's createAdminClient())
// still present the legacy JWT. Comparing against a secret we set ourselves
// (to that same legacy JWT value) sidesteps depending on which key format
// the platform happens to auto-inject under that reserved name.
const EDGE_FUNCTIONS_AUTH_TOKEN = Deno.env.get("EDGE_FUNCTIONS_AUTH_TOKEN")!;
const PHILSMS_API_KEY = Deno.env.get("PHILSMS_API_KEY");
// PhilSMS requires a registered sender_id on every send (unlike Semaphore,
// which defaults to the account's own sender name when omitted) — see
// https://app.philsms.com/developers/documentation. Set this to whatever
// sender ID/name is approved on the PhilSMS dashboard.
const PHILSMS_SENDER_ID = Deno.env.get("PHILSMS_SENDER_ID");

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Same self-contained gate as monthly-archive/index.ts (see its comment for
// why this compares the raw bearer token to the service_role key directly
// rather than decoding an unverified JWT's role claim). Duplicated, not
// imported — these functions share no code, each is its own Deno runtime.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// contact_number is stored as 09XXXXXXXXX (see
// admin-web/src/lib/visitorRegistrationConstants.ts::normalizePhilippineMobile)
// but PhilSMS expects the country-code form with no leading zero and no "+"
// (its docs show "639171234567") — converted here rather than at storage
// time, so the DB stays in the more recognizable local format for
// guard/admin display.
function toPhilSmsRecipient(contactNumber: string): string {
  return contactNumber.replace(/^0/, "63");
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
  contact_number: string;
  visitor_pass_number: string | null;
  expiration_time: string;
};

Deno.serve(async (req) => {
  // Only a caller presenting the actual service_role key (pg_cron via the
  // Vault-stored secret, see cron.job) may trigger this.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer (.+)$/);
  const presentedToken = bearerMatch?.[1] ?? "";
  if (!presentedToken || !timingSafeEqual(presentedToken, EDGE_FUNCTIONS_AUTH_TOKEN)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!PHILSMS_API_KEY || !PHILSMS_SENDER_ID) {
    return jsonResponse(
      { error: "PHILSMS_API_KEY/PHILSMS_SENDER_ID secrets are not configured — nothing sent." },
      500
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const cutoff = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: rows, error: queryError } = await supabase
    .from("visitor_registrations")
    .select("id, contact_number, visitor_pass_number, expiration_time")
    .eq("registration_status", "Active")
    .is("reminder_sent_at", null)
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
    const message =
      `NEU-Pass: Your visitor pass ${row.visitor_pass_number ?? ""} will expire at ` +
      `${formatManilaTime(row.expiration_time)}. Please proceed to checkout soon.`;

    try {
      const smsResponse = await fetch("https://app.philsms.com/api/v3/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PHILSMS_API_KEY}`
        },
        body: JSON.stringify({
          recipient: toPhilSmsRecipient(row.contact_number),
          sender_id: PHILSMS_SENDER_ID,
          type: "plain",
          message
        })
      });

      // PhilSMS can return HTTP 200 with a JSON {status: "error", ...} body,
      // so success requires checking both the HTTP status and the body.
      const result = await smsResponse.json().catch(() => null);
      if (!smsResponse.ok || result?.status !== "success") {
        failures.push(
          `${row.id}: HTTP ${smsResponse.status} ${result?.message ?? JSON.stringify(result)}`
        );
        continue;
      }

      // Mark sent even if a later row in this batch fails — one bad phone
      // number must not cause this row to be retried (and re-texted) every
      // 5 minutes for the rest of its 15-minute window.
      const { error: updateError } = await supabase
        .from("visitor_registrations")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if (updateError) {
        failures.push(`${row.id}: sent but failed to mark reminder_sent_at: ${updateError.message}`);
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
