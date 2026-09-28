"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { uploadVisitorImage } from "@/lib/visitorImageUpload";
import { VisitShell, PrimaryButton, SecondaryButton, ErrorBanner } from "@/components/VisitShell";

export default function VisitIdCapturePage() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // The local preview blob only lives in this page's state — after coming
  // back from Details or reloading, the photo is still uploaded (its path
  // survives in the draft) but the preview box would be empty next to a
  // "Retake" button, looking like the photo was lost. Re-show it from Storage.
  useEffect(() => {
    if (!draft.idImagePath || previewUrl) return;
    let cancelled = false;
    void createClient()
      .storage.from("visitor-ids")
      .createSignedUrl(draft.idImagePath, 300)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setPreviewUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.idImagePath, previewUrl]);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const path = await uploadVisitorImage("visitor-ids", file);
      updateDraft({ idImagePath: path });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload your ID photo. Please try again."
      );
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const retake = () => {
    setPreviewUrl("");
    updateDraft({ idImagePath: "" });
  };

  const handleContinue = () => {
    if (!draft.idImagePath) {
      setError("Please capture or upload a photo of your ID before continuing.");
      return;
    }
    router.push("/visit/details");
  };

  return (
    <VisitShell step={2} title="Capture Your ID" subtitle="Take a clear photo of a valid ID.">
      <div className="space-y-4">
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-emerald-500/25 bg-white/5">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Captured ID" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-gray-500">ID photo preview</span>
          )}
        </div>

        {uploading ? <p className="text-sm text-gray-400">Uploading…</p> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {draft.idImagePath ? (
          <SecondaryButton onClick={retake}>Retake Photo</SecondaryButton>
        ) : (
          <label className="block cursor-pointer">
            <span className="sr-only">Capture ID photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => handleFileSelected(event.target.files?.[0])}
            />
            <div className="w-full rounded-xl border border-emerald-500/20 bg-white/5 px-4 py-3.5 text-center text-base font-bold text-white transition hover:border-emerald-400 hover:bg-emerald-500/10">
              Open Camera
            </div>
          </label>
        )}

        <PrimaryButton onClick={handleContinue} disabled={uploading}>
          Continue
        </PrimaryButton>
      </div>
    </VisitShell>
  );
}
