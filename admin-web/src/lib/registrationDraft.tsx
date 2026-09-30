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
  consentAccepted: false,
  faceImagePath: ""
};

const STORAGE_KEY = "neu-pass-visit-draft";

// Only text fields and already-uploaded Storage paths live here — never raw
// image bytes. That's what makes it safe/cheap to persist to sessionStorage:
// a mid-flow reload (a real risk on a visitor's own mobile browser) loses
// nothing that isn't trivially re-derivable or already durably uploaded.
function readStoredDraft(): RegistrationDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
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

export function RegistrationDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<RegistrationDraft>(readStoredDraft);
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
