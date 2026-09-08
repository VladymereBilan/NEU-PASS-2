import type { FaceVerificationStatusType } from "../services/FaceVerificationService";

export const PURPOSE_OPTIONS = [
  { value: "Inquiries", label: "Inquiries — Open 7:00 AM–6:00 PM" },
  { value: "Enrollment", label: "Enrollment — Open 7:00 AM–4:00 PM" },
  { value: "Tuition Fee Payment", label: "Tuition Fee Payment — Open 7:00 AM–4:00 PM" },
  { value: "Other Payments", label: "Other Payments — Open 7:00 AM–4:00 PM" },
  { value: "Others", label: "Others — Open 7:00 AM–6:00 PM" }
] as const;

export const ID_TYPE_OPTIONS = [
  "Philippine National ID (PhilID / ePhilID)",
  "Driver's License",
  "Philippine Passport",
  "UMID",
  "PRC ID",
  "SSS ID",
  "GSIS ID",
  "Voter's ID",
  "Postal ID",
  "Senior Citizen ID",
  "PWD ID",
  "PhilHealth ID",
  "TIN ID",
  "Pag-IBIG ID / Loyalty Card",
  "Company / Employee ID",
  "Barangay ID",
  "Other Government-Issued ID",
  "Other"
] as const;

// Shared with OcrService.ts's field-parsing heuristics, so both register.tsx's
// manual-entry validation and OCR extraction judge "looks like a name" /
// "looks like an ID number" the same way.
export const NAME_LETTER_PATTERN = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
export const NAME_DIGIT_PATTERN = /\d/;
export const ID_NUMBER_PATTERN = /^(?=.*\d)[A-Za-z0-9\-\s]+$/;

export type RegistrationStatus = "Pending" | "Active" | "Rejected" | "Completed";

export type QrStatus = "Active" | "Inactive" | "Used/Invalid";

export type CheckoutStatus = "None" | "Checkout Requested" | "Completed";

export type FaceCheckoutVerificationStatus =
  | "Matched"
  | "Not Matched"
  | "Manual Review"
  | "";

export type VisitorRegistration = {
  id: string;
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idImageUri: string;
  purposeOfVisit: string;
  otherAgenda: string;
  consentAccepted: boolean;
  ocrReviewed: boolean;
  faceVerificationStatus: FaceVerificationStatusType;
  faceImageUri: string;
  registrationStatus: RegistrationStatus;
  timeIn: string;
  visitorPassNumber: string;
  qrStatus: QrStatus;
  expirationTime: string;
  checkoutStatus: CheckoutStatus;
  checkoutRequestedAt: string;
  timeOut: string;
  faceCheckoutVerificationStatus: FaceCheckoutVerificationStatus;
  createdAt: string;
};
