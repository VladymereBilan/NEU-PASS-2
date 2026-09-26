"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { uploadVisitorImage } from "@/lib/visitorImageUpload";
import { submitVisitorRegistration } from "@/actions/visitorRegistration";
import {
  EMAIL_PATTERN,
  ID_NUMBER_PATTERN,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN
} from "@/lib/visitorRegistrationConstants";
import { VisitShell, PrimaryButton, SecondaryButton, ErrorBanner } from "@/components/VisitShell";
import { Turnstile } from "@/components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function VisitFaceCapturePage() {
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useRegistrationDraft();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  // Clearing the draft here (rather than right before the router.push below)
  // matters: router.push to /visit/status is an async client-side navigation,
  // but clearing the draft is a synchronous context update. If we cleared it
  // before the push resolved, the still-mounted (register) layout's
  // ConsentGuard would see consentAccepted flip to false while the URL was
  // still /visit/face and redirect back to /visit (step 1) — even though the
  // registration row was already inserted and visible to the guard. Deferring
  // the clear to unmount means it only runs once React actually swaps this
  // page out, by which point ConsentGuard's own effect isn't re-evaluated.
  const submittedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (submittedRef.current) clearDraft();
    };
  }, [clearDraft]);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const path = await uploadVisitorImage("visitor-faces", file);
      updateDraft({ faceImagePath: path });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload your face photo. Please try again."
      );
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const retake = () => {
    setPreviewUrl("");
    updateDraft({ faceImagePath: "" });
  };

  const handleSubmit = async () => {
    // Defense in depth against direct/URL navigation past earlier steps
    // (e.g. consent -> /visit/id -> /visit/face): ConsentGuard only checks
    // that consent was accepted, not that the details step was completed, so
    // re-validate everything that step requires before inserting.
    const hasValidDetails =
      draft.fullName.trim() &&
      NAME_LETTER_PATTERN.test(draft.fullName) &&
      !NAME_DIGIT_PATTERN.test(draft.fullName) &&
      draft.address.trim() &&
      /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(draft.address) &&
      draft.contactNumber.trim() &&
      draft.email.trim() &&
      EMAIL_PATTERN.test(draft.email.trim()) &&
      draft.idType.trim() &&
      draft.idNumber.trim() &&
      ID_NUMBER_PATTERN.test(draft.idNumber.trim()) &&
      draft.purposeOfVisit.trim() &&
      (draft.purposeOfVisit !== "Others" || draft.otherAgenda.trim());

    if (!hasValidDetails) {
      router.replace("/visit/details");
      return;
    }
    if (!draft.idImagePath) {
      setError("Missing ID photo. Please go back and capture your ID.");
      return;
    }
    if (!draft.faceImagePath) {
      setError("Please capture or upload a face photo before submitting.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification check before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    // All fields are re-validated server-side in submitVisitorRegistration
    // before the insert — this client-side hasValidDetails check above is
    // only for UX (route back to the right step), not a security boundary.
    const { error: submitError } = await submitVisitorRegistration({
      fullName: draft.fullName,
      address: draft.address,
      contactNumber: draft.contactNumber,
      email: draft.email,
      idType: draft.idType,
      idNumber: draft.idNumber,
      idImagePath: draft.idImagePath,
      purposeOfVisit: draft.purposeOfVisit,
      otherAgenda: draft.otherAgenda,
      consentAccepted: draft.consentAccepted,
      faceImagePath: draft.faceImagePath,
      turnstileToken
    });

    if (submitError) {
      setError(submitError);
      setSubmitting(false);
      // Turnstile tokens are single-use — force a fresh widget/token before
      // the visitor can retry, rather than resubmitting an already-spent one.
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
      return;
    }

    submittedRef.current = true;
    router.push("/visit/status");
  };

  return (
    <VisitShell
      step={4}
      title="Capture Your Face"
      subtitle="A guard will compare this photo with a live photo during checkout."
    >
      <div className="space-y-4">
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-emerald-500/25 bg-white/5">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Captured face" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-gray-500">Face photo preview</span>
          )}
        </div>

        {uploading ? <p className="text-sm text-gray-400">Uploading…</p> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {draft.faceImagePath ? (
          <SecondaryButton onClick={retake}>Retake Photo</SecondaryButton>
        ) : (
          <label className="block cursor-pointer">
            <span className="sr-only">Capture face photo</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(event) => handleFileSelected(event.target.files?.[0])}
            />
            <div className="w-full rounded-xl border border-emerald-500/20 bg-white/5 px-4 py-3.5 text-center text-base font-bold text-white transition hover:border-emerald-400 hover:bg-emerald-500/10">
              Open Camera
            </div>
          </label>
        )}

        {TURNSTILE_SITE_KEY ? (
          <Turnstile
            key={turnstileResetKey}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
          />
        ) : null}

        <PrimaryButton
          onClick={handleSubmit}
          disabled={uploading || submitting || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
        >
          {submitting ? "Submitting…" : "Submit for Guard Verification"}
        </PrimaryButton>
      </div>
    </VisitShell>
  );
}
