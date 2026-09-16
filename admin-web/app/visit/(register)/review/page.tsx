"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { VisitShell, TextField, PrimaryButton } from "@/components/VisitShell";

type ReviewForm = {
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
};

type ReviewErrors = Partial<Record<keyof ReviewForm, string>>;

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

  const updateField = (key: keyof ReviewForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): ReviewErrors => {
    const nextErrors: ReviewErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Full Name is required.";
    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (!form.idNumber.trim()) nextErrors.idNumber = "ID Number is required.";
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
      subtitle="We don't automatically read ID photos yet — please double-check the details below are correct before continuing."
    >
      <div className="space-y-4">
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
