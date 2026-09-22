export type ExpirationStatus = "Active" | "Near Expiration" | "Expired";

export function getExpirationStatus(expirationTime: string): ExpirationStatus {
  if (!expirationTime) return "Expired";

  const now = Date.now();
  const expiration = new Date(expirationTime).getTime();
  const minutesUntil = Math.floor((expiration - now) / 60000);

  if (minutesUntil <= 0) return "Expired";
  if (minutesUntil <= 15) return "Near Expiration";
  return "Active";
}

export function getMinutesUntilExpiration(expirationTime: string) {
  if (!expirationTime) return 0;
  const now = Date.now();
  const expiration = new Date(expirationTime).getTime();
  return Math.max(0, Math.floor((expiration - now) / 60000));
}

export function isNearExpiration(expirationTime: string) {
  return getExpirationStatus(expirationTime) === "Near Expiration";
}

export function shouldShowExpirationWarning(expirationTime: string) {
  return isNearExpiration(expirationTime);
}

// A visitor's pass expiring doesn't check them out — registrationStatus stays
// "Active" until a guard completes checkout. This grace period distinguishes
// "just expired, guard hasn't gotten to them yet" from "left without
// checking out and nobody has noticed", surfaced to guards as "Overdue"
// rather than silently indistinguishable from a visitor still on campus.
const OVERDUE_GRACE_MINUTES = 30;

export function isOverdue(expirationTime: string, graceMinutes: number = OVERDUE_GRACE_MINUTES) {
  if (!expirationTime) return false;
  const now = Date.now();
  const expiration = new Date(expirationTime).getTime();
  const minutesPast = Math.floor((now - expiration) / 60000);
  return minutesPast >= graceMinutes;
}
