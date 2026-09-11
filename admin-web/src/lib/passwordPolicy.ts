export const PASSWORD_MIN_LENGTH = 8;

// Applies to every admin-web-issued password: guard/admin account creation,
// password reset (by an admin), and self-service reset via the recovery
// email flow. Kept deliberately simple (length + a letter + a number) since
// this is a capstone prototype, not a policy engine.
export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
