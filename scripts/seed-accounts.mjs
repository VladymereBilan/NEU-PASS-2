// One-off bootstrap script: creates the demo guard01/admin01 Supabase Auth
// accounts and sets their profiles.account_type. Requires SUPABASE_SERVICE_ROLE_KEY
// (never commit it, never paste it into chat) — run with:
//
//   node --env-file=.env.local scripts/seed-accounts.mjs
//
// (add SUPABASE_SERVICE_ROLE_KEY to .env.local yourself first; if your Node
// version predates --env-file (20.6+), export the var in your shell instead)
import { createClient } from "@supabase/supabase-js";

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

console.log("Done.");
