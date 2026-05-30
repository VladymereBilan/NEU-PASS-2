import type { FaceVerificationStatusType } from "../services/FaceVerificationService";

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
