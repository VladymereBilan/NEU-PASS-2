import React, { createContext, useContext, useMemo, useState } from "react";
import type { FaceVerificationStatusType } from "../services/FaceVerificationService";

export type RegistrationDraft = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  purposeOfVisit: string;
  otherAgenda: string;
  consentAccepted: boolean;
  ocrReviewed: boolean;
  faceVerificationStatus: FaceVerificationStatusType;
};

type RegistrationDraftContextValue = {
  draft: RegistrationDraft | null;
  updateDraft: (updates: Partial<RegistrationDraft>) => void;
  clearDraft: () => void;
  startDraft: (draft: RegistrationDraft) => void;
};

const RegistrationDraftContext = createContext<
  RegistrationDraftContextValue | undefined
>(undefined);

export function RegistrationDraftProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<RegistrationDraft | null>(null);

  const value = useMemo<RegistrationDraftContextValue>(
    () => ({
      draft,
      startDraft: (nextDraft) => setDraft(nextDraft),
      updateDraft: (updates) =>
        setDraft((prev) => (prev ? { ...prev, ...updates } : prev)),
      clearDraft: () => setDraft(null)
    }),
    [draft]
  );

  return (
    <RegistrationDraftContext.Provider value={value}>
      {children}
    </RegistrationDraftContext.Provider>
  );
}

export function useRegistrationDraft() {
  const ctx = useContext(RegistrationDraftContext);
  if (!ctx) {
    throw new Error("useRegistrationDraft must be used within provider");
  }
  return ctx;
}
