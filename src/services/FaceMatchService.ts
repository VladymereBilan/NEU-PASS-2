import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
import { Asset } from "expo-asset";
import { Image } from "react-native";
import { decode as decodeJpeg } from "jpeg-js";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { loadTensorflowModel, type TensorflowModel } from "react-native-fast-tflite";
import type { FaceCheckoutVerificationStatus } from "../types/VisitorRegistration";

// See assets/models/NOTICE.md for this model's provenance and license
// (InsightFace-lineage MobileFaceNet, non-commercial research use only —
// fine for this capstone, NOT fine to ship as-is in a real/commercial release).
const MODEL_INPUT_SIZE = 112;
const PROTOTYPE_SAMPLE_PREFIX = "prototype://";

// Cosine-similarity thresholds — starting points from commonly-cited
// MobileFaceNet ranges (~0.5-0.7 for "same person" depending on training/
// preprocessing), NOT validated against this app's actual camera/lighting.
// Expect to retune these against real capture pairs on the target device.
const MATCH_THRESHOLD = 0.6;
const NO_MATCH_THRESHOLD = 0.35;

// Deliberately stricter than MATCH_THRESHOLD: this is the bar for letting the
// system complete checkout without a guard confirming, so it should only ever
// fire on the clearest matches. Everything below it — including an ordinary
// "Matched" suggestion in the 0.6-0.8 band, and any "Not Matched" — still
// requires a guard to review and tap Complete Checkout, since these
// thresholds aren't validated against real capture conditions yet and a bad
// auto-approval is worse than asking a guard to double-check.
const AUTO_COMPLETE_THRESHOLD = 0.8;

export type FaceMatchResult = {
  // null when a face couldn't be embedded on either side (no face detected,
  // a prototype-sample path, or a native failure) — never guess in that case.
  score: number | null;
  suggestion: FaceCheckoutVerificationStatus;
  // true only for a score confidently above AUTO_COMPLETE_THRESHOLD — the
  // sole signal callers should use to skip guard confirmation.
  autoComplete: boolean;
};

let modelPromise: Promise<TensorflowModel> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      // require()'s raw asset-module result only resolves correctly while
      // Metro is serving the bundle live (dev) — a standalone release build
      // needs the asset pre-resolved to a real local file first, or
      // loadTensorflowModel throws "java.net.MalformedURLException: no
      // protocol" trying to read Android's bundled-resource reference directly.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = Asset.fromModule(require("../../assets/models/mobilefacenet.tflite"));
      await asset.downloadAsync();
      return loadTensorflowModel({ url: asset.localUri as string }, []);
    })();
  }
  return modelPromise;
}

export async function compareFaces(
  referenceImageUri: string,
  liveImageUri: string
): Promise<FaceMatchResult> {
  if (
    !referenceImageUri ||
    !liveImageUri ||
    referenceImageUri.startsWith(PROTOTYPE_SAMPLE_PREFIX) ||
    liveImageUri.startsWith(PROTOTYPE_SAMPLE_PREFIX)
  ) {
    return { score: null, suggestion: "Manual Review", autoComplete: false };
  }

  try {
    // Run these one at a time, not via Promise.all — the TFLite interpreter
    // behind getModel() is a single shared instance, and TFLite explicitly
    // documents Interpreter.run()/Invoke() as not thread-safe for concurrent
    // calls on the same instance.
    const referenceEmbedding = await embedFace(referenceImageUri);
    const liveEmbedding = await embedFace(liveImageUri);

    if (!referenceEmbedding || !liveEmbedding) {
      return { score: null, suggestion: "Manual Review", autoComplete: false };
    }

    const score = cosineSimilarity(referenceEmbedding, liveEmbedding);
    const suggestion: FaceCheckoutVerificationStatus =
      score >= MATCH_THRESHOLD ? "Matched" : score <= NO_MATCH_THRESHOLD ? "Not Matched" : "Manual Review";

    return { score, suggestion, autoComplete: score >= AUTO_COMPLETE_THRESHOLD };
  } catch {
    return { score: null, suggestion: "Manual Review", autoComplete: false };
  } finally {
    clearFaceMatchCache();
  }
}

// ensureLocalUri downloads the visitor's private reference photo into the
// guard's app cache to run detection/embedding on it — don't let that
// biometric photo linger on disk once this comparison is done.
function clearFaceMatchCache(): void {
  try {
    const destination = new Directory(Paths.cache, "face-match");
    if (destination.exists) destination.delete();
  } catch {
    // Best-effort cleanup — a leftover cache file isn't worth failing the match over.
  }
}

// expo-image-manipulator's documented support is for local files/data URIs,
// not arbitrary remote URLs — the reference photo comes in as a Supabase
// signed https:// URL, so download it to a local cache file first rather
// than assume ImageManipulator can fetch it directly.
async function ensureLocalUri(uri: string): Promise<string> {
  if (!uri.startsWith("http")) return uri;

  const destination = new Directory(Paths.cache, "face-match");
  if (!destination.exists) destination.create({ intermediates: true, idempotent: true });

  const file = await File.downloadFileAsync(uri, destination);
  return file.uri;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function embedFace(rawImageUri: string): Promise<Float32Array | null> {
  const imageUri = await ensureLocalUri(rawImageUri);
  const faces = await FaceDetection.detect(imageUri, { performanceMode: "accurate" }).catch(() => []);
  if (faces.length === 0) return null;

  const face = faces.reduce((largest, current) =>
    current.frame.width * current.frame.height > largest.frame.width * largest.frame.height
      ? current
      : largest
  );

  // The face's own frame is always in-bounds, but the padded box around it
  // can extend past the image edges (e.g. a close-up selfie with the face
  // near the top/side of the frame) — clamp against the real image size or
  // the native crop throws "y + height must be <= bitmap.height()".
  //
  // The crop is forced SQUARE here (not just the face's raw w x h box):
  // .resize() below stretches independently on each axis to hit 112x112,
  // so a non-square crop gets non-uniformly distorted. The reference photo
  // (portrait-shaped face box) and a live capture (landscape-shaped box)
  // were being squashed in different directions, which measurably hurt
  // same-person similarity scores — a real same-person comparison was
  // landing at ~26%, well under the "Not Matched" cutoff.
  const { width: imageWidth, height: imageHeight } = await getImageSize(imageUri);
  const faceCenterX = face.frame.left + face.frame.width / 2;
  const faceCenterY = face.frame.top + face.frame.height / 2;
  const rawSize = Math.max(face.frame.width, face.frame.height) * 1.4;
  const cropSize = Math.min(rawSize, imageWidth, imageHeight);
  const cropX = Math.round(Math.min(Math.max(0, faceCenterX - cropSize / 2), imageWidth - cropSize));
  const cropY = Math.round(Math.min(Math.max(0, faceCenterY - cropSize / 2), imageHeight - cropSize));
  const cropWidth = Math.round(cropSize);
  const cropHeight = Math.round(cropSize);

  // Crop+resize natively first (fast) so the pure-JS jpeg-js decode below
  // only ever has to process a small ~112px image, not a multi-megapixel
  // phone photo.
  const manipulated = await ImageManipulator.manipulate(imageUri)
    .crop({ originX: cropX, originY: cropY, width: cropWidth, height: cropHeight })
    .resize({ width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE })
    .renderAsync();
  const saved = await manipulated.saveAsync({ format: SaveFormat.JPEG, compress: 1 });

  const file = new File(saved.uri);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeJpeg(bytes, { useTArray: true });

  const inputBuffer = rgbaToNormalizedRgb(decoded.data, decoded.width, decoded.height);

  const model = await getModel();
  const outputs = await model.run([inputBuffer]);
  // outputs[0] is an ArrayBuffer, and `new Float32Array(arrayBuffer)` only
  // creates a *view* onto it, not a copy. The native TFLite binding reuses
  // its internal output buffer across run() calls (a standard zero-copy
  // optimization), so without slice()-ing here, the very next embedFace()
  // call silently overwrites the memory this "result" still just points at
  // — both embeddings end up reading the same (latest) data, so every
  // comparison scored a perfect 1.0 regardless of the two actual photos.
  return new Float32Array(outputs[0].slice(0));
}

// jpeg-js decodes to RGBA (4 bytes/pixel); MobileFaceNet expects RGB
// normalized to roughly [-1, 1], the standard InsightFace-lineage
// preprocessing convention. Not confirmed against this exact file's own
// conversion script — a real candidate to revisit during threshold tuning
// if match scores look systematically off.
function rgbaToNormalizedRgb(rgba: Uint8Array, width: number, height: number): ArrayBuffer {
  const pixelCount = width * height;
  const out = new Float32Array(pixelCount * 3);

  for (let i = 0; i < pixelCount; i++) {
    out[i * 3] = (rgba[i * 4] - 127.5) / 127.5;
    out[i * 3 + 1] = (rgba[i * 4 + 1] - 127.5) / 127.5;
    out[i * 3 + 2] = (rgba[i * 4 + 2] - 127.5) / 127.5;
  }

  return out.buffer;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
