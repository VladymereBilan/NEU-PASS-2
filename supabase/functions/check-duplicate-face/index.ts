// Supabase Edge Function — deploy with `supabase functions deploy check-duplicate-face`.
// AWS credentials are read only from Edge Function secrets (the same ones
// already configured for compare-faces/extract-id-text/detect-face) and are
// never sent to the client.
//
// Scope: called from submitVisitorRegistration (admin-web) right before a
// new registration is inserted, to catch the case a plain id_number unique
// check can't: the same physical person registering a second time under a
// different ID document from a fresh anonymous session (nothing else ties
// two anonymous sessions to the same person). Compares the new face photo
// against every currently Pending/Active registration's stored face photo —
// on a high-confidence match, the caller rejects the new registration with
// the same "already has an open registration" treatment already used for a
// duplicate id_number, rather than silently letting a second registration
// through.
import {
  CompareFacesCommand,
  RekognitionClient
} from "npm:@aws-sdk/client-rekognition@3";
import { createClient } from "npm:@supabase/supabase-js@2";

type DuplicateCheckResult = {
  success: boolean;
  duplicate: boolean;
  similarity: number | null;
  reason?: string;
};

// Bounds worst-case concurrent Storage downloads + Rekognition calls (all
// run in parallel — see below) if the open-registrations list ever grows
// unexpectedly large. Comfortably above any realistic concurrent-open-visit
// count for a single university gate.
const MAX_CANDIDATES = 50;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function response(body: DuplicateCheckResult, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResult(reason: string): DuplicateCheckResult {
  return { success: false, duplicate: false, similarity: null, reason };
}

function configuredThreshold(): number {
  const raw = Deno.env.get("FACE_MATCH_THRESHOLD");
  if (!raw || raw.trim() === "") return 80;
  const configured = Number(raw);
  return Number.isFinite(configured) ? configured : 80;
}

function bestSimilarity(matches: Array<{ Similarity?: number }> | undefined): number | null {
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
    return response(errorResult("Method not allowed."), 405);
  }

  const region = Deno.env.get("AWS_REGION");
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

  if (!region || !accessKeyId || !secretAccessKey) {
    return response(errorResult("AWS Rekognition is not configured."));
  }

  const clients = supabaseClients(request);
  if (!clients) {
    return response(errorResult("Request authentication is not configured."), 401);
  }

  const { data: userData, error: userError } = await clients.caller.auth.getUser();
  if (userError || !userData.user) {
    return response(errorResult("An active session is required."), 401);
  }

  let body: { faceImagePath?: unknown };
  try {
    body = await request.json();
  } catch {
    return response(errorResult("Invalid request body."), 400);
  }

  const faceImagePath = typeof body.faceImagePath === "string" ? body.faceImagePath : "";
  if (!faceImagePath) {
    return response(errorResult("faceImagePath is required."), 400);
  }

  // Same ownership scoping as detect-face — a visitor may only run this
  // check against their own just-uploaded face photo.
  if (!faceImagePath.startsWith(`${userData.user.id}/`)) {
    return response(errorResult("You may only check your own face photo."), 403);
  }

  const threshold = configuredThreshold();

  const { data: newPhoto, error: newPhotoError } = await clients.admin.storage
    .from("visitor-faces")
    .download(faceImagePath);
  if (newPhotoError || !newPhoto) {
    return response(errorResult("The stored face image could not be retrieved."));
  }

  // Only registrations still open (not yet checked out / not rejected) are
  // relevant — a completed visit from last month matching this face is a
  // legitimate returning visitor, not a duplicate-in-progress.
  const { data: openRegistrations, error: queryError } = await clients.admin
    .from("visitor_registrations")
    .select("face_image_path")
    .in("registration_status", ["Pending", "Active"])
    .not("face_image_path", "is", null)
    .limit(MAX_CANDIDATES);

  if (queryError) {
    return response(errorResult(`Unable to look up open registrations: ${queryError.message}`));
  }
  if (!openRegistrations || openRegistrations.length === 0) {
    return response({ success: true, duplicate: false, similarity: null });
  }

  const maxBytes = 5 * 1024 * 1024;
  try {
    const newBytes = new Uint8Array(await newPhoto.arrayBuffer());
    if (newBytes.length > maxBytes) {
      return response(errorResult("Face image exceeds the 5 MB limit."), 400);
    }

    const client = new RekognitionClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });

    // Run comparisons concurrently — sequential downloads+CompareFaces calls
    // for even a few dozen open registrations would leave the visitor's
    // submit button hanging for many seconds. A single candidate's failure
    // (unreadable stored photo, no detectable face in it, etc.) resolves to
    // 0 similarity rather than rejecting, so it never aborts the others.
    const candidateSimilarities = await Promise.all(
      (openRegistrations as { face_image_path: string }[])
        // Comparing against the visitor's own not-yet-inserted registration
        // never happens (this runs before insert) — skipped defensively.
        .filter((candidate) => candidate.face_image_path !== faceImagePath)
        .map(async (candidate): Promise<number> => {
          const { data: candidatePhoto, error: candidateError } = await clients.admin.storage
            .from("visitor-faces")
            .download(candidate.face_image_path);
          if (candidateError || !candidatePhoto) return 0;

          const candidateBytes = new Uint8Array(await candidatePhoto.arrayBuffer());
          if (candidateBytes.length > maxBytes) return 0;

          try {
            const result = await client.send(
              new CompareFacesCommand({
                SourceImage: { Bytes: newBytes },
                TargetImage: { Bytes: candidateBytes },
                SimilarityThreshold: 0
              })
            );
            return bestSimilarity(result.FaceMatches) ?? 0;
          } catch {
            return 0;
          }
        })
    );

    const bestMatch = candidateSimilarities.length > 0 ? Math.max(...candidateSimilarities) : 0;

    return response({
      success: true,
      duplicate: bestMatch >= threshold,
      similarity: bestMatch > 0 ? bestMatch : null
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    return response(errorResult(`AWS Rekognition duplicate check failed: ${name}.`));
  }
});
