// Supabase Edge Function — deploy with `supabase functions deploy extract-id-text`.
// AWS credentials are read only from Edge Function secrets (the same
// AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY already configured for
// compare-faces) and are never sent to the client.
//
// Scope: raw OCR only (Textract DetectDocumentText). It returns the text
// lines Textract found on the ID photo — it does not attempt to map them to
// specific form fields (name/address/ID number), since the ID Type list here
// is almost entirely Philippine government IDs and Textract's specialized
// AnalyzeID is trained on US driver's licenses/passports, not these formats.
// Field-mapping heuristics belong in the caller, informed by real samples.
import {
  DetectDocumentTextCommand,
  TextractClient
} from "npm:@aws-sdk/client-textract@3";
import { createClient } from "npm:@supabase/supabase-js@2";

type ExtractResult = {
  success: boolean;
  lines: string[];
  reason?: string;
};

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function response(body: ExtractResult, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResult(reason: string): ExtractResult {
  return { success: false, lines: [], reason };
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
    return response(errorResult("AWS Textract is not configured."));
  }

  const clients = supabaseClients(request);
  if (!clients) {
    return response(errorResult("Request authentication is not configured."), 401);
  }

  const { data: userData, error: userError } = await clients.caller.auth.getUser();
  if (userError || !userData.user) {
    return response(errorResult("An active session is required."), 401);
  }

  let body: { idImagePath?: unknown };
  try {
    body = await request.json();
  } catch {
    return response(errorResult("Invalid request body."), 400);
  }

  const idImagePath = typeof body.idImagePath === "string" ? body.idImagePath : "";
  if (!idImagePath) {
    return response(errorResult("idImagePath is required."), 400);
  }

  // A visitor may only OCR their own just-uploaded ID photo — the
  // visitor-ids bucket's path convention is "{auth.uid()}/{filename}"
  // (see admin-web/src/lib/visitorImageUpload.ts), so this also blocks one
  // visitor from probing another's ID via this function.
  if (!idImagePath.startsWith(`${userData.user.id}/`)) {
    return response(errorResult("You may only extract text from your own ID photo."), 403);
  }

  const { data: sourceFile, error: sourceError } = await clients.admin.storage
    .from("visitor-ids")
    .download(idImagePath);
  if (sourceError || !sourceFile) {
    return response(errorResult("The stored ID image could not be retrieved."));
  }

  const maxBytes = 5 * 1024 * 1024;
  try {
    const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
    if (sourceBytes.length > maxBytes) {
      return response(errorResult("ID image exceeds the 5 MB limit."), 400);
    }

    const client = new TextractClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    const result = await client.send(
      new DetectDocumentTextCommand({ Document: { Bytes: sourceBytes } })
    );

    const lines = (result.Blocks ?? [])
      .filter((block) => block.BlockType === "LINE" && typeof block.Text === "string")
      .map((block) => block.Text as string);

    return response({ success: true, lines });
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    return response(errorResult(`AWS Textract extraction failed: ${name}.`));
  }
});
