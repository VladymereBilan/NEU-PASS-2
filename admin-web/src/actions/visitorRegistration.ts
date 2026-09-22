"use server";

import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_PATTERN,
  FACE_VERIFICATION_READY_FOR_GUARD_REVIEW,
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN,
  PURPOSE_OPTIONS,
  isValidPhilippineMobile,
  normalizePhilippineMobile
} from "@/lib/visitorRegistrationConstants";

// Postgres unique-violation — the partial unique index on id_number (active
// registrations only) blocks a second Pending/Active registration under the
// same ID number, even from a different anonymous session.
const UNIQUE_VIOLATION = "23505";

const PURPOSE_VALUES = PURPOSE_OPTIONS.map((option) => option.value) as readonly string[];
const KNOWN_ID_TYPES = ID_TYPE_OPTIONS.filter((option) => option !== "Other") as readonly string[];

export type VisitorRegistrationInput = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idImagePath: string;
  purposeOfVisit: string;
  otherAgenda: string;
  consentAccepted: boolean;
  faceImagePath: string;
  turnstileToken: string;
};

// Cloudflare Turnstile — bot protection on the public, unauthenticated
// /visit form (see components/Turnstile.tsx). If TURNSTILE_SECRET_KEY isn't
// configured, verification is skipped entirely (matches the client, which
// doesn't render the widget without NEXT_PUBLIC_TURNSTILE_SITE_KEY either) —
// this is a deliberate opt-in, not a silent bypass, so local/dev setups
// without Turnstile configured still work.
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token })
    });
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // Cloudflare unreachable — fail closed rather than silently letting an
    // unverified submission through.
    return false;
  }
}

// The Details/Face steps already validate all of this client-side for UX
// (instant feedback), but that's browser JS anyone can bypass by calling
// this action directly with arbitrary values — so every rule is re-checked
// here before anything touches the database. Mirrors the client-side
// `validate()` in details/page.tsx and the `hasValidDetails` check in
// face/page.tsx; keep both in sync if either changes.
function validate(input: VisitorRegistrationInput): string | null {
  const fullName = input.fullName.trim();
  if (!fullName || !NAME_LETTER_PATTERN.test(fullName) || NAME_DIGIT_PATTERN.test(fullName)) {
    return "Full Name is missing or invalid.";
  }

  const address = input.address.trim();
  if (!address || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(address) || !/\d/.test(address)) {
    return "Address is missing or invalid.";
  }

  if (!input.contactNumber.trim() || !isValidPhilippineMobile(input.contactNumber)) {
    return "Contact Number is missing or invalid.";
  }

  const email = input.email.trim();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return "Email Address is missing or invalid.";
  }

  const idType = input.idType.trim();
  const isOtherIdType = idType.startsWith("Other: ") && idType.slice("Other: ".length).trim().length > 0;
  if (!idType || !(isOtherIdType || KNOWN_ID_TYPES.includes(idType))) {
    return "ID Type is missing or invalid.";
  }

  const idNumber = input.idNumber.trim();
  if (!idNumber || !ID_NUMBER_PATTERN.test(idNumber)) {
    return "ID Number is missing or invalid.";
  }

  const purpose = input.purposeOfVisit.trim();
  if (!purpose || !PURPOSE_VALUES.includes(purpose)) {
    return "Purpose of Visit is missing or invalid.";
  }
  if (purpose === "Others" && !input.otherAgenda.trim()) {
    return "Please specify your agenda.";
  }

  if (!input.consentAccepted) {
    return "Consent must be accepted before submitting.";
  }

  if (!input.idImagePath.trim() || !input.faceImagePath.trim()) {
    return "Missing ID or face photo.";
  }

  return null;
}

export async function submitVisitorRegistration(
  input: VisitorRegistrationInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Your session expired. Please reload this page and start again." };
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken);
  if (!turnstileOk) {
    return { error: "Verification failed. Please reload the page and try again." };
  }

  const validationError = validate(input);
  if (validationError) return { error: validationError };

  // Storage paths are {auth.uid()}/{filename} by convention (see
  // visitorImageUpload.ts) — require the photos this submission references
  // actually belong to the submitting session, not a path reused/guessed
  // from elsewhere.
  const ownPrefix = `${userData.user.id}/`;
  if (!input.idImagePath.startsWith(ownPrefix) || !input.faceImagePath.startsWith(ownPrefix)) {
    return { error: "ID or face photo does not belong to this session." };
  }

  const { error: insertError } = await supabase.from("visitor_registrations").insert({
    visitor_user_id: userData.user.id,
    full_name: input.fullName.trim(),
    address: input.address.trim(),
    contact_number: normalizePhilippineMobile(input.contactNumber),
    email: input.email.trim(),
    id_type: input.idType.trim(),
    id_number: input.idNumber.trim(),
    id_image_path: input.idImagePath,
    purpose_of_visit: input.purposeOfVisit.trim(),
    other_agenda: input.otherAgenda.trim(),
    consent_accepted: input.consentAccepted,
    ocr_reviewed: true,
    face_verification_status: FACE_VERIFICATION_READY_FOR_GUARD_REVIEW,
    face_image_path: input.faceImagePath,
    registration_status: "Pending",
    qr_status: "Inactive",
    checkout_status: "None"
  });

  if (insertError) {
    return {
      error:
        insertError.code === UNIQUE_VIOLATION
          ? "This ID already has an active or pending registration. Please wait for it to be checked out, or check its status if it's yours."
          : insertError.message
    };
  }

  return { error: null };
}
