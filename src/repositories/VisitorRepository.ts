import { executeSqlAsync, initDb } from "../database/db";
import type {
  FaceCheckoutVerificationStatus,
  VisitorRegistration
} from "../types/VisitorRegistration";

function mapRow(row: any): VisitorRegistration {
  return {
    id: row.id,
    fullName: row.fullName,
    address: row.address,
    contactNumber: row.contactNumber,
    email: row.email,
    idType: row.idType,
    idNumber: row.idNumber,
    idImageUri: row.idImageUri || "",
    purposeOfVisit: row.purposeOfVisit,
    otherAgenda: row.otherAgenda || "",
    consentAccepted: row.consentAccepted === 1,
    ocrReviewed: row.ocrReviewed === 1,
    faceVerificationStatus: row.faceVerificationStatus,
    faceImageUri: row.faceImageUri || "",
    registrationStatus: row.registrationStatus,
    timeIn: row.timeIn || "",
    visitorPassNumber: row.visitorPassNumber || "",
    qrStatus: row.qrStatus,
    expirationTime: row.expirationTime || "",
    checkoutStatus: row.checkoutStatus,
    checkoutRequestedAt: row.checkoutRequestedAt || "",
    timeOut: row.timeOut || "",
    faceCheckoutVerificationStatus: row.faceCheckoutVerificationStatus || "",
    createdAt: row.createdAt
  };
}

function rows(result: any) {
  return (result?.rows?._array ?? []) as any[];
}

export async function createVisitor(visitor: VisitorRegistration) {
  await initDb();
  await executeSqlAsync(
    `INSERT INTO visitor_registrations (
      id,
      fullName,
      address,
      contactNumber,
      email,
      idType,
      idNumber,
      idImageUri,
      purposeOfVisit,
      otherAgenda,
      consentAccepted,
      ocrReviewed,
      faceVerificationStatus,
      faceImageUri,
      registrationStatus,
      visitorPassNumber,
      qrStatus,
      expirationTime,
      checkoutStatus,
      checkoutRequestedAt,
      timeIn,
      timeOut,
      faceCheckoutVerificationStatus,
      createdAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      visitor.id,
      visitor.fullName,
      visitor.address,
      visitor.contactNumber,
      visitor.email,
      visitor.idType,
      visitor.idNumber,
      visitor.idImageUri,
      visitor.purposeOfVisit,
      visitor.otherAgenda,
      visitor.consentAccepted ? 1 : 0,
      visitor.ocrReviewed ? 1 : 0,
      visitor.faceVerificationStatus,
      visitor.faceImageUri,
      visitor.registrationStatus,
      visitor.visitorPassNumber,
      visitor.qrStatus,
      visitor.expirationTime,
      visitor.checkoutStatus,
      visitor.checkoutRequestedAt,
      visitor.timeIn,
      visitor.timeOut,
      visitor.faceCheckoutVerificationStatus,
      visitor.createdAt
    ]
  );
  return visitor;
}

export async function getVisitorById(id: string) {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations WHERE id = ?",
    [id]
  );
  const [row] = rows(result);
  return row ? mapRow(row) : null;
}

export async function getAllVisitors() {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations ORDER BY createdAt DESC"
  );
  return rows(result).map(mapRow);
}

export async function getPendingVisitors() {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations WHERE registrationStatus = ? ORDER BY createdAt DESC",
    ["Pending"]
  );
  return rows(result).map(mapRow);
}

export async function getActiveVisitors() {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations WHERE registrationStatus = ? ORDER BY timeIn DESC",
    ["Active"]
  );
  return rows(result).map(mapRow);
}

export async function getCheckoutRequests() {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations WHERE checkoutStatus = ? ORDER BY checkoutRequestedAt DESC",
    ["Checkout Requested"]
  );
  return rows(result).map(mapRow);
}

export async function getCompletedVisitors() {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM visitor_registrations WHERE checkoutStatus = ? ORDER BY timeOut DESC",
    ["Completed"]
  );
  return rows(result).map(mapRow);
}

export async function approveVisitor(id: string) {
  await initDb();
  const timeIn = new Date();
  const visitorPassNumber = await generateVisitorPassNumber();
  const expirationTime = calculateExpirationTime(timeIn, await getPurpose(id));

  await executeSqlAsync(
    `UPDATE visitor_registrations
     SET registrationStatus = ?,
         timeIn = ?,
         visitorPassNumber = ?,
         expirationTime = ?,
         qrStatus = ?,
         checkoutStatus = ?,
         checkoutRequestedAt = ?,
         timeOut = ?,
         faceCheckoutVerificationStatus = ?
     WHERE id = ?`,
    [
      "Active",
      timeIn.toISOString(),
      visitorPassNumber,
      expirationTime,
      "Active",
      "None",
      "",
      "",
      "",
      id
    ]
  );
  return getVisitorById(id);
}

export async function rejectVisitor(id: string) {
  await initDb();
  await executeSqlAsync(
    "UPDATE visitor_registrations SET registrationStatus = ? WHERE id = ?",
    ["Rejected", id]
  );
  return getVisitorById(id);
}

export async function requestCheckout(id: string) {
  await initDb();
  await executeSqlAsync(
    "UPDATE visitor_registrations SET checkoutStatus = ?, checkoutRequestedAt = ? WHERE id = ?",
    ["Checkout Requested", new Date().toISOString(), id]
  );
  return getVisitorById(id);
}

export async function completeCheckout(
  id: string,
  verificationStatus: FaceCheckoutVerificationStatus
) {
  await initDb();
  await executeSqlAsync(
    `UPDATE visitor_registrations
     SET checkoutStatus = ?,
         registrationStatus = ?,
         timeOut = ?,
         qrStatus = ?,
         faceCheckoutVerificationStatus = ?
     WHERE id = ?`,
    [
      "Completed",
      "Completed",
      new Date().toISOString(),
      "Used/Invalid",
      verificationStatus,
      id
    ]
  );
  return getVisitorById(id);
}

async function getPurpose(id: string) {
  const visitor = await getVisitorById(id);
  return visitor?.purposeOfVisit || "";
}

async function generateVisitorPassNumber() {
  const result = await executeSqlAsync(
    "SELECT COUNT(*) as count FROM visitor_registrations WHERE visitorPassNumber != ''"
  );
  const count = rows(result)[0]?.count ?? 0;
  return `VP-${String(count + 1).padStart(3, "0")}`;
}

function calculateExpirationTime(timeIn: Date, purposeOfVisit: string) {
  const fourPmPurposes = [
    "Enrollment",
    "Tuition Fee Payment",
    "Other Payments"
  ];
  const hours = fourPmPurposes.includes(purposeOfVisit) ? 16 : 18;
  const expiration = new Date(timeIn);
  expiration.setHours(hours, 0, 0, 0);
  return expiration.toISOString();
}
