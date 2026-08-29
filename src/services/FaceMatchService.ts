import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
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

export type FaceMatchResult = {
  // null when a face couldn't be embedded on either side (no face detected,
  // a prototype-sample path, or a native failure) — never guess in that case.
  score: number | null;
  suggestion: FaceCheckoutVerificationStatus;
};

let modelPromise: Promise<TensorflowModel> | null = null;

function getModel() {
  if (!modelPromise) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modelPromise = loadTensorflowModel(require("../../assets/models/mobilefacenet.tflite"), []);
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
    return { score: null, suggestion: "Manual Review" };
  }

  try {
    const [referenceEmbedding, liveEmbedding] = await Promise.all([
      embedFace(referenceImageUri),
      embedFace(liveImageUri)
    ]);

    if (!referenceEmbedding || !liveEmbedding) {
      return { score: null, suggestion: "Manual Review" };
    }

    const score = cosineSimilarity(referenceEmbedding, liveEmbedding);
    const suggestion: FaceCheckoutVerificationStatus =
      score >= MATCH_THRESHOLD ? "Matched" : score <= NO_MATCH_THRESHOLD ? "Not Matched" : "Manual Review";

    return { score, suggestion };
  } catch {
    return { score: null, suggestion: "Manual Review" };
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

async function embedFace(rawImageUri: string): Promise<Float32Array | null> {
  const imageUri = await ensureLocalUri(rawImageUri);
  const faces = await FaceDetection.detect(imageUri, { performanceMode: "accurate" }).catch(() => []);
  if (faces.length === 0) return null;

  const face = faces.reduce((largest, current) =>
    current.frame.width * current.frame.height > largest.frame.width * largest.frame.height
      ? current
      : largest
  );

  const padding = Math.round(Math.max(face.frame.width, face.frame.height) * 0.2);
  const cropX = Math.max(0, face.frame.left - padding);
  const cropY = Math.max(0, face.frame.top - padding);
  const cropWidth = face.frame.width + padding * 2;
  const cropHeight = face.frame.height + padding * 2;

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
  return new Float32Array(outputs[0]);
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
