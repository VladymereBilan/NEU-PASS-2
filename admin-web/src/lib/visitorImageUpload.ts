import { createClient } from "@/lib/supabase/client";

export type ImageBucket = "visitor-ids" | "visitor-faces";

// Browser port of the root Expo app's src/lib/imageUpload.ts::uploadVisitorImage —
// same bucket/path convention ({auth.uid()}/{timestamp}-{random}.jpg, required
// by the storage RLS policies), but takes a browser File (from an
// <input type="file"> capture) instead of a local file:// URI.
export async function uploadVisitorImage(bucket: ImageBucket, file: File): Promise<string> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must have an active session to upload an image.");
  }

  const bytes = await file.arrayBuffer();
  const path = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type || "image/jpeg" });

  if (uploadError) throw new Error(uploadError.message);

  return path;
}
