import { supabase } from "./supabaseClient";

export type ImageBucket = "visitor-ids" | "visitor-faces";

// Historical visitor-registration rows (from before registration moved to
// admin-web) can still hold this "Use Prototype Sample" sentinel instead of
// a real Storage path — kept here purely so getVisitorImageSignedUrl below
// still renders those old rows as a text placeholder instead of erroring.
const PROTOTYPE_SAMPLE_PREFIX = "prototype://";

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
