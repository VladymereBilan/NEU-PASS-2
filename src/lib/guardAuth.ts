// Guard accounts are admin-provisioned, not self-serve, and log in with a
// username rather than an email. Supabase Auth requires an email-shaped
// identifier, so guard usernames are mapped to a synthetic internal address
// nobody actually receives mail at.
export const GUARD_EMAIL_DOMAIN = "guard.neu-pass.internal";

export function guardUsernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${GUARD_EMAIL_DOMAIN}`;
}
