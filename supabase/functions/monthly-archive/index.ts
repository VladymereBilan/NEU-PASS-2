// Deno Edge Function — deploy with `supabase functions deploy monthly-archive`.
// Not part of either Next.js/Expo TypeScript project; lives here (repo-root
// supabase/functions/) so admin-web's tsconfig never tries to type-check
// Deno-only globals against Node/DOM lib settings.
//
// Triggered by pg_cron (scheduled) or admin-web's "Run Monthly Archive Now"
// button (manual, via a Server Action calling this through supabase-js
// functions.invoke — both paths authenticate with the service_role key).
//
// Order of operations matters: never delete anything until every admin
// recipient has confirmed the archive CSV was sent. If email delivery
// fails partway through, abort before touching Storage or the database.
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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const CSV_COLUMNS = [
  "id",
  "full_name",
  "address",
  "contact_number",
  "email",
  "id_type",
  "id_number",
  "purpose_of_visit",
  "other_agenda",
  "visitor_pass_number",
  "registration_status",
  "checkout_status",
  "qr_status",
  "face_verification_status",
  "face_checkout_verification_status",
  "time_in",
  "time_out",
  "expiration_time",
  "created_at"
] as const;

// Start of the *current* Manila month, as an ISO string — an open-ended
// "created_at < this" cutoff (not "exactly last month") so a missed run
// doesn't permanently orphan a skipped month's data.
function startOfCurrentMonthManilaIso(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  const start = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - MANILA_OFFSET_MS
  );
  return start.toISOString();
}

// Mirrors admin-web/src/lib/csvExport.ts::toCsv exactly (formula-injection
// guard, quote-doubling, CRLF) — duplicated, not imported, since this is a
// separate Deno runtime with no shared code with the Next.js app.
function csvEscape(value: string | number): string {
  let str = String(value);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(columns: readonly string[], rows: (string | number)[][]): string {
  return [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Both legitimate callers (pg_cron, admin-web's Server Action via
// createAdminClient()) present the actual service_role key as the bearer
// token. Comparing the presented token directly against our own copy of
// that secret (EDGE_FUNCTIONS_AUTH_TOKEN, not SUPABASE_SERVICE_ROLE_KEY —
// see its declaration above) is a self-contained gate: unlike decoding an
// unverified JWT's role claim, it doesn't depend on the project's verify_jwt
// gateway setting (which lives outside this repo and could be disabled
// without notice) — forging a JWT payload of {"role":"service_role"} does
// not produce a string that matches this secret. Constant-time compare
// avoids leaking the key length/prefix via response-timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  // Only a caller presenting the actual service_role key (pg_cron, or
  // admin-web's Server Action via createAdminClient()) may trigger this —
  // the key is never exposed to a browser, so this is a safe-enough gate
  // for a server-to-server job with no end-user session of its own.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer (.+)$/);
  const presentedToken = bearerMatch?.[1] ?? "";
  if (!presentedToken || !timingSafeEqual(presentedToken, EDGE_FUNCTIONS_AUTH_TOKEN)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = startOfCurrentMonthManilaIso();

  const { data: rows, error: queryError } = await supabase
    .from("visitor_registrations")
    .select("*")
    .in("registration_status", ["Completed", "Rejected"])
    .lt("created_at", cutoff);

  if (queryError) {
    return jsonResponse({ error: `Query failed: ${queryError.message}` }, 500);
  }

  if (!rows || rows.length === 0) {
    return jsonResponse({ message: "No finished registrations to archive." }, 200);
  }

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("recovery_email")
    .eq("account_type", "admin")
    .not("recovery_email", "is", null);

  if (adminError) {
    return jsonResponse({ error: `Admin lookup failed: ${adminError.message}` }, 500);
  }

  const recipients = (admins ?? [])
    .map((admin: { recovery_email: string | null }) => admin.recovery_email)
    .filter((email): email is string => !!email);

  if (recipients.length === 0) {
    return jsonResponse(
      {
        message:
          "No admin has a recovery email configured — skipped this run without deleting anything."
      },
      200
    );
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return jsonResponse(
      {
        error:
          "Email is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL secrets missing) — aborting before any deletion."
      },
      500
    );
  }

  const csvBody = toCsv(
    CSV_COLUMNS,
    rows.map((row: Record<string, unknown>) =>
      CSV_COLUMNS.map((column) => (row[column] as string | number | null) ?? "")
    )
  );
  // Leading UTF-8 BOM so Excel reliably detects encoding (Filipino names/
  // addresses commonly have accented characters) — same as csvExport.ts.
  const csvBase64 = btoa(unescape(encodeURIComponent("﻿" + csvBody)));

  const monthLabel = new Date().toISOString().slice(0, 7);
  const filename = `neu-pass-archive-${monthLabel}.csv`;

  for (const to of recipients) {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject: `NEU-Pass monthly archive — ${monthLabel}`,
        text: `Attached: ${rows.length} finished visitor registration(s), archived before this month's data is purged from the live database. This is the only remaining copy of this data.`,
        attachments: [{ filename, content: csvBase64 }]
      })
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text().catch(() => "");
      return jsonResponse(
        {
          error: `Email delivery to ${to} failed (${emailResponse.status}) — aborting before deleting anything. ${detail}`
        },
        502
      );
    }
  }

  // Every recipient confirmed sent — safe to delete now, Storage first.
  const idPaths = rows
    .map((row: { id_image_path: string | null }) => row.id_image_path)
    .filter((path): path is string => !!path);
  const facePaths = rows
    .map((row: { face_image_path: string | null }) => row.face_image_path)
    .filter((path): path is string => !!path);

  if (idPaths.length > 0) {
    const { error } = await supabase.storage.from("visitor-ids").remove(idPaths);
    if (error) {
      return jsonResponse(
        { error: `Storage cleanup (visitor-ids) failed after email was already sent: ${error.message}` },
        500
      );
    }
  }

  if (facePaths.length > 0) {
    const { error } = await supabase.storage.from("visitor-faces").remove(facePaths);
    if (error) {
      return jsonResponse(
        { error: `Storage cleanup (visitor-faces) failed after email was already sent: ${error.message}` },
        500
      );
    }
  }

  const ids = rows.map((row: { id: string }) => row.id);
  const { error: deleteError } = await supabase.from("visitor_registrations").delete().in("id", ids);

  if (deleteError) {
    return jsonResponse(
      {
        error: `Row deletion failed after email and Storage cleanup already completed: ${deleteError.message}`
      },
      500
    );
  }

  return jsonResponse(
    {
      message: `Archived and purged ${rows.length} registration(s); emailed ${recipients.length} admin(s).`
    },
    200
  );
});
