"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type RegistrationDraft = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idImagePath: string;
  purposeOfVisit: string;
  otherAgenda: string;
  building: string;
  accompanyingMinors: number;
  consentAccepted: boolean;
  faceImagePath: string;
};

const EMPTY_DRAFT: RegistrationDraft = {
  fullName: "",
  address: "",
  contactNumber: "",
  email: "",
  idType: "",
  idNumber: "",
  idImagePath: "",
  purposeOfVisit: "",
  otherAgenda: "",
  building: "MAIN",
  accompanyingMinors: 0,
  consentAccepted: false,
  faceImagePath: ""
};

const STORAGE_KEY = "neu-pass-visit-draft";
// Which Supabase user the stored draft belongs to. Its photo paths start with
// that user's id, so a draft carried into a different (e.g. fresh anonymous)
// session would be rejected at submit as "photo does not belong to this
// session" — better to start clean than to fail on the last step.
const OWNER_KEY = "neu-pass-visit-draft-owner";

// Only text fields and already-uploaded Storage paths live here — never raw
// image bytes. That's what makes it safe/cheap to persist to sessionStorage:
// a mid-flow reload (a real risk on a visitor's own mobile browser) loses
// nothing that isn't trivially re-derivable or already durably uploaded.
function readStoredDraft(userId: string): RegistrationDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const owner = window.sessionStorage.getItem(OWNER_KEY);
    if (owner !== userId) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.setItem(OWNER_KEY, userId);
      return EMPTY_DRAFT;
    }
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeStoredDraft(draft: RegistrationDraft) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (e.g. private browsing) — the draft just won't
    // survive a reload; the in-memory flow still works.
  }
}

function clearStoredDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

type RegistrationDraftContextValue = {
  draft: RegistrationDraft;
  updateDraft: (updates: Partial<RegistrationDraft>) => void;
  clearDraft: () => void;
};

const RegistrationDraftContext = createContext<RegistrationDraftContextValue | undefined>(
  undefined
);

export function RegistrationDraftProvider({
  userId,
  children
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<RegistrationDraft>(() => readStoredDraft(userId));
  const draftRef = useRef(draft);

  const updateDraft = useCallback((updates: Partial<RegistrationDraft>) => {
    const next = { ...draftRef.current, ...updates };
    draftRef.current = next;
    writeStoredDraft(next);
    setDraft(next);
  }, []);

  const clearDraft = useCallback(() => {
    clearStoredDraft();
    draftRef.current = EMPTY_DRAFT;
    setDraft(EMPTY_DRAFT);
  }, []);

  const value = useMemo(() => ({ draft, updateDraft, clearDraft }), [draft, updateDraft, clearDraft]);

  return (
    <RegistrationDraftContext.Provider value={value}>{children}</RegistrationDraftContext.Provider>
  );
}

export function useRegistrationDraft() {
  const ctx = useContext(RegistrationDraftContext);
  if (!ctx) {
    throw new Error("useRegistrationDraft must be used within RegistrationDraftProvider");
  }
  return ctx;
}
