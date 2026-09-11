// Guard/admin usernames get mapped to a synthetic email address
// (`{username}@guard.neu-pass.internal` / `@admin.neu-pass.internal`, see
// syntheticAuth.ts) so they must stay safe to drop into an email local-part —
// no "@", whitespace, or other characters that would produce a malformed or
// colliding synthetic address.
const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

export function usernamePolicyError(username: string): string | null {
  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 32) {
    return "Username must be 3-32 characters.";
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Username may only contain letters, numbers, dots, hyphens, and underscores, and can't start or end with a symbol.";
  }
  return null;
}
