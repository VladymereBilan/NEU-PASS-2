import type { FaceVerificationStatusType } from "../services/FaceVerificationService";

export const PURPOSE_OPTIONS = [
  { value: "Inquiries", label: "Inquiries — Open 7:00 AM–6:00 PM" },
  { value: "Enrollment", label: "Enrollment — Open 7:00 AM–4:00 PM" },
  { value: "Tuition Fee Payment", label: "Tuition Fee Payment — Open 7:00 AM–4:00 PM" },
  { value: "Other Payments", label: "Other Payments — Open 7:00 AM–4:00 PM" },
  { value: "Others", label: "Others — Open 7:00 AM–6:00 PM" }
] as const;

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
  rejectionReason: string;
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
