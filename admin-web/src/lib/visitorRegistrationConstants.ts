// Mirrors src/types/VisitorRegistration.ts and src/services/FaceVerificationService.ts
// from the root Expo app. admin-web is a separate npm project with no shared
// code between the two (see CLAUDE.md), so these are intentionally duplicated
// rather than imported. Values here must stay in sync with both the root
// app's file (if it's ever revived) and reportStats.ts's own PURPOSE_OPTIONS
// (which only needs the bare value strings for aggregation, not the labels).

export const PURPOSE_OPTIONS = [
  { value: "Inquiries", label: "Inquiries — Open 7:00 AM–6:00 PM" },
  { value: "Enrollment", label: "Enrollment — Open 7:00 AM–4:45 PM" },
  { value: "Tuition Fee Payment", label: "Tuition Fee Payment — Open 7:00 AM–4:45 PM" },
  { value: "Other Payments", label: "Other Payments — Open 7:00 AM–4:45 PM" },
  { value: "Others", label: "Others — Open 7:00 AM–6:00 PM" }
] as const;

export const ID_TYPE_OPTIONS = [
  "Philippine National ID (PhilID / ePhilID)",
  "Driver's License",
  "Philippine Passport",
  "UMID",
  "PRC ID",
  "SSS ID",
  "GSIS ID",
  "Voter's ID",
  "Postal ID",
  "Senior Citizen ID",
  "PWD ID",
  "PhilHealth ID",
  "TIN ID",
  "Pag-IBIG ID / Loyalty Card",
  "Company / Employee ID",
  "Barangay ID",
  "Other Government-Issued ID",
  "Other"
] as const;

export const NAME_LETTER_PATTERN = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
export const NAME_DIGIT_PATTERN = /\d/;
export const ID_NUMBER_PATTERN = /^(?=.*\d)[A-Za-z0-9\-\s]+$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts 09XXXXXXXXX, 639XXXXXXXXX, or +639XXXXXXXXX — the common ways a
// Philippine mobile number gets typed — after stripPhoneSeparators() has
// already removed any spaces/dashes a visitor typed between groups of
// digits (e.g. "0910 582 7021" or "0910-582-7021"), both of which are
// normal ways to type a PH number and must not be rejected outright.
// Required so the number is actually deliverable by the expiration-reminder
// SMS (send-expiration-reminders edge function) rather than just "non-empty".
export const CONTACT_NUMBER_PATTERN = /^(09\d{9}|\+?639\d{9})$/;

function stripPhoneSeparators(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

export function isValidPhilippineMobile(value: string): boolean {
  return CONTACT_NUMBER_PATTERN.test(stripPhoneSeparators(value));
}

// Normalizes any of CONTACT_NUMBER_PATTERN's accepted shapes (spaces/dashes
// included) to 09XXXXXXXXX before it's saved, so the stored value is always
// one canonical format and the SMS-sending edge function never needs to
// re-parse it.
export function normalizePhilippineMobile(value: string): string {
  const stripped = stripPhoneSeparators(value);
  if (/^09\d{9}$/.test(stripped)) return stripped;
  if (/^\+?639\d{9}$/.test(stripped)) return stripped.replace(/^\+?63/, "0");
  return stripped;
}

// Face matching is still manual/prototype (see FaceVerificationService.ts) —
// a guard visually compares the ID/face photos rather than any automated
// match. This is the status every web submission gets, same as mobile did.
export const FACE_VERIFICATION_READY_FOR_GUARD_REVIEW = "Ready for Guard Review";

// Mirrors src/services/QRService.ts exactly. The guard app's checkout
// scanner (app/(guard)/checkout.tsx) calls parseQRValue() on whatever it
// scans and rejects anything whose token doesn't match — a web-issued pass
// must produce byte-for-byte the same JSON shape or a guard's phone can't
// read it.
const VISITOR_QR_TOKEN = "NEU-PASS-PROTOTYPE";

export function buildVisitorQrValue(visitorId: string, visitorPassNumber: string) {
  return JSON.stringify({
    visitorId,
    visitorPassNumber,
    timestamp: new Date().toISOString(),
    token: VISITOR_QR_TOKEN
  });
}

// Mirrors src/services/ExpirationService.ts::getExpirationStatus.
export type ExpirationStatus = "Active" | "Near Expiration" | "Expired";

export function getExpirationStatus(expirationTime: string | null): ExpirationStatus {
  if (!expirationTime) return "Expired";

  const minutesUntil = Math.floor((new Date(expirationTime).getTime() - Date.now()) / 60000);

  if (minutesUntil <= 0) return "Expired";
  if (minutesUntil <= 15) return "Near Expiration";
  return "Active";
}
