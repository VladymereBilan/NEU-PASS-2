// Supabase Edge Function — deploy with `supabase functions deploy detect-face`.
// AWS credentials are read only from Edge Function secrets (the same
// AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY already configured for
// compare-faces/extract-id-text) and are never sent to the client.
//
// Scope: presence only — "is there a face in this photo at all" (Rekognition
// DetectFaces), not identity. It runs right after a visitor captures their
// face photo at registration, to block an obviously-not-a-face submission
// (a selfie of a wall, a pet, a blank photo) before it ever reaches a guard.
// It is NOT the identity check — that's the separate duplicate-registration
// search (compare against other open registrations' face photos) and the
// checkout-time compare-faces comparison, both of which need an actual face
// to compare against and would otherwise fail silently on a non-face photo.
import {
  DetectFacesCommand,
  RekognitionClient
} from "npm:@aws-sdk/client-rekognition@3";
import { createClient } from "npm:@supabase/supabase-js@2";

type DetectResult = {
  success: boolean;
  faceCount: number;
  reason?: string;
};

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function response(body: DetectResult, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResult(reason: string): DetectResult {
  return { success: false, faceCount: 0, reason };
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

  // A visitor may only run detection on their own just-uploaded face photo —
  // the visitor-faces bucket's path convention is "{auth.uid()}/{filename}"
  // (see admin-web/src/lib/visitorImageUpload.ts), so this also blocks one
  // visitor from probing another's photo via this function.
  if (!faceImagePath.startsWith(`${userData.user.id}/`)) {
    return response(errorResult("You may only scan your own face photo."), 403);
  }

  const { data: sourceFile, error: sourceError } = await clients.admin.storage
    .from("visitor-faces")
    .download(faceImagePath);
  if (sourceError || !sourceFile) {
    return response(errorResult("The stored face image could not be retrieved."));
  }

  const maxBytes = 5 * 1024 * 1024;
  try {
    const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
    if (sourceBytes.length > maxBytes) {
      return response(errorResult("Face image exceeds the 5 MB limit."), 400);
    }

    const client = new RekognitionClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    const result = await client.send(
      new DetectFacesCommand({ Image: { Bytes: sourceBytes } })
    );

    return response({ success: true, faceCount: result.FaceDetails?.length ?? 0 });
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    return response(errorResult(`AWS Rekognition face detection failed: ${name}.`));
  }
});
