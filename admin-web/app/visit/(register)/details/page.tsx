"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { extractIdFields } from "@/lib/idFieldExtraction";
import {
  EMAIL_PATTERN,
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  isValidPhilippineMobile,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN,
  normalizePhilippineMobile,
  PURPOSE_OPTIONS
} from "@/lib/visitorRegistrationConstants";
import { VisitShell, TextField, SelectField, PrimaryButton } from "@/components/VisitShell";

type FormState = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idDescription: string;
  idNumber: string;
  purpose: string;
  agenda: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
// Only the fields AWS Textract can actually inform — contact number, email,
// and purpose of visit aren't on a government ID, so they're never touched.
type AutoFilledFields = Partial<Record<"fullName" | "address" | "idType" | "idNumber", boolean>>;

const ID_TYPE_SELECT_OPTIONS = ID_TYPE_OPTIONS.map((option) => ({ value: option, label: option }));

export default function VisitDetailsPage() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [form, setForm] = useState<FormState>(() => {
    const isOther = draft.idType.startsWith("Other: ");
    return {
      fullName: draft.fullName,
      address: draft.address,
      contactNumber: draft.contactNumber,
      email: draft.email,
      idType: isOther ? "Other" : draft.idType,
      idDescription: isOther ? draft.idType.slice("Other: ".length) : "",
      idNumber: draft.idNumber,
      purpose: draft.purposeOfVisit,
      agenda: draft.otherAgenda
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
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
      // own confirmation before Continue.
      const extracted = extractIdFields(data.lines);
      const nextAutoFilled: AutoFilledFields = {};
      setForm((prev) => {
        const next = { ...prev };
        // Only fill a field that's still blank when this response lands —
        // OCR runs in the background while the visitor can already be typing,
        // and a slow response must never clobber input they've entered in
        // the meantime.
        if (extracted.fullName && !prev.fullName.trim()) {
          next.fullName = extracted.fullName;
          nextAutoFilled.fullName = true;
        }
        if (extracted.address && !prev.address.trim()) {
          next.address = extracted.address;
          nextAutoFilled.address = true;
        }
        if (extracted.idType && !prev.idType.trim()) {
          next.idType = extracted.idType;
          next.idDescription = "";
          nextAutoFilled.idType = true;
        }
        if (extracted.idNumber && !prev.idNumber.trim()) {
          next.idNumber = extracted.idNumber;
          nextAutoFilled.idNumber = true;
        }
        return next;
      });
      setAutoFilled((prev) => ({ ...prev, ...nextAutoFilled }));
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.idImagePath]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    // Once the visitor edits a field themselves, it's no longer "what the ID
    // said" — drop the auto-filled hint so it doesn't keep claiming a value
    // they just typed came from the photo.
    if (key === "fullName" || key === "address" || key === "idType" || key === "idNumber") {
      setAutoFilled((prev) => ({ ...prev, [key]: false }));
    }
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

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
    if (!form.contactNumber.trim()) {
      nextErrors.contactNumber = "Contact Number is required.";
    } else if (!isValidPhilippineMobile(form.contactNumber)) {
      nextErrors.contactNumber = "Enter a valid PH mobile number (e.g. 09XXXXXXXXX).";
    }
    if (!form.email.trim()) {
      nextErrors.email = "Email Address is required.";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (form.idType === "Other" && !form.idDescription.trim()) {
      nextErrors.idDescription = "Please specify the type of ID.";
    }
    if (!form.idNumber.trim()) {
      nextErrors.idNumber = "ID Number is required.";
    } else if (!ID_NUMBER_PATTERN.test(form.idNumber.trim())) {
      nextErrors.idNumber = "ID Number must contain numbers and may also contain letters.";
    }
    if (!form.purpose.trim()) nextErrors.purpose = "Purpose is required.";
    if (form.purpose === "Others" && !form.agenda.trim()) {
      nextErrors.agenda = "Please specify your agenda.";
    }

    return nextErrors;
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateDraft({
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      contactNumber: normalizePhilippineMobile(form.contactNumber),
      email: form.email.trim(),
      idType: form.idType === "Other" ? `Other: ${form.idDescription.trim()}` : form.idType.trim(),
      idNumber: form.idNumber.trim(),
      purposeOfVisit: form.purpose.trim(),
      otherAgenda: form.agenda.trim()
    });
    router.push("/visit/face");
  };

  const hintFor = (key: keyof AutoFilledFields) =>
    autoFilled[key] ? "Matched from your ID — please verify." : undefined;

  return (
    <VisitShell
      step={3}
      title="Your Details"
      subtitle={
        ocrLoading
          ? "Reading your ID photo…"
          : "We've filled in what we could read from your ID — please check it and fill in the rest."
      }
    >
      <div className="space-y-4">
        <TextField
          label="Full Name"
          value={form.fullName}
          onChange={(value) => updateField("fullName", value)}
          placeholder="Juan Dela Cruz"
          error={errors.fullName}
          hint={hintFor("fullName")}
          required
        />
        <TextField
          label="Address"
          value={form.address}
          onChange={(value) => updateField("address", value)}
          placeholder="Full address"
          error={errors.address}
          hint={hintFor("address")}
          required
        />
        <TextField
          label="Contact Number"
          value={form.contactNumber}
          onChange={(value) => updateField("contactNumber", value)}
          placeholder="09xxxxxxxxx"
          type="tel"
          error={errors.contactNumber}
          required
        />
        <TextField
          label="Email Address"
          value={form.email}
          onChange={(value) => updateField("email", value)}
          placeholder="name@email.com"
          type="email"
          error={errors.email}
          required
        />
        <SelectField
          label="ID Type"
          value={form.idType}
          onChange={(value) => {
            updateField("idType", value);
            if (value !== "Other") updateField("idDescription", "");
          }}
          options={ID_TYPE_SELECT_OPTIONS}
          placeholder="Select ID type"
          error={errors.idType}
          hint={hintFor("idType")}
          required
        />
        {form.idType === "Other" ? (
          <TextField
            label="Specify ID Type"
            value={form.idDescription}
            onChange={(value) => updateField("idDescription", value)}
            placeholder="e.g. Foreign passport or residence permit"
            error={errors.idDescription}
            required
          />
        ) : null}
        <TextField
          label="ID Number"
          value={form.idNumber}
          onChange={(value) => updateField("idNumber", value)}
          placeholder="ID number"
          error={errors.idNumber}
          hint={hintFor("idNumber")}
          required
        />
        <SelectField
          label="Purpose of Visit"
          value={form.purpose}
          onChange={(value) => {
            updateField("purpose", value);
            if (value !== "Others") updateField("agenda", "");
          }}
          options={PURPOSE_OPTIONS}
          placeholder="Select purpose"
          error={errors.purpose}
          required
        />
        {form.purpose === "Others" ? (
          <TextField
            label="Please specify your agenda"
            value={form.agenda}
            onChange={(value) => updateField("agenda", value)}
            placeholder="Describe your agenda"
            error={errors.agenda}
            required
          />
        ) : null}

        <PrimaryButton onClick={handleSubmit}>Continue</PrimaryButton>
      </div>
    </VisitShell>
  );
}
