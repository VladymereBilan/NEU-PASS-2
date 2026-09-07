import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import {
  FaceVerificationStatus,
  type FaceVerificationStatusType,
  prototypeMode
} from "../../src/services/FaceVerificationService";
import { detectFaces } from "../../src/services/FaceDetectionService";
import { addRegistration } from "../../src/services/PrototypeRegistrationStore";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import { uploadVisitorImage } from "../../src/lib/imageUpload";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";
import type { PressableInteractionState } from "../../src/types/PressableState";
import { FormScreen } from "../../src/components/FormScreen";
import { NEU_DARK } from "../../src/theme/brand";

export default function FacialVerificationScreen() {
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useRegistrationDraft();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [capturedUri, setCapturedUri] = useState(draft?.faceImageUri || "");
  const [status, setStatus] = useState<FaceVerificationStatusType>(
    draft?.faceVerificationStatus || FaceVerificationStatus.Pending
  );
  const [submitting, setSubmitting] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowCamera(false);
      };
    }, [])
  );

  const openCamera = async () => {
    // Real OCR and facial recognition will be implemented in Capstone 2.
    const result = permission?.granted
      ? permission
      : await requestPermission();

    if (result?.granted) {
      setStatusMessage("");
      setCameraReady(false);
      setCameraSessionKey((key) => key + 1);
      setShowCamera(true);
      return;
    }

    setShowCamera(false);
    setStatusMessage(
      "Camera permission was denied. You can still use a sample image."
    );
  };

  const capturePhoto = async () => {
    if (!cameraReady || !cameraRef.current) {
      setStatusMessage("Camera is still starting. Please wait a moment and try again.");
      return;
    }

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

      setCheckingFace(true);
      const { skipped, faceCount } = await detectFaces(photo.uri);
      setCheckingFace(false);

      if (!skipped && faceCount === 0) {
        setStatusMessage(
          "No face was detected in this photo — you can retake it, or continue if this is expected."
        );
      } else {
        setStatusMessage("Face image captured successfully.");
      }
    } catch {
      Alert.alert("Unable to capture face image. Please try again.");
    }
  };

  const retakePhoto = () => {
    setCapturedUri("");
    updateDraft({ faceImageUri: "", faceVerificationStatus: FaceVerificationStatus.Pending });
    setStatus(FaceVerificationStatus.Pending);
    setCameraReady(false);
    setCameraSessionKey((key) => key + 1);
    setShowCamera(true);
    setStatusMessage("");
  };

  const usePrototypeSample = () => {
    const sampleUri = "prototype://face-sample";
    setCapturedUri(sampleUri);
    updateDraft({ faceImageUri: sampleUri, faceVerificationStatus: prototypeMode() });
    setStatus(prototypeMode());
    setShowCamera(false);
    setStatusMessage("Sample image selected.");
  };

  const handleSubmit = async () => {
    if (!draft) {
      Alert.alert("Registration draft not found. Please start again.");
      router.replace("/");
      return;
    }

    if (!draft.idImageUri) {
      Alert.alert("Missing ID photo. Please go back and capture your ID.");
      return;
    }

    if (!capturedUri || !draft.faceImageUri) {
      Alert.alert("Please capture or select a face photo before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const [idImagePath, faceImagePath] = await Promise.all([
        uploadVisitorImage("visitor-ids", draft.idImageUri),
        uploadVisitorImage("visitor-faces", draft.faceImageUri)
      ]);

      const registration: VisitorRegistration = {
        id: `REG-${Date.now()}`,
        fullName: draft.fullName,
        address: draft.address,
        contactNumber: draft.contactNumber,
        email: draft.email,
        idType: draft.idType,
        idNumber: draft.idNumber,
        idImageUri: idImagePath,
        purposeOfVisit: draft.purposeOfVisit,
        otherAgenda: draft.otherAgenda,
        consentAccepted: draft.consentAccepted,
        ocrReviewed: draft.ocrReviewed,
        faceVerificationStatus: draft.faceVerificationStatus || status,
        faceImageUri: faceImagePath,
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
    <FormScreen>
      <Text style={styles.title}>Facial Verification</Text>
      <Text style={styles.body}>
        This step verifies that the visitor matches the submitted ID information.
      </Text>
      <Text style={styles.note}>
        Automatic face matching against your ID photo is currently under review — a guard will
        manually confirm your identity.
      </Text>

      <View style={styles.previewBox}>
        {capturedUri && capturedUri.startsWith("file") ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewText}>
            {capturedUri ? "Sample Image Selected" : "Face Image Preview"}
          </Text>
        )}
      </View>

      {checkingFace ? (
        <View style={styles.checkingRow}>
          <ActivityIndicator color={NEU_DARK.emerald} />
          <Text style={styles.scanningText}>Checking photo...</Text>
        </View>
      ) : statusMessage ? (
        <Text style={styles.status}>{statusMessage}</Text>
      ) : null}

      {!permission?.granted && !showCamera ? (
        <Text style={styles.permissionNote}>
          Camera access is required for live capture, but you can still use a sample image.
        </Text>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed, hovered }: PressableInteractionState) => [
            styles.secondaryButton,
            (pressed || hovered) && styles.secondaryButtonActive
          ]}
          onPress={openCamera}
        >
          <Text style={styles.secondaryText}>Open Camera</Text>
        </Pressable>
        <Pressable
          style={({ pressed, hovered }: PressableInteractionState) => [
            styles.secondaryButton,
            (pressed || hovered) && styles.secondaryButtonActive
          ]}
          onPress={usePrototypeSample}
        >
          <Text style={styles.secondaryText}>Use Sample Image</Text>
        </Pressable>
      </View>

      {showCamera ? (
        <View style={styles.cameraCard}>
          <CameraView
            key={cameraSessionKey}
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={() => setCameraReady(true)}
            onMountError={(error) => {
              setCameraReady(false);
              setShowCamera(false);
              setStatusMessage(`Unable to start camera: ${error.message}`);
            }}
          />
          <Pressable
            style={({ pressed, hovered }: PressableInteractionState) => [
              styles.primaryButton,
              !cameraReady && styles.primaryButtonDisabled,
              (pressed || hovered) && cameraReady && styles.primaryButtonActive
            ]}
            onPress={capturePhoto}
            disabled={!cameraReady}
          >
            <Text style={styles.primaryText}>
              {cameraReady ? "Capture Photo" : "Starting Camera..."}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {capturedUri ? (
        <Pressable
          style={({ pressed, hovered }: PressableInteractionState) => [
            styles.secondaryButton,
            (pressed || hovered) && styles.secondaryButtonActive
          ]}
          onPress={retakePhoto}
        >
          <Text style={styles.secondaryText}>Retake Photo</Text>
        </Pressable>
      ) : null}

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusValue}>{status}</Text>
      </View>

      <Pressable
        style={({ pressed, hovered }: PressableInteractionState) => [
          styles.primaryButton,
          submitting && styles.primaryButtonDisabled,
          (pressed || hovered) && !submitting && styles.primaryButtonActive
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.primaryText}>
          {submitting ? "Submitting..." : "Submit for Guard Verification"}
        </Text>
      </Pressable>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  body: {
    fontSize: 14,
    color: NEU_DARK.textMuted,
    lineHeight: 20
  },
  note: {
    fontSize: 12,
    color: NEU_DARK.textFaint,
    lineHeight: 18
  },
  previewBox: {
    height: 180,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewText: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  },
  status: {
    fontSize: 13,
    color: NEU_DARK.white,
    fontWeight: "600"
  },
  checkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  scanningText: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  },
  permissionNote: {
    fontSize: 13,
    color: NEU_DARK.amber,
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
    borderRadius: 14,
    overflow: "hidden"
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: NEU_DARK.emeraldStrong,
    alignItems: "center"
  },
  primaryButtonActive: {
    backgroundColor: "#0C8A62"
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryText: {
    color: "#04150C",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center"
  },
  secondaryButtonActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  secondaryText: {
    color: NEU_DARK.white,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center"
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.border
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_DARK.textMuted
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_DARK.white
  }
});
