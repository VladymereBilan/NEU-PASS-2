import FaceDetection from "@react-native-ml-kit/face-detection";

// The "Use Prototype Sample" affordance never produces a real file to run
// detection against — never actually reachable from capturePhoto today, but
// guarded defensively the same way OcrService/imageUpload are, in case this
// gets reused from another call site later.
const PROTOTYPE_SAMPLE_PREFIX = "prototype://";

export type FaceDetectionResult = {
  // true when detection was skipped (prototype-sample path, or a native
  // failure) — callers should treat this as "unknown", not "no face found".
  skipped: boolean;
  faceCount: number;
};

export async function detectFaces(imageUri: string): Promise<FaceDetectionResult> {
  if (!imageUri || imageUri.startsWith(PROTOTYPE_SAMPLE_PREFIX)) {
    return { skipped: true, faceCount: 0 };
  }

  try {
    const faces = await FaceDetection.detect(imageUri, { performanceMode: "fast" });
    return { skipped: false, faceCount: faces.length };
  } catch {
    return { skipped: true, faceCount: 0 };
  }
}
