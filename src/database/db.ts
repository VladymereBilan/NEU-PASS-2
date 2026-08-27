import * as SQLite from "expo-sqlite";
import {
  CREATE_USER_ACCOUNTS_INDEXES,
  CREATE_USER_ACCOUNTS_TABLE,
  CREATE_VISITOR_REGISTRATIONS_TABLE,
} from "./schema";

export const db = SQLite.openDatabaseSync("neu-pass.db");

let initialized = false;

const REQUIRED_COLUMNS: Array<{
  name: string;
  type: string;
  defaultValue: string;
}> = [
  { name: "otherAgenda", type: "TEXT", defaultValue: "''" },
  { name: "consentAccepted", type: "INTEGER", defaultValue: "0" },
  { name: "ocrReviewed", type: "INTEGER", defaultValue: "0" },
  { name: "faceVerificationStatus", type: "TEXT", defaultValue: "''" },
  { name: "idImageUri", type: "TEXT", defaultValue: "''" },
  { name: "faceImageUri", type: "TEXT", defaultValue: "''" },
  { name: "registrationStatus", type: "TEXT", defaultValue: "''" },
  { name: "visitorPassNumber", type: "TEXT", defaultValue: "''" },
  { name: "qrStatus", type: "TEXT", defaultValue: "''" },
  { name: "expirationTime", type: "TEXT", defaultValue: "''" },
  { name: "checkoutStatus", type: "TEXT", defaultValue: "''" },
  { name: "checkoutRequestedAt", type: "TEXT", defaultValue: "''" },
  { name: "timeIn", type: "TEXT", defaultValue: "''" },
  { name: "timeOut", type: "TEXT", defaultValue: "''" },
  {
    name: "faceCheckoutVerificationStatus",
    type: "TEXT",
    defaultValue: "''",
  },
];

export function getDb() {
  return db;
}

export function executeSqlAsync(sql: string, params: unknown[] = []) {
  const trimmed = sql.trim().toLowerCase();

  if (trimmed.startsWith("select") || trimmed.startsWith("pragma")) {
    const rows = db.getAllSync(sql, params as any[]);
    return Promise.resolve({
      rows: {
        _array: rows,
        length: rows.length,
        item: (index: number) => rows[index],
      },
    });
  }

  const result = db.runSync(sql, params as any[]);
  return Promise.resolve(result);
}

export async function initDb() {
  if (initialized) return;

  db.execSync(CREATE_VISITOR_REGISTRATIONS_TABLE);
  db.execSync(CREATE_USER_ACCOUNTS_TABLE);
  await runMigrations();

  try {
    db.execSync(CREATE_USER_ACCOUNTS_INDEXES);
  } catch {
    // Existing installs with pre-existing duplicate emails/usernames would
    // fail to build the index; don't block app startup over it.
  }

  initialized = true;
}

async function runMigrations() {
  const result: any = await executeSqlAsync(
    "PRAGMA table_info(visitor_registrations)"
  );

  const columns = new Set(
    (result.rows._array || []).map((row: any) => row.name)
  );

  for (const column of REQUIRED_COLUMNS) {
    if (!columns.has(column.name)) {
      db.execSync(
        `ALTER TABLE visitor_registrations ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
      );
    }
  }
}