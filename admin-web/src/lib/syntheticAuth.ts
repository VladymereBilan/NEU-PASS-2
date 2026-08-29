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
