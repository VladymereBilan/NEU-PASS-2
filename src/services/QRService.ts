const PROTOTYPE_TOKEN = "NEU-PASS-PROTOTYPE";

type QRPayload = {
  visitorId: string;
  visitorPassNumber: string;
  timestamp: string;
  token: string;
};

export function generateQRValue(
  visitorId: string,
  visitorPassNumber: string
) {
  const payload: QRPayload = {
    visitorId,
    visitorPassNumber,
    timestamp: new Date().toISOString(),
    token: PROTOTYPE_TOKEN
  };

  return JSON.stringify(payload);
}

export function validateQRStatus(expirationTime: string) {
  if (!expirationTime) {
    return "Inactive";
  }

  const now = Date.now();
  const expiration = new Date(expirationTime).getTime();
  return now <= expiration ? "Active" : "Expired";
}
