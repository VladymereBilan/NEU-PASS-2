// Supabase Edge Function — deploy with `supabase functions deploy compare-faces`.
// AWS credentials are read only from Edge Function secrets and are never sent
// to the Expo client.
import {
  CompareFacesCommand,
  RekognitionClient
} from "npm:@aws-sdk/client-rekognition@3";
import { createClient } from "npm:@supabase/supabase-js@2";

type ComparisonResult = {
  success: boolean;
  provider: "aws_rekognition";
  similarity: number | null;
  threshold: number | null;
  matched: boolean;
  result: "MATCHED" | "UNMATCHED" | "ERROR";
  reason?: string;
};

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function response(body: ComparisonResult, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResult(reason: string, threshold: number | null): ComparisonResult {
  return {
    success: false,
    provider: "aws_rekognition",
    similarity: null,
    threshold,
    matched: false,
    result: "ERROR",
    reason
  };
}

function decodeBase64(value: unknown): Uint8Array | null {
  if (typeof value !== "string" || !value) return null;

  const base64 = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function configuredThreshold(): number {
  const raw = Deno.env.get("FACE_MATCH_THRESHOLD");
  if (!raw || raw.trim() === "") return 80;
  const configured = Number(raw);
  return Number.isFinite(configured) ? configured : 80;
}

function bestSimilarity(
  matches: Array<{ Similarity?: number }> | undefined
): number | null {
  const values = (matches ?? [])
    .map((match) => match.Similarity)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length > 0 ? Math.max(...values) : null;
}

function authorizationToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}

function supabaseClients(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = authorizationToken(request);

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) return null;

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return { caller, admin };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") {
    return response(errorResult("Method not allowed.", null), 405);
  }

  const threshold = configuredThreshold();
  const region = Deno.env.get("AWS_REGION");
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

  if (!region || !accessKeyId || !secretAccessKey) {
    return response(errorResult("AWS Rekognition is not configured.", threshold));
  }

  const clients = supabaseClients(request);
  if (!clients) {
    return response(errorResult("Request authentication is not configured.", threshold), 401);
  }

  const { data: userData, error: userError } = await clients.caller.auth.getUser();
  if (userError || !userData.user) {
    return response(errorResult("Authenticated guard is required.", threshold), 401);
  }

  const { data: profile, error: profileError } = await clients.admin
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (
    profileError ||
    profile?.account_type !== "guard" ||
    profile.account_status !== "Active"
  ) {
    return response(errorResult("An active guard account is required.", threshold), 403);
  }

  let body: { visitorId?: unknown; targetImageBase64?: unknown };
  try {
    body = await request.json();
  } catch {
    return response(errorResult("Invalid request body.", threshold), 400);
  }

  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  const targetBytes = decodeBase64(body.targetImageBase64);
  const maxBytes = 5 * 1024 * 1024;

  if (!visitorId || !targetBytes) {
    return response(errorResult("Invalid face image.", threshold), 400);
  }
  if (targetBytes.length > maxBytes) {
    return response(errorResult("Face image exceeds the 5 MB limit.", threshold), 400);
  }

  const { data: visit, error: visitError } = await clients.admin
    .from("visitor_registrations")
    .select("face_image_path, registration_status, checkout_status")
    .eq("id", visitorId)
    .maybeSingle();
  if (
    visitError ||
    !visit ||
    visit.registration_status !== "Active" ||
    visit.checkout_status === "Completed" ||
    !visit.face_image_path
  ) {
    return response(errorResult("The requested active visit has no valid reference face image.", threshold));
  }

  const { data: sourceFile, error: sourceError } = await clients.admin.storage
    .from("visitor-faces")
    .download(visit.face_image_path);
  if (sourceError || !sourceFile) {
    return response(errorResult("The stored Time-In face image could not be retrieved.", threshold));
  }

  try {
    const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
    if (sourceBytes.length > maxBytes) {
      return response(errorResult("Stored face image exceeds the 5 MB limit.", threshold), 400);
    }
    const client = new RekognitionClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    const result = await client.send(
      new CompareFacesCommand({
        SourceImage: { Bytes: sourceBytes },
        TargetImage: { Bytes: targetBytes },
        SimilarityThreshold: 0
      })
    );

    const similarity = bestSimilarity(result.FaceMatches);
    if (similarity !== null) {
      const matched = similarity >= threshold;
      return response({
        success: true,
        provider: "aws_rekognition",
        similarity,
        threshold,
        matched,
        result: matched ? "MATCHED" : "UNMATCHED"
      });
    }

    if (result.UnmatchedFaces && result.UnmatchedFaces.length > 0) {
      return response({
        success: true,
        provider: "aws_rekognition",
        similarity: null,
        threshold,
        matched: false,
        result: "UNMATCHED",
        reason: "Faces were detected, but Rekognition returned no similarity match."
      });
    }

    return response(errorResult("No detectable face was found in the supplied images.", threshold));
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    return response(errorResult(`AWS Rekognition comparison failed: ${name}.`, threshold));
  }
});