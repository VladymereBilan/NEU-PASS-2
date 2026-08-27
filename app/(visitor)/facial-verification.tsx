import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import BackButton from "../../src/components/BackButton";
import {
  FaceVerificationStatus,
  type FaceVerificationStatusType,
  prototypeMode
} from "../../src/services/FaceVerificationService";
import { addRegistration } from "../../src/services/PrototypeRegistrationStore";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function FacialVerificationScreen() {
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useRegistrationDraft();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedUri, setCapturedUri] = useState(draft?.faceImageUri || "");
  const [status, setStatus] = useState<FaceVerificationStatusType>(
    draft?.faceVerificationStatus || FaceVerificationStatus.Pending
  );
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const openCamera = async () => {
    // Real OCR and facial recognition will be implemented in Capstone 2.
    const result = permission?.granted
      ? permission
      : await requestPermission();

    if (result?.granted) {
      setStatusMessage("");
      setShowCamera(true);
      return;
    }

    setShowCamera(false);
    setStatusMessage(
      "Camera permission was denied. You can still use the prototype sample."
    );
  };

  const capturePhoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
        skipProcessing: true
      });

      if (!photo?.uri) {
        return;
      }

      setCapturedUri(photo.uri);
      updateDraft({ faceImageUri: photo.uri });
      setShowCamera(false);
      setStatus(prototypeMode());
      updateDraft({ faceVerificationStatus: prototypeMode() });
      setStatusMessage("Face image captured successfully.");
    } catch {
      Alert.alert("Unable to capture face image. Please try again.");
    }
  };

  const retakePhoto = () => {
    setCapturedUri("");
    updateDraft({ faceImageUri: "" });
    setShowCamera(true);
    setStatusMessage("");
  };

  const usePrototypeSample = () => {
    const sampleUri = "prototype://face-sample";
    setCapturedUri(sampleUri);
    updateDraft({ faceImageUri: sampleUri, faceVerificationStatus: prototypeMode() });
    setStatus(prototypeMode());
    setShowCamera(false);
    setStatusMessage("Prototype sample selected.");
  };

  const handleSubmit = async () => {
    if (!draft) {
      Alert.alert("Registration draft not found. Please start again.");
      router.replace("/");
      return;
    }

    const registration: VisitorRegistration = {
      id: `REG-${Date.now()}`,
      fullName: draft.fullName,
      address: draft.address,
      contactNumber: draft.contactNumber,
      email: draft.email,
      idType: draft.idType,
      idNumber: draft.idNumber,
      idImageUri: draft.idImageUri,
      purposeOfVisit: draft.purposeOfVisit,
      otherAgenda: draft.otherAgenda,
      consentAccepted: draft.consentAccepted,
      ocrReviewed: draft.ocrReviewed,
      faceVerificationStatus: draft.faceVerificationStatus || status,
      faceImageUri: draft.faceImageUri,
      registrationStatus: "Pending",
      timeIn: "",
      visitorPassNumber: "",
      qrStatus: "Inactive",
      expirationTime: "",
      checkoutStatus: "None",
      checkoutRequestedAt: "",
      timeOut: "",
      faceCheckoutVerificationStatus: "",
      createdAt: new Date().toISOString()
    };

    try {
      setSubmitting(true);
      await addRegistration(registration);
      clearDraft();
      Alert.alert("Registration submitted for guard verification.");
      router.replace("/(visitor)/home");
    } catch (error) {
      Alert.alert("Unable to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>Facial Verification</Text>
        <Text style={styles.body}>
          This step verifies that the visitor matches the submitted ID
          information.
        </Text>
        <Text style={styles.note}>
          Real OCR and facial recognition will be implemented in Capstone 2.
        </Text>

        <View style={styles.previewBox}>
          {capturedUri && capturedUri.startsWith("file") ? (
            <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewText}>
              {capturedUri ? "Prototype Sample Selected" : "Face Image Preview"}
            </Text>
          )}
        </View>

        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

        {!permission?.granted && !showCamera ? (
          <Text style={styles.permissionNote}>
            Camera access is required for live capture, but you can still use the
            prototype sample.
          </Text>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={openCamera}>
            <Text style={styles.secondaryText}>Open Camera</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={usePrototypeSample}>
            <Text style={styles.secondaryText}>Use Prototype Sample</Text>
          </Pressable>
        </View>

        {showCamera ? (
          <View style={styles.cameraCard}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
            <Pressable style={styles.primaryButton} onPress={capturePhoto}>
              <Text style={styles.primaryText}>Capture Photo</Text>
            </Pressable>
          </View>
        ) : null}

        {capturedUri ? (
          <Pressable style={styles.secondaryButton} onPress={retakePhoto}>
            <Text style={styles.secondaryText}>Retake Photo</Text>
          </Pressable>
        ) : null}

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryText}>
            {submitting ? "Submitting..." : "Submit for Guard Verification"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef2ff"
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    gap: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  body: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20
  },
  note: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18
  },
  previewBox: {
    height: 180,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewText: {
    fontSize: 13,
    color: "#6b7280"
  },
  status: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600"
  },
  permissionNote: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 19
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12
  },
  cameraCard: {
    gap: 12
  },
  camera: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden"
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center"
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827"
  }
});
