export const CREATE_VISITOR_REGISTRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS visitor_registrations (
    id TEXT PRIMARY KEY NOT NULL,
    fullName TEXT NOT NULL,
    address TEXT NOT NULL,
    contactNumber TEXT NOT NULL,
    email TEXT NOT NULL,
    idType TEXT NOT NULL,
    idNumber TEXT NOT NULL,
    idImageUri TEXT,
    purposeOfVisit TEXT NOT NULL,
    otherAgenda TEXT,
    consentAccepted INTEGER NOT NULL,
    ocrReviewed INTEGER NOT NULL,
    faceVerificationStatus TEXT NOT NULL,
    faceImageUri TEXT,
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

export const CREATE_USER_ACCOUNTS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    accountType TEXT NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL,
    contactNumber TEXT NOT NULL,
    username TEXT NOT NULL,
    passwordDigest TEXT NOT NULL,
    accountStatus TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;
