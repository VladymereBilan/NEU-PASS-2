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
