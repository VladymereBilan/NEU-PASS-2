"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { extractIdFields } from "@/lib/idFieldExtraction";
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
type AutoFilledFields = Partial<Record<keyof ReviewForm, boolean>>;

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
  const [autoFilled, setAutoFilled] = useState<AutoFilledFields>({});
  const [ocrLoading, setOcrLoading] = useState(false);

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
    setOcrLoading(true);

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        lines: string[];
      }>("extract-id-text", { body: { idImagePath: draft.idImagePath } });

      if (cancelled) return;
      setOcrLoading(false);
      if (error || !data?.success || data.lines.length === 0) return;

      // AWS Textract (DetectDocumentText via the extract-id-text edge
      // function) returns raw text lines with no field labels of its own;
      // extractIdFields() applies best-effort label/keyword heuristics (see
      // that module) to guess Full Name / Address / ID Type / ID Number from
      // them. These are only ever pre-filled *suggestions* — every field
      // stays editable, and nothing here is trusted without the visitor's
      // own confirmation on this step.
      const extracted = extractIdFields(data.lines);
      const nextAutoFilled: AutoFilledFields = {};
      setForm((prev) => {
        const next = { ...prev };
        if (extracted.fullName) {
          next.fullName = extracted.fullName;
          nextAutoFilled.fullName = true;
        }
        if (extracted.address) {
          next.address = extracted.address;
          nextAutoFilled.address = true;
        }
        if (extracted.idType) {
          next.idType = extracted.idType;
          nextAutoFilled.idType = true;
        }
        if (extracted.idNumber) {
          next.idNumber = extracted.idNumber;
          nextAutoFilled.idNumber = true;
        }
        return next;
      });
      setAutoFilled(nextAutoFilled);
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.idImagePath]);

  const updateField = (key: keyof ReviewForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    // Once the visitor edits a field themselves, it's no longer "what the ID
    // said" — drop the auto-filled hint so it doesn't keep claiming a value
    // they just typed came from the photo.
    setAutoFilled((prev) => ({ ...prev, [key]: false }));
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

  const hintFor = (key: keyof ReviewForm) =>
    autoFilled[key] && !errors[key] ? "Matched from your ID — please verify." : undefined;

  return (
    <VisitShell
      step={4}
      title="Review Your Details"
      subtitle="We've filled in what we could read from your ID photo — please check everything below and correct anything that's wrong."
    >
      <div className="space-y-4">
        {ocrLoading ? <p className="text-sm text-gray-400">Reading your ID photo…</p> : null}

        <TextField
          label="Full Name"
          value={form.fullName}
          onChange={(value) => updateField("fullName", value)}
          error={errors.fullName}
          hint={hintFor("fullName")}
        />
        <TextField
          label="Address"
          value={form.address}
          onChange={(value) => updateField("address", value)}
          error={errors.address}
          hint={hintFor("address")}
        />
        <TextField
          label="ID Type"
          value={form.idType}
          onChange={(value) => updateField("idType", value)}
          error={errors.idType}
          hint={hintFor("idType")}
        />
        <TextField
          label="ID Number"
          value={form.idNumber}
          onChange={(value) => updateField("idNumber", value)}
          error={errors.idNumber}
          hint={hintFor("idNumber")}
        />

        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </VisitShell>
  );
}
