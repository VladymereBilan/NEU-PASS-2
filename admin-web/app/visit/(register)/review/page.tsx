"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import {
  ID_NUMBER_PATTERN,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN
} from "@/lib/visitorRegistrationConstants";
import { VisitShell, TextField, PrimaryButton } from "@/components/VisitShell";

type ReviewForm = {
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
};

type ReviewErrors = Partial<Record<keyof ReviewForm, string>>;

// Raw OCR only (AWS Textract DetectDocumentText via the extract-id-text edge
// function) — it returns whatever text lines Textract found on the ID photo,
// with no attempt to map them to specific fields (see that function's own
// scope note: Textract's structured ID parsing isn't trained on Philippine
// ID formats). So this is shown purely as a side-by-side reference for the
// visitor's own manual review below, never used to fill in the form fields.
type OcrState =
  | { status: "loading" }
  | { status: "ready"; lines: string[] }
  | { status: "unavailable" };

export default function VisitReviewPage() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [form, setForm] = useState<ReviewForm>({
    fullName: draft.fullName,
    address: draft.address,
    idType: draft.idType,
    idNumber: draft.idNumber
  });
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [ocr, setOcr] = useState<OcrState | null>(null);

  useEffect(() => {
    if (!draft.idImagePath) return;

    // No ref-based "already requested" guard here — that would combine badly
    // with React Strict Mode's dev-only mount->cleanup->mount: the guard
    // would block the second (uncancelled) effect run from ever firing its
    // own request, leaving only the first (cancelled) run's fetch in
    // flight — whose result then gets silently dropped by the `cancelled`
    // check below, permanently stuck on "loading". The plain `cancelled`
    // flag alone is the React-docs-recommended pattern and is safe here:
    // it costs one extra duplicate request in dev only, never in production.
    let cancelled = false;
    setOcr({ status: "loading" });

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        lines: string[];
      }>("extract-id-text", { body: { idImagePath: draft.idImagePath } });

      if (cancelled) return;
      if (error || !data?.success || data.lines.length === 0) {
        setOcr({ status: "unavailable" });
        return;
      }
      setOcr({ status: "ready", lines: data.lines });
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.idImagePath]);

  const updateField = (key: keyof ReviewForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): ReviewErrors => {
    const nextErrors: ReviewErrors = {};
    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full Name is required.";
    } else if (!NAME_LETTER_PATTERN.test(form.fullName) || NAME_DIGIT_PATTERN.test(form.fullName)) {
      nextErrors.fullName = "Full Name must contain letters and cannot contain numbers.";
    }
    if (!form.address.trim()) {
      nextErrors.address = "Address is required.";
    } else if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(form.address) || !/\d/.test(form.address)) {
      nextErrors.address = "Address must contain both letters and a number.";
    }
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (!form.idNumber.trim()) {
      nextErrors.idNumber = "ID Number is required.";
    } else if (!ID_NUMBER_PATTERN.test(form.idNumber.trim())) {
      nextErrors.idNumber = "ID Number must contain numbers and may also contain letters.";
    }
    return nextErrors;
  };

  const handleContinue = () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateDraft({
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      idType: form.idType.trim(),
      idNumber: form.idNumber.trim()
    });
    router.push("/visit/face");
  };

  return (
    <VisitShell
      step={4}
      title="Review Your Details"
      subtitle="We don't fill this in for you — please double-check the details below are correct before continuing."
    >
      <div className="space-y-4">
        {ocr?.status === "loading" ? (
          <p className="text-sm text-gray-400">Reading your ID photo…</p>
        ) : null}

        {ocr?.status === "ready" ? (
          <div className="rounded-xl border border-emerald-500/20 bg-white/5 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
              Text we read from your ID
            </p>
            <ul className="space-y-1 text-sm text-gray-300">
              {ocr.lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Reference only — we don&apos;t fill anything in automatically. Make sure the fields
              below match your ID.
            </p>
          </div>
        ) : null}

        <TextField
          label="Full Name"
          value={form.fullName}
          onChange={(value) => updateField("fullName", value)}
          error={errors.fullName}
        />
        <TextField
          label="Address"
          value={form.address}
          onChange={(value) => updateField("address", value)}
          error={errors.address}
        />
        <TextField
          label="ID Type"
          value={form.idType}
          onChange={(value) => updateField("idType", value)}
          error={errors.idType}
        />
        <TextField
          label="ID Number"
          value={form.idNumber}
          onChange={(value) => updateField("idNumber", value)}
          error={errors.idNumber}
        />

        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </VisitShell>
  );
}
