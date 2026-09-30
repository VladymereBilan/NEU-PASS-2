"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRegistrationDraft } from "@/lib/registrationDraft";
import { BUILDING_OPTIONS } from "@/lib/visitorRegistrationConstants";
import { VisitShell, PrimaryButton, SecondaryButton } from "@/components/VisitShell";

const BUILDING_GATE_LABEL: Record<(typeof BUILDING_OPTIONS)[number], string> = {
  MAIN: "MAIN gate",
  SOM: "SOM gate",
  PSB: "PSB gate"
};

export default function VisitConsentPage() {
  // useSearchParams() requires a Suspense boundary or `next build` de-opts
  // the page from static generation — this route is only ever reached via a
  // gate's own printed QR, so a physical QR encodes ?station=SOM/PSB (or no
  // param at all for MAIN).
  return (
    <Suspense fallback={null}>
      <VisitConsentPageInner />
    </Suspense>
  );
}

function VisitConsentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, updateDraft } = useRegistrationDraft();
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const station = searchParams.get("station")?.trim().toUpperCase();
    if (station && (BUILDING_OPTIONS as readonly string[]).includes(station)) {
      updateDraft({ building: station });
    }
    // No else branch: an absent/invalid param leaves draft.building as its
    // already-defaulted "MAIN" (or whatever a prior scan in this session set)
    // rather than force-overwriting it on a bare reload of this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAccept = () => {
    updateDraft({ consentAccepted: true });
    router.push("/visit/id");
  };

  return (
    <VisitShell
      step={1}
      title="Privacy Consent"
      subtitle="Please review and accept before continuing."
    >
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
          Registering at: {BUILDING_GATE_LABEL[draft.building as keyof typeof BUILDING_GATE_LABEL] ?? draft.building}
        </p>
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
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-medium text-red-300">
            <p>
              Consent is required to use this online registration. You can still visit today —
              please proceed to the guard on duty at the gate for manual registration, and bring a
              valid ID.
            </p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <SecondaryButton onClick={() => setDeclined(true)}>Decline</SecondaryButton>
          <PrimaryButton onClick={handleAccept}>Accept</PrimaryButton>
        </div>
      </div>
    </VisitShell>
  );
}
