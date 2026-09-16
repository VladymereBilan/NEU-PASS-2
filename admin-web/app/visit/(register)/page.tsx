"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import {
  EMAIL_PATTERN,
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN,
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

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
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
    if (!form.contactNumber.trim()) nextErrors.contactNumber = "Contact Number is required.";
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
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      idType: form.idType === "Other" ? `Other: ${form.idDescription.trim()}` : form.idType.trim(),
      idNumber: form.idNumber.trim(),
      purposeOfVisit: form.purpose.trim(),
      otherAgenda: form.agenda.trim()
    });
    router.push("/visit/consent");
  };

  return (
    <VisitShell step={1} title="Your Details" subtitle="Tell us who you are and why you're visiting.">
      <div className="space-y-4">
        <TextField
          label="Full Name"
          value={form.fullName}
          onChange={(value) => updateField("fullName", value)}
          placeholder="Juan Dela Cruz"
          error={errors.fullName}
        />
        <TextField
          label="Address"
          value={form.address}
          onChange={(value) => updateField("address", value)}
          placeholder="Full address"
          error={errors.address}
        />
        <TextField
          label="Contact Number"
          value={form.contactNumber}
          onChange={(value) => updateField("contactNumber", value)}
          placeholder="09xxxxxxxxx"
          type="tel"
          error={errors.contactNumber}
        />
        <TextField
          label="Email Address"
          value={form.email}
          onChange={(value) => updateField("email", value)}
          placeholder="name@email.com"
          type="email"
          error={errors.email}
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
        />
        {form.idType === "Other" ? (
          <TextField
            label="Specify ID Type"
            value={form.idDescription}
            onChange={(value) => updateField("idDescription", value)}
            placeholder="e.g. Foreign passport or residence permit"
            error={errors.idDescription}
          />
        ) : null}
        <TextField
          label="ID Number"
          value={form.idNumber}
          onChange={(value) => updateField("idNumber", value)}
          placeholder="ID number"
          error={errors.idNumber}
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
        />
        {form.purpose === "Others" ? (
          <TextField
            label="Please specify your agenda"
            value={form.agenda}
            onChange={(value) => updateField("agenda", value)}
            placeholder="Describe your agenda"
            error={errors.agenda}
          />
        ) : null}

        <PrimaryButton onClick={handleSubmit}>Continue</PrimaryButton>
      </div>
    </VisitShell>
  );
}
