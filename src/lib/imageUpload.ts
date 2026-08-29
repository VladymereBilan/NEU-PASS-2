import { File } from "expo-file-system";
import { supabase } from "./supabaseClient";

export type ImageBucket = "visitor-ids" | "visitor-faces";

// The "Use Prototype Sample" affordance has no real local file to upload —
// it's a sentinel string, not a file:// URI. Passed through unchanged so it
// keeps rendering as a text placeholder wherever it's shown, matching the
// existing id-capture/facial-verification preview behavior.
const PROTOTYPE_SAMPLE_PREFIX = "prototype://";

// Uploads a locally-captured photo to the given private bucket under the
// current user's own folder (required by the bucket's storage RLS policy)
// and returns the Storage object path to persist in id_image_path/
// face_image_path. A prototype-sample sentinel is returned as-is.
export async function uploadVisitorImage(
  bucket: ImageBucket,
  localUri: string
): Promise<string> {
  if (!localUri || localUri.startsWith(PROTOTYPE_SAMPLE_PREFIX)) {
    return localUri;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to upload an image.");
  }

  const file = new File(localUri);
  const bytes = await file.arrayBuffer();
  const path = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: "image/jpeg" });

  if (uploadError) throw new Error(uploadError.message);

  return path;
}

// Resolves a short-lived signed URL for a guard/admin to view a private
// bucket object. Returns null for an empty path or a prototype-sample
// sentinel (nothing to fetch).
export async function getVisitorImageSignedUrl(
  bucket: ImageBucket,
  path: string,
  expirySeconds = 300
): Promise<string | null> {
  if (!path || path.startsWith(PROTOTYPE_SAMPLE_PREFIX)) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expirySeconds);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
