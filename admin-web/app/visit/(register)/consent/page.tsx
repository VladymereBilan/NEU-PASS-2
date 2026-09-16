"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { VisitShell, PrimaryButton, SecondaryButton } from "@/components/VisitShell";

export default function VisitConsentPage() {
  const router = useRouter();
  const { updateDraft } = useRegistrationDraft();
  const [declined, setDeclined] = useState(false);

  const handleAccept = () => {
    updateDraft({ consentAccepted: true });
    router.push("/visit/id");
  };

  return (
    <VisitShell
      step={2}
      title="Privacy Consent"
      subtitle="Please review and accept before continuing."
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-400">
          NEU-Pass collects personal information and a facial image for visitor verification and
          campus security, in compliance with the Data Privacy Act of 2012 (Republic Act No.
          10173).
        </p>
        <div className="rounded-xl border border-emerald-500/20 bg-white/5 p-4">
          <p className="text-sm leading-relaxed text-gray-300">
            I voluntarily consent to the collection, processing, and storage of my personal
            information and facial image for visitor verification, campus security, and access
            management purposes in accordance with the Data Privacy Act of 2012 (Republic Act No.
            10173).
          </p>
        </div>

        {declined ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            Consent is required to continue registration.
          </p>
        ) : null}

        <div className="flex gap-3">
          <SecondaryButton onClick={() => setDeclined(true)}>Decline</SecondaryButton>
          <PrimaryButton onClick={handleAccept}>Accept</PrimaryButton>
        </div>
      </div>
    </VisitShell>
  );
}
