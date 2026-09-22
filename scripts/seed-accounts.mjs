// One-off bootstrap script: creates the demo guard01/admin01 Supabase Auth
// accounts and sets their profiles.account_type. Requires SUPABASE_SERVICE_ROLE_KEY
// (never commit it, never paste it into chat) — run with:
//
//   node --env-file=.env.local scripts/seed-accounts.mjs
//
// (add SUPABASE_SERVICE_ROLE_KEY to .env.local yourself first; if your Node
// version predates --env-file (20.6+), export the var in your shell instead)
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Keep in sync with GUARD_EMAIL_DOMAIN in src/lib/guardAuth.ts.
const GUARD_EMAIL_DOMAIN = "guard.neu-pass.internal";
const ADMIN_EMAIL_DOMAIN = "admin.neu-pass.internal";

async function seedAccount({ email, password, accountType, username, fullName }) {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const already = existing.users.find((u) => u.email === email);
  let userId;

  if (already) {
    console.log(`${email} already exists, reusing it.`);
    userId = already.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created auth user for ${email}.`);
  }

  // trg_handle_new_auth_user already inserted a default account_type='visitor'
  // profile row for a newly-created user; this brings it (or an existing row,
  // if re-running) up to the correct account_type/username.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      account_type: accountType,
      username,
      full_name: fullName,
      account_status: "Active"
    })
    .eq("id", userId);

  if (updateError) throw updateError;
  console.log(`profiles.account_type set to '${accountType}' for ${email}.`);
  return { userId, created: !already };
}

await seedAccount({
  email: `guard01@${GUARD_EMAIL_DOMAIN}`,
  password: "guard123",
  accountType: "guard",
  username: "guard01",
  fullName: "Demo Guard Account"
});

await seedAccount({
  email: `admin01@${ADMIN_EMAIL_DOMAIN}`,
  password: "admin123",
  accountType: "admin",
  username: "admin01",
  fullName: "Demo Admin Account"
});

// Break-glass account: same account_type ('admin', same permissions as any
// other admin) but exempt from the account_status==="Active" login gate (see
// isSuperuserUsername in admin-web/src/lib/syntheticAuth.ts) — so if the
// regular admin account is ever Blocked, mis-configured, or its password is
// lost, this one still gets in. Unlike guard01/admin01, its password is
// generated fresh (not a fixed demo value) and is only ever printed once,
// here, on the run that creates it — hand it to whoever should hold
// emergency access (e.g. the adviser/Commander Reggie) and store it
// somewhere other than this repo.
const superuserPassword = randomBytes(9).toString("base64url");
const superuserResult = await seedAccount({
  email: `superadmin@${ADMIN_EMAIL_DOMAIN}`,
  password: superuserPassword,
  accountType: "admin",
  username: "superadmin",
  fullName: "Superuser (Break-Glass) Account"
});

if (superuserResult.created) {
  console.log("\n=== Superuser account created ===");
  console.log("Username: superadmin");
  console.log(`Password: ${superuserPassword}`);
  console.log(
    "This password will not be shown again — store it securely and hand it to whoever should hold emergency access.\n"
  );
} else {
  console.log("superadmin already exists — leaving its password unchanged.");
}

console.log("Done.");
