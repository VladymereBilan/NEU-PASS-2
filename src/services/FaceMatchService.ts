import { Directory, File, Paths } from "expo-file-system";
import type { FaceCheckoutVerificationStatus } from "../types/VisitorRegistration";
import { supabase } from "../lib/supabaseClient";

export type FaceMatchResult = {
  success: boolean;
  provider: "aws_rekognition";
  score: number | null;
  threshold: number | null;
  suggestion: FaceCheckoutVerificationStatus;
  autoComplete: boolean;
  result: "MATCHED" | "UNMATCHED" | "ERROR";
  reason?: string;
};

type CompareFacesResponse = {
  success: boolean;
  provider: "aws_rekognition";
  similarity: number | null;
  threshold: number | null;
  matched: boolean;
  result: "MATCHED" | "UNMATCHED" | "ERROR";
  reason?: string;
};

const localCompareFacesUrl = process.env.EXPO_PUBLIC_COMPARE_FACES_URL?.replace(/\/$/, "");

function errorResult(reason: string): FaceMatchResult {
  return {
    success: false,
    provider: "aws_rekognition",
    score: null,
    threshold: null,
    suggestion: "Manual Review",
    autoComplete: false,
    result: "ERROR",
    reason
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let encoded = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    encoded += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(encoded);
}

async function imageUriToBase64(uri: string): Promise<string> {
  const localUri = await ensureLocalUri(uri);
  const file = new File(localUri);
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
}

async function invokeCompareFaces(
  body: { visitorId: string; targetImageBase64: string }
): Promise<{ data: CompareFacesResponse | null; error: Error | null }> {
  if (!localCompareFacesUrl) {
    const { data, error } = await supabase.functions.invoke<CompareFacesResponse>(
      "compare-faces",
      { body }
    );
    return { data, error: error ? new Error(error.message) : null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { data: null, error: new Error("An authenticated guard session is required.") };
  }

  const response = await fetch(localCompareFacesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  let data: CompareFacesResponse | null = null;
  try {
    data = (await response.json()) as CompareFacesResponse;
  } catch {
    return { data: null, error: new Error(`Local compare-faces returned HTTP ${response.status}.`) };
  }

  if (!response.ok) {
    return { data, error: new Error(data.reason || `Local compare-faces returned HTTP ${response.status}.`) };
  }

  return { data, error: null };
}

async function ensureLocalUri(uri: string): Promise<string> {
  if (!uri.startsWith("http")) return uri;

  const destination = new Directory(Paths.cache, "face-match-aws");
  if (!destination.exists) destination.create({ intermediates: true, idempotent: true });

  return (await File.downloadFileAsync(uri, destination)).uri;
}

function clearFaceMatchCache(): void {
  try {
    const destination = new Directory(Paths.cache, "face-match-aws");
    if (destination.exists) destination.delete();
  } catch {
    // Cache cleanup is best effort and must not change the comparison result.
  }
}

export async function compareFaces(
  visitorId: string,
  liveImageUri: string
): Promise<FaceMatchResult> {
  if (!visitorId || !liveImageUri) {
    return errorResult("Missing visit identifier or live face image.");
  }

  try {
    const targetImageBase64 = await imageUriToBase64(liveImageUri);

    const { data, error } = await invokeCompareFaces({ visitorId, targetImageBase64 });

    if (error || !data) {
      return errorResult(error?.message || "Face comparison service unavailable.");
    }

    if (!data.success || data.result === "ERROR") {
      return {
        success: false,
        provider: "aws_rekognition",
        score: null,
        threshold: data.threshold,
        suggestion: "Manual Review",
        autoComplete: false,
        result: "ERROR",
        reason: data.reason || "Face comparison failed."
      };
    }

    const matched = data.result === "MATCHED" && data.matched;
    return {
      success: true,
      provider: "aws_rekognition",
      score: data.similarity,
      threshold: data.threshold,
      suggestion: matched ? "Matched" : "Not Matched",
      autoComplete: matched,
      result: matched ? "MATCHED" : "UNMATCHED",
      reason: data.reason
    };
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "Face comparison failed.");
  } finally {
    clearFaceMatchCache();
  }
}
