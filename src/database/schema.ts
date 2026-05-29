export const CREATE_VISITOR_REGISTRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS visitor_registrations (
    id TEXT PRIMARY KEY NOT NULL,
    fullName TEXT NOT NULL,
    address TEXT NOT NULL,
    contactNumber TEXT NOT NULL,
    email TEXT NOT NULL,
    idType TEXT NOT NULL,
    idNumber TEXT NOT NULL,
    purposeOfVisit TEXT NOT NULL,
    otherAgenda TEXT,
    consentAccepted INTEGER NOT NULL,
    ocrReviewed INTEGER NOT NULL,
    faceVerificationStatus TEXT NOT NULL,
    registrationStatus TEXT NOT NULL,
    visitorPassNumber TEXT,
    qrStatus TEXT NOT NULL,
    expirationTime TEXT,
    checkoutStatus TEXT NOT NULL,
    checkoutRequestedAt TEXT,
    timeIn TEXT,
    timeOut TEXT,
    faceCheckoutVerificationStatus TEXT,
    createdAt TEXT NOT NULL
  );
`;
