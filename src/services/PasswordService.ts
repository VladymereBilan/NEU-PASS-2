import * as Crypto from "expo-crypto";

// Prototype-safe password handling for Capstone 1 only.
// Capstone 2 will replace this with backend authentication and real password hashing.
export async function hashPassword(password: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function verifyPassword(password: string, passwordDigest: string) {
  return (await hashPassword(password)) === passwordDigest;
}
