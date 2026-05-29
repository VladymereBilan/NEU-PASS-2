export const FaceVerificationStatus = {
  Pending: "Pending",
  Matched: "Matched",
  NotMatched: "Not Matched",
  ManualReview: "Manual Review",
  ReadyForGuardReview: "Ready for Guard Review"
} as const;

export type FaceVerificationStatusType =
  (typeof FaceVerificationStatus)[keyof typeof FaceVerificationStatus];

export function prototypeMode(): FaceVerificationStatusType {
  return FaceVerificationStatus.ReadyForGuardReview;
}

export function realFaceVerificationModePlaceholder(): FaceVerificationStatusType {
  return FaceVerificationStatus.ManualReview;
}
