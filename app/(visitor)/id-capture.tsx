import { useCallback, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import type { PressableInteractionState } from "../../src/types/PressableState";
import { FormScreen } from "../../src/components/FormScreen";
import { NEU_DARK } from "../../src/theme/brand";

export default function IdCaptureScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [capturedUri, setCapturedUri] = useState(draft?.idImageUri || "");
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
      updateDraft({ idImageUri: photo.uri });
      setShowCamera(false);
      setStatusMessage("ID image captured successfully.");
    } catch {
      Alert.alert("Unable to capture ID image. Please try again.");
    }
  };

  const retakePhoto = async () => {
    setCapturedUri("");
    updateDraft({ idImageUri: "" });
    setStatusMessage("");
    await openCamera();
  };

  const usePrototypeSample = () => {
    const sampleUri = "prototype://id-sample";
    setCapturedUri(sampleUri);
    updateDraft({ idImageUri: sampleUri });
    setShowCamera(false);
    setStatusMessage("Sample image selected.");
  };

  const handleContinue = () => {
    if (!capturedUri) {
      setStatusMessage("Please capture or select an ID photo before continuing.");
      return;
    }
    router.push("/(visitor)/ocr-review");
  };

  return (
    <FormScreen>
      <Text style={styles.title}>ID Capture</Text>
      <Text style={styles.body}>Capture or upload your valid ID for verification.</Text>
      <View style={styles.previewBox}>
        {capturedUri && capturedUri.startsWith("file") ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewText}>
            {capturedUri ? "Sample Image Selected" : "ID Image Preview"}
          </Text>
        )}
      </View>

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

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
            facing="back"
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

      <Pressable
        style={({ pressed, hovered }: PressableInteractionState) => [
          styles.primaryButton,
          (pressed || hovered) && styles.primaryButtonActive
        ]}
        onPress={handleContinue}
      >
        <Text style={styles.primaryText}>Continue to OCR Review</Text>
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
  }
});
