import { createClient } from "@/lib/supabase/client";

export type ImageBucket = "visitor-ids" | "visitor-faces";

async function normalizeFaceImage(file: File): Promise<Blob> {
  if (file.type === "image/jpeg" && file.size <= 4 * 1024 * 1024) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This image format could not be read by the browser."));
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) throw new Error("Unable to convert the face image to JPEG.");
    return blob;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

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

  const uploadFile = bucket === "visitor-faces" ? await normalizeFaceImage(file) : file;
  const bytes = await uploadFile.arrayBuffer();
  const path = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: bucket === "visitor-faces" ? "image/jpeg" : file.type || "image/jpeg" });

  if (uploadError) throw new Error(uploadError.message);

  return path;
}
