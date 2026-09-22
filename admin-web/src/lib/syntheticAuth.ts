// Guard and admin accounts are provisioned by an admin, not self-serve, and
// log in with a username rather than an email. Supabase Auth requires an
// email-shaped identifier, so usernames map to a synthetic internal address
// nobody actually receives mail at. Keep these domains in sync with
// GUARD_EMAIL_DOMAIN in the root app's src/lib/guardAuth.ts.
const GUARD_EMAIL_DOMAIN = "guard.neu-pass.internal";
const ADMIN_EMAIL_DOMAIN = "admin.neu-pass.internal";

export function guardUsernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${GUARD_EMAIL_DOMAIN}`;
}

export function adminUsernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
}

// A single break-glass admin account (account_type is still 'admin' — same
// permissions as any other admin, nothing extra) that is exempt from the
// account_status === "Active" gate enforced in login/page.tsx and
// (protected)/layout.tsx. Everything else about it is a normal admin
// account: if the only other admin account is ever Blocked, mis-configured,
// or its password lost, this one still logs in. Seeded by
// scripts/seed-accounts.mjs; credentials are handed to the adviser/Commander
// Reggie, not published here.
const SUPERUSER_USERNAME = "superadmin";

export function isSuperuserUsername(username: string | null | undefined) {
  return (username ?? "").trim().toLowerCase() === SUPERUSER_USERNAME;
}
