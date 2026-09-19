"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { uploadVisitorImage } from "@/lib/visitorImageUpload";
import {
  EMAIL_PATTERN,
  FACE_VERIFICATION_READY_FOR_GUARD_REVIEW,
  ID_NUMBER_PATTERN,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN
} from "@/lib/visitorRegistrationConstants";
import { VisitShell, PrimaryButton, SecondaryButton, ErrorBanner } from "@/components/VisitShell";

export default function VisitFaceCapturePage() {
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useRegistrationDraft();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    // that consent was accepted, not that details/review were completed, so
    // re-validate everything the earlier steps require before inserting.
    const hasValidDetails =
      draft.fullName.trim() &&
      NAME_LETTER_PATTERN.test(draft.fullName) &&
      !NAME_DIGIT_PATTERN.test(draft.fullName) &&
      draft.address.trim() &&
      draft.contactNumber.trim() &&
      draft.email.trim() &&
      EMAIL_PATTERN.test(draft.email.trim()) &&
      draft.idType.trim() &&
      draft.idNumber.trim() &&
      ID_NUMBER_PATTERN.test(draft.idNumber.trim()) &&
      draft.purposeOfVisit.trim();

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

    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Your session expired. Please reload this page and start again.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("visitor_registrations").insert({
      visitor_user_id: userData.user.id,
      full_name: draft.fullName,
      address: draft.address,
      contact_number: draft.contactNumber,
      email: draft.email,
      id_type: draft.idType,
      id_number: draft.idNumber,
      id_image_path: draft.idImagePath,
      purpose_of_visit: draft.purposeOfVisit,
      other_agenda: draft.otherAgenda,
      consent_accepted: draft.consentAccepted,
      ocr_reviewed: true,
      face_verification_status: FACE_VERIFICATION_READY_FOR_GUARD_REVIEW,
      face_image_path: draft.faceImagePath,
      registration_status: "Pending",
      qr_status: "Inactive",
      checkout_status: "None"
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    submittedRef.current = true;
    router.push("/visit/status");
  };

  return (
    <VisitShell
      step={5}
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
              Open Camera / Choose Photo
            </div>
          </label>
        )}

        <PrimaryButton onClick={handleSubmit} disabled={uploading || submitting}>
          {submitting ? "Submitting…" : "Submit for Guard Verification"}
        </PrimaryButton>
      </div>
    </VisitShell>
  );
}
