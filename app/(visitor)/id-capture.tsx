import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";

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
      "Camera permission was denied. You can still use the prototype sample."
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

  const retakePhoto = () => {
    setCapturedUri("");
    updateDraft({ idImageUri: "" });
    setCameraReady(false);
    setCameraSessionKey((key) => key + 1);
    setShowCamera(true);
    setStatusMessage("");
  };

  const usePrototypeSample = () => {
    const sampleUri = "prototype://id-sample";
    setCapturedUri(sampleUri);
    updateDraft({ idImageUri: sampleUri });
    setShowCamera(false);
    setStatusMessage("Prototype sample selected.");
  };

  const handleContinue = () => {
    router.push("/(visitor)/ocr-review");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>ID Capture</Text>
          <Text style={styles.body}>
            Capture or upload your valid ID for verification.
          </Text>
          <Text style={styles.note}>
            Real OCR and facial recognition will be implemented in Capstone 2.
          </Text>

          <View style={styles.previewBox}>
            {capturedUri && capturedUri.startsWith("file") ? (
              <Image source={{ uri: capturedUri }} style={styles.previewImage} />
            ) : (
              <Text style={styles.previewText}>
                {capturedUri ? "Prototype Sample Selected" : "ID Image Preview"}
              </Text>
            )}
          </View>

          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

          {!permission?.granted && !showCamera ? (
            <Text style={styles.permissionNote}>
              Camera access is required for live capture, but you can still use
              the prototype sample.
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
                style={[styles.primaryButton, !cameraReady && styles.primaryButtonDisabled]}
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
            <Pressable style={styles.secondaryButton} onPress={retakePhoto}>
              <Text style={styles.secondaryText}>Retake Photo</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryText}>Continue to OCR Review</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2ff"
  },
  content: {
    padding: 24
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
  }
});
