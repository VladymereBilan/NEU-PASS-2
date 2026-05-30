import { executeSqlAsync, initDb } from "../database/db";
import { hashPassword, verifyPassword } from "../services/PasswordService";
import type { AccountStatus, AccountType, UserAccount } from "../types/UserAccount";

const DEFAULT_GUARD_USERNAME = "guard01";
const DEFAULT_GUARD_PASSWORD = "guard123";

function rows(result: any) {
  return (result?.rows?._array ?? []) as any[];
}

function mapAccount(row: any): UserAccount {
  return {
    id: row.id,
    accountType: row.accountType,
    fullName: row.fullName,
    email: row.email,
    contactNumber: row.contactNumber,
    username: row.username,
    passwordDigest: row.passwordDigest,
    accountStatus: row.accountStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureDefaultGuardAccount() {
  const result = await executeSqlAsync(
    "SELECT * FROM user_accounts WHERE accountType = ? AND username = ? LIMIT 1",
    ["guard", DEFAULT_GUARD_USERNAME]
  );

  if (rows(result).length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const passwordDigest = await hashPassword(DEFAULT_GUARD_PASSWORD);
  await executeSqlAsync(
    `INSERT INTO user_accounts (
      id,
      accountType,
      fullName,
      email,
      contactNumber,
      username,
      passwordDigest,
      accountStatus,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `guard-${DEFAULT_GUARD_USERNAME}`,
      "guard",
      "Demo Guard Account",
      "",
      "",
      DEFAULT_GUARD_USERNAME,
      passwordDigest,
      "Active",
      now,
      now,
    ]
  );
}

async function findAccountByEmail(email: string) {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM user_accounts WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email.trim()]
  );
  const [row] = rows(result);
  return row ? mapAccount(row) : null;
}

async function findAccountByUsername(username: string) {
  await initDb();
  await ensureDefaultGuardAccount();
  const result = await executeSqlAsync(
    "SELECT * FROM user_accounts WHERE LOWER(username) = LOWER(?) LIMIT 1",
    [username.trim()]
  );
  const [row] = rows(result);
  return row ? mapAccount(row) : null;
}

export async function createVisitorAccount(input: {
  fullName: string;
  email: string;
  contactNumber: string;
  password: string;
}) {
  await initDb();

  const duplicate = await executeSqlAsync(
    "SELECT id FROM user_accounts WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [input.email.trim()]
  );

  if (rows(duplicate).length > 0) {
    throw new Error("An account already exists for this email.");
  }

  const now = new Date().toISOString();
  const passwordDigest = await hashPassword(input.password);
  const account: UserAccount = {
    id: `visitor-${Date.now()}`,
    accountType: "visitor",
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    contactNumber: input.contactNumber.trim(),
    username: "",
    passwordDigest,
    accountStatus: "Active",
    createdAt: now,
    updatedAt: now,
  };

  await executeSqlAsync(
    `INSERT INTO user_accounts (
      id,
      accountType,
      fullName,
      email,
      contactNumber,
      username,
      passwordDigest,
      accountStatus,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.accountType,
      account.fullName,
      account.email,
      account.contactNumber,
      account.username,
      account.passwordDigest,
      account.accountStatus,
      account.createdAt,
      account.updatedAt,
    ]
  );

  return account;
}

export async function authenticateVisitor(email: string, password: string) {
  const account = await findAccountByEmail(email);

  if (!account || account.accountType !== "visitor") {
    throw new Error("No visitor account found for this email.");
  }

  if (account.accountStatus === "Blocked") {
    throw new Error("This visitor account is blocked.");
  }

  const matches = await verifyPassword(password, account.passwordDigest);
  if (!matches) {
    throw new Error("Invalid visitor password.");
  }

  return account;
}

export async function authenticateGuard(username: string, password: string) {
  const account = await findAccountByUsername(username);

  if (!account || account.accountType !== "guard") {
    throw new Error("No guard account found for this username.");
  }

  if (account.accountStatus === "Blocked") {
    throw new Error("This guard account is blocked by admin.");
  }

  const matches = await verifyPassword(password, account.passwordDigest);
  if (!matches) {
    throw new Error("Invalid guard password.");
  }

  return account;
}

export async function getGuardAccounts() {
  await initDb();
  await ensureDefaultGuardAccount();
  const result = await executeSqlAsync(
    "SELECT * FROM user_accounts WHERE accountType = ? ORDER BY createdAt DESC",
    ["guard"]
  );
  return rows(result).map(mapAccount);
}

export async function createGuardAccount(input: {
  fullName: string;
  username: string;
  password: string;
  accountStatus: AccountStatus;
}) {
  await initDb();
  await ensureDefaultGuardAccount();

  const duplicate = await executeSqlAsync(
    "SELECT id FROM user_accounts WHERE LOWER(username) = LOWER(?) LIMIT 1",
    [input.username.trim()]
  );

  if (rows(duplicate).length > 0) {
    throw new Error("A guard account already exists for this username.");
  }

  const now = new Date().toISOString();
  const account: UserAccount = {
    id: `guard-${Date.now()}`,
    accountType: "guard",
    fullName: input.fullName.trim(),
    email: "",
    contactNumber: "",
    username: input.username.trim(),
    passwordDigest: await hashPassword(input.password),
    accountStatus: input.accountStatus,
    createdAt: now,
    updatedAt: now,
  };

  await executeSqlAsync(
    `INSERT INTO user_accounts (
      id,
      accountType,
      fullName,
      email,
      contactNumber,
      username,
      passwordDigest,
      accountStatus,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.accountType,
      account.fullName,
      account.email,
      account.contactNumber,
      account.username,
      account.passwordDigest,
      account.accountStatus,
      account.createdAt,
      account.updatedAt,
    ]
  );

  return account;
}

export async function updateGuardAccountStatus(
  id: string,
  accountStatus: AccountStatus
) {
  await initDb();
  await executeSqlAsync(
    "UPDATE user_accounts SET accountStatus = ?, updatedAt = ? WHERE id = ? AND accountType = ?",
    [accountStatus, new Date().toISOString(), id, "guard"]
  );

  const result = await executeSqlAsync(
    "SELECT * FROM user_accounts WHERE id = ? LIMIT 1",
    [id]
  );
  const [row] = rows(result);
  return row ? mapAccount(row) : null;
}
