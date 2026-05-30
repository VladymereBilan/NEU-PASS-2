export type GuardAccountStatus = "Active" | "Blocked";

export type GuardAccount = {
  id: string;
  fullName: string;
  username: string;
  passwordDigest: string;
  accountStatus: GuardAccountStatus;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "neu-pass-admin-guard-accounts";

export async function hashPassword(password: string) {
  // Capstone 2 will move this to real backend-managed password hashing.
  const encoded = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function seedGuardAccount(): Promise<GuardAccount> {
  const now = new Date().toISOString();
  return {
    id: "guard-guard01",
    fullName: "Demo Guard Account",
    username: "guard01",
    passwordDigest: await hashPassword("guard123"),
    accountStatus: "Active",
    createdAt: now,
    updatedAt: now
  };
}

export async function loadGuardAccounts() {
  if (typeof window === "undefined") {
    return [] as GuardAccount[];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = await seedGuardAccount();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    return [seed];
  }

  try {
    const parsed = JSON.parse(raw) as GuardAccount[];
    if (parsed.length === 0) {
      const seed = await seedGuardAccount();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
      return [seed];
    }
    return parsed;
  } catch {
    const seed = await seedGuardAccount();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    return [seed];
  }
}

export function saveGuardAccounts(accounts: GuardAccount[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export async function createGuardAccount(input: {
  fullName: string;
  username: string;
  password: string;
  accountStatus: GuardAccountStatus;
}) {
  const accounts = await loadGuardAccounts();
  const existing = accounts.some(
    (account) => account.username.toLowerCase() === input.username.trim().toLowerCase()
  );

  if (existing) {
    throw new Error("A guard account already exists for this username.");
  }

  const now = new Date().toISOString();
  const account: GuardAccount = {
    id: `guard-${Date.now()}`,
    fullName: input.fullName.trim(),
    username: input.username.trim(),
    passwordDigest: await hashPassword(input.password),
    accountStatus: input.accountStatus,
    createdAt: now,
    updatedAt: now
  };

  const next = [account, ...accounts];
  saveGuardAccounts(next);
  return next;
}

export async function updateGuardAccountStatus(
  id: string,
  accountStatus: GuardAccountStatus
) {
  const accounts = await loadGuardAccounts();
  const next = accounts.map((account) =>
    account.id === id
      ? { ...account, accountStatus, updatedAt: new Date().toISOString() }
      : account
  );
  saveGuardAccounts(next);
  return next;
}
