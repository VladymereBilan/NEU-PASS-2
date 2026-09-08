import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import {
  completeCheckout,
  getCheckoutRequests,
  getVisitorPassByVisitorId
} from "../../src/services/PrototypeRegistrationStore";
import { getExpirationStatus } from "../../src/services/ExpirationService";
import { getVisitorImageSignedUrl } from "../../src/lib/imageUpload";
import { compareFaces } from "../../src/services/FaceMatchService";
import { parseQRValue } from "../../src/services/QRService";
import { AppBackground } from "../../src/components/AppBackground";
import { NEU_DARK } from "../../src/theme/brand";
import type {
  FaceCheckoutVerificationStatus,
  VisitorRegistration
} from "../../src/types/VisitorRegistration";

type ScannerState = "idle" | "camera";

export default function CheckoutVerificationScreen() {
  const [requests, setRequests] = useState<VisitorRegistration[]>([]);
  const [faceUrls, setFaceUrls] = useState<Record<string, string | null>>({});
  const [selectedStatus, setSelectedStatus] = useState<
    Record<string, FaceCheckoutVerificationStatus>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMessage, setScanMessage] = useState("");
  const [scannedVisitor, setScannedVisitor] = useState<VisitorRegistration | null>(
    null
  );
  const [scannerBusy, setScannerBusy] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [liveCaptureFor, setLiveCaptureFor] = useState<string | null>(null);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, number | null>>({});
  const [refreshHovered, setRefreshHovered] = useState(false);
  const [scanHovered, setScanHovered] = useState(false);
  const [secondaryHovered, setSecondaryHovered] = useState(false);
  const [completeHovered, setCompleteHovered] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const liveCameraRef = useRef<any>(null);

  const loadFaceUrl = useCallback(async (registration: VisitorRegistration) => {
    const url = await getVisitorImageSignedUrl("visitor-faces", registration.faceImageUri).catch(
      () => null
    );
    setFaceUrls((prev) => ({ ...prev, [registration.id]: url }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCheckoutRequests();
      setRequests(data);
      void Promise.all(data.map(loadFaceUrl));
    } catch {
      setError("Unable to load checkout requests.");
    } finally {
      setLoading(false);
    }
  }, [loadFaceUrl]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh])
  );

  const filteredManualRequests = useMemo(() => {
    const query = manualQuery.trim().toLowerCase();
    if (!query) {
      return requests;
    }

    return requests.filter((request) => matchesManualQuery(request, query));
  }, [manualQuery, requests]);

  const handleSelect = (
    id: string,
    status: FaceCheckoutVerificationStatus
  ) => {
    setSelectedStatus((prev) => ({ ...prev, [id]: status }));
  };

  const handleComplete = async (
    id: string,
    statusOverride?: FaceCheckoutVerificationStatus,
    completionMessage = "Checkout completed."
  ) => {
    if (completingId) return;
    const status = statusOverride || selectedStatus[id] || "Manual Review";
    try {
      setCompletingId(id);
      await completeCheckout(id, status);
      await refresh();
      setScannedVisitor(null);
      setScanMessage("");
      Alert.alert(completionMessage);
    } catch {
      Alert.alert("Unable to complete checkout.");
    } finally {
      setCompletingId(null);
    }
  };

  const openLiveCapture = async (id: string) => {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result?.granted) {
      Alert.alert("Camera permission was denied. You can still select a status manually.");
      return;
    }
    setLiveCaptureFor(id);
  };

  const captureLivePhoto = async (id: string) => {
    if (!liveCameraRef.current) return;

    try {
      const photo = await liveCameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true
      });
      setLiveCaptureFor(null);
      if (!photo?.uri) return;

      // Re-fetch a fresh signed URL rather than reusing the one loaded at
      // refresh() time — that one can be several minutes old by the time the
      // guard finishes walking the visitor over and opening live capture,
      // and the signed URL only lives 5 minutes.
      const registration =
        requests.find((request) => request.id === id) ??
        (scannedVisitor?.id === id ? scannedVisitor : null);
      const referenceUrl = registration
        ? await getVisitorImageSignedUrl("visitor-faces", registration.faceImageUri).catch(() => null)
        : faceUrls[id];

      if (!referenceUrl) {
        Alert.alert("No reference photo available for this visitor — please select a status manually.");
        return;
      }

      setMatchingFor(id);
      const result = await compareFaces(referenceUrl, photo.uri);
      setMatchScores((prev) => ({ ...prev, [id]: result.score }));
      handleSelect(id, result.suggestion);

      if (result.autoComplete) {
        const similarityPercent = Math.round((result.score as number) * 100);
        await handleComplete(
          id,
          result.suggestion,
          `High-confidence match (${similarityPercent}% similarity) — checkout completed automatically.`
        );
      }
    } catch {
      Alert.alert("Unable to compare faces. Please select a status manually.");
    } finally {
      setMatchingFor(null);
    }
  };

  const openScanner = async () => {
    const result = permission?.granted ? permission : await requestPermission();

    if (!result?.granted) {
      setScannerState("idle");
      setScanMessage(
        "Camera permission was denied. You can continue with manual checkout."
      );
      return;
    }

    setScanMessage("");
    setScannerState("camera");
  };

  const closeScanner = () => {
    setScannerState("idle");
    setScannerBusy(false);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannerBusy) return;
    setScannerBusy(true);

    try {
      const payload = parseQRValue(data);
      if (!payload?.visitorId || !payload.visitorPassNumber) {
        setScannerState("idle");
        Alert.alert("Invalid or expired QR.");
        return;
      }

      const visitor = await getVisitorPassByVisitorId(payload.visitorId);
      if (
        !visitor ||
        visitor.registrationStatus !== "Active" ||
        visitor.visitorPassNumber !== payload.visitorPassNumber
      ) {
        setScannerState("idle");
        Alert.alert("Invalid or expired QR.");
        return;
      }

      if (visitor.checkoutStatus !== "Checkout Requested") {
        setScannerState("idle");
        Alert.alert(
          "This visitor has not requested checkout yet. Ask them to request checkout first."
        );
        return;
      }

      const expirationStatus = getExpirationStatus(visitor.expirationTime);
      setScannedVisitor(visitor);
      setSelectedStatus((prev) => ({
        ...prev,
        [visitor.id]: prev[visitor.id] || "Manual Review"
      }));

      if (expirationStatus === "Expired") {
        setSelectedStatus((prev) => ({ ...prev, [visitor.id]: "Manual Review" }));
        setScanMessage(
          "This QR is expired. Manual review is required before checkout."
        );
        Alert.alert(
          "Your visitor pass has expired. Please proceed to the guard for review."
        );
      } else {
        setScanMessage("QR scanned successfully.");
      }

      setScannerState("idle");
    } catch {
      setScannerState("idle");
      Alert.alert("Invalid or expired QR.");
    } finally {
      setScannerBusy(false);
    }
  };

  const manualLookup = async () => {
    const query = manualQuery.trim().toLowerCase();
    if (!query) {
      setScanMessage("Enter a name or pass number to search manually.");
      return;
    }

    const found = requests.find((request) => matchesManualQuery(request, query));

    if (!found) {
      setScanMessage("No matching checkout request found.");
      return;
    }

    setScannedVisitor(found);
    setSelectedStatus((prev) => ({
      ...prev,
      [found.id]: prev[found.id] || "Manual Review"
    }));
    setScanMessage("Manual visitor lookup loaded.");
  };

  const renderFaceMatchControls = (id: string) => {
    if (liveCaptureFor === id) {
      return (
        <View style={styles.cameraShell}>
          <CameraView key={id} ref={liveCameraRef} style={styles.camera} facing="front" />
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              (pressed || scanHovered) && styles.scanButtonActive
            ]}
            onPress={() => void captureLivePhoto(id)}
            onHoverIn={() => setScanHovered(true)}
            onHoverOut={() => setScanHovered(false)}
          >
            <Text style={[styles.scanButtonText, (scanHovered || false) && styles.scanButtonTextActive]}>Capture</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || secondaryHovered) && styles.secondaryButtonActive
            ]}
            onPress={() => setLiveCaptureFor(null)}
            onHoverIn={() => setSecondaryHovered(true)}
            onHoverOut={() => setSecondaryHovered(false)}
          >
            <Text style={[styles.secondaryText, (secondaryHovered || false) && styles.secondaryTextActive]}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (matchingFor === id) {
      return (
        <View style={styles.matchingRow}>
          <ActivityIndicator />
          <Text style={styles.matchingText}>Comparing faces...</Text>
        </View>
      );
    }

    return (
      <View style={styles.matchSection}>
        {matchScores[id] !== undefined ? (
          <Text style={styles.matchSuggestion}>
            {matchScores[id] === null
              ? "Couldn't compare automatically — please review manually."
              : `Suggested: ${selectedStatus[id] || "Manual Review"} (${Math.round(
                  (matchScores[id] as number) * 100
                )}% similarity) — please confirm.`}
          </Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            (pressed || secondaryHovered) && styles.secondaryButtonActive
          ]}
          onPress={() => void openLiveCapture(id)}
          onHoverIn={() => setSecondaryHovered(true)}
          onHoverOut={() => setSecondaryHovered(false)}
        >
          <Text style={[styles.secondaryText, (secondaryHovered || false) && styles.secondaryTextActive]}>Capture Live Photo for Match</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.flex} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Checkout Verification</Text>
          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              (pressed || refreshHovered) && styles.refreshButtonActive
            ]}
            onPress={() => void refresh()}
            onHoverIn={() => setRefreshHovered(true)}
            onHoverOut={() => setRefreshHovered(false)}
          >
            <Text style={[styles.refreshText, (refreshHovered || false) && styles.refreshTextActive]}>Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              (pressed || scanHovered) && styles.scanButtonActive
            ]}
            onPress={openScanner}
            onHoverIn={() => setScanHovered(true)}
            onHoverOut={() => setScanHovered(false)}
          >
            <Text style={[styles.scanButtonText, (scanHovered || false) && styles.scanButtonTextActive]}>Scan Visitor QR</Text>
          </Pressable>

          {scanMessage ? <Text style={styles.note}>{scanMessage}</Text> : null}

          {scannerState === "camera" ? (
            <View style={styles.cameraShell}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (pressed || secondaryHovered) && styles.secondaryButtonActive
                ]}
                onPress={closeScanner}
                onHoverIn={() => setSecondaryHovered(true)}
                onHoverOut={() => setSecondaryHovered(false)}
              >
                <Text style={[styles.secondaryText, (secondaryHovered || false) && styles.secondaryTextActive]}>Close Scanner</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Manual Checkout Search</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={manualQuery}
              onChangeText={setManualQuery}
              placeholder="Type a name or pass number"
              placeholderTextColor={NEU_DARK.textMuted}
              style={styles.searchBox}
            />
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || secondaryHovered) && styles.secondaryButtonActive
              ]}
              onPress={manualLookup}
              onHoverIn={() => setSecondaryHovered(true)}
              onHoverOut={() => setSecondaryHovered(false)}
            >
              <Text style={[styles.secondaryText, (secondaryHovered || false) && styles.secondaryTextActive]}>Search</Text>
            </Pressable>
          </View>

          {loading ? (
            <Text style={styles.body}>Loading checkout requests...</Text>
          ) : error ? (
            <Text style={styles.body}>{error}</Text>
          ) : requests.length === 0 ? (
            <Text style={styles.body}>No checkout requests.</Text>
          ) : (
            <View style={styles.listGap}>
              {filteredManualRequests.length === 0 ? (
                <Text style={styles.body}>No matching requests.</Text>
              ) : (
                filteredManualRequests.map((request) => (
                  <View key={request.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{request.fullName}</Text>
                    <Text style={styles.itemText}>
                      Purpose: {request.purposeOfVisit}
                    </Text>
                    <Text style={styles.itemText}>
                      Visitor Pass: {request.visitorPassNumber}
                    </Text>
                    <Text style={styles.itemText}>
                      Time In: {formatDate(request.timeIn)}
                    </Text>
                    <Text style={styles.itemText}>
                      Expiration: {formatDate(request.expirationTime)}
                    </Text>
                    <Text style={styles.itemText}>
                      Checkout Requested: {formatDate(request.checkoutRequestedAt)}
                    </Text>

                    {faceUrls[request.id] ? (
                      <Image source={{ uri: faceUrls[request.id]! }} style={styles.thumbnail} />
                    ) : null}

                    {renderFaceMatchControls(request.id)}

                    <Text style={styles.selectorLabel}>Face Verification</Text>
                    <View style={styles.selectorRow}>
                      {(["Matched", "Not Matched", "Manual Review"] as const).map(
                        (status) => (
                          <Pressable
                            key={status}
                            style={[
                              styles.selectorButton,
                              selectedStatus[request.id] === status &&
                                styles.selectorActive
                            ]}
                            onPress={() => handleSelect(request.id, status)}
                          >
                            <Text style={styles.selectorText}>{status}</Text>
                          </Pressable>
                        )
                      )}
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.completeButton,
                        (pressed || completeHovered) && styles.completeButtonActive,
                        !!completingId && { opacity: 0.6 }
                      ]}
                      onPress={() => handleComplete(request.id)}
                      onHoverIn={() => setCompleteHovered(true)}
                      onHoverOut={() => setCompleteHovered(false)}
                      disabled={!!completingId}
                    >
                      <Text style={[styles.completeText, (completeHovered || false) && styles.completeTextActive]}>
                        {completingId === request.id ? "Completing..." : "Complete Checkout"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}

          {scannedVisitor ? (
            <View style={styles.scannedCard}>
              <Text style={styles.sectionTitle}>Scanned Visitor</Text>
              <Text style={styles.itemTitle}>{scannedVisitor.fullName}</Text>
              <Text style={styles.itemText}>
                Purpose: {scannedVisitor.purposeOfVisit}
              </Text>
              <Text style={styles.itemText}>
                Visitor Pass: {scannedVisitor.visitorPassNumber}
              </Text>
              <Text style={styles.itemText}>
                Time In: {formatDate(scannedVisitor.timeIn)}
              </Text>
              <Text style={styles.itemText}>
                Expiration: {formatDate(scannedVisitor.expirationTime)}
              </Text>
              <Text style={styles.itemText}>QR Status: {scannedVisitor.qrStatus}</Text>
              {faceUrls[scannedVisitor.id] ? (
                <Image source={{ uri: faceUrls[scannedVisitor.id]! }} style={styles.thumbnail} />
              ) : null}
              {renderFaceMatchControls(scannedVisitor.id)}
              <View style={styles.selectorRow}>
                {(["Matched", "Not Matched", "Manual Review"] as const).map(
                  (status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.selectorButton,
                        selectedStatus[scannedVisitor.id] === status &&
                          styles.selectorActive
                      ]}
                      onPress={() => handleSelect(scannedVisitor.id, status)}
                    >
                      <Text style={styles.selectorText}>{status}</Text>
                    </Pressable>
                  )
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.completeButton,
                  (pressed || completeHovered) && styles.completeButtonActive,
                  !!completingId && { opacity: 0.6 }
                ]}
                onPress={() => handleComplete(scannedVisitor.id)}
                onHoverIn={() => setCompleteHovered(true)}
                onHoverOut={() => setCompleteHovered(false)}
                disabled={!!completingId}
              >
                <Text style={[styles.completeText, (completeHovered || false) && styles.completeTextActive]}>
                  {completingId === scannedVisitor.id ? "Completing..." : "Complete Checkout"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

function matchesManualQuery(request: VisitorRegistration, lowerCaseQuery: string) {
  return (
    request.fullName.toLowerCase().includes(lowerCaseQuery) ||
    request.visitorPassNumber.toLowerCase().includes(lowerCaseQuery)
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32
  },
  card: {
    backgroundColor: NEU_DARK.card,
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  body: {
    fontSize: 14,
    color: NEU_DARK.textMuted
  },
  note: {
    fontSize: 12,
    color: NEU_DARK.textFaint
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: NEU_DARK.white,
    marginTop: 4
  },
  cameraShell: {
    gap: 12,
    marginTop: 4
  },
  camera: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden"
  },
  scanButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: NEU_DARK.emeraldStrong,
    alignItems: "center"
  },
  scanButtonActive: {
    backgroundColor: "#0C8A62"
  },
  scanButtonText: {
    color: "#04150C",
    fontSize: 15,
    fontWeight: "700"
  },
  scanButtonTextActive: {
    color: "#04150C"
  },
  refreshButton: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center"
  },
  refreshButtonActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  refreshText: {
    color: NEU_DARK.white,
    fontSize: 14,
    fontWeight: "600"
  },
  refreshTextActive: {
    color: NEU_DARK.emerald
  },
  secondaryButton: {
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryTextActive: {
    color: NEU_DARK.emerald
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: NEU_DARK.inputBg,
    color: NEU_DARK.white
  },
  searchInput: {
    fontSize: 14,
    color: NEU_DARK.textMuted
  },
  listGap: {
    gap: 12
  },
  itemCard: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: NEU_DARK.card
  },
  scannedCard: {
    borderWidth: 1,
    borderColor: NEU_DARK.emerald,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NEU_DARK.white
  },
  itemText: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 4
  },
  matchSection: {
    gap: 8,
    marginTop: 4
  },
  matchSuggestion: {
    fontSize: 12,
    color: NEU_DARK.white,
    fontWeight: "600"
  },
  matchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4
  },
  matchingText: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  },
  selectorLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: NEU_DARK.textMuted
  },
  selectorRow: {
    flexDirection: "row",
    gap: 8
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  selectorActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  selectorText: {
    fontSize: 12,
    color: NEU_DARK.white,
    fontWeight: "600"
  },
  completeButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: NEU_DARK.emeraldStrong,
    alignItems: "center"
  },
  completeButtonActive: {
    backgroundColor: "#0C8A62"
  },
  completeText: {
    color: "#04150C",
    fontSize: 14,
    fontWeight: "700"
  },
  completeTextActive: {
    color: "#04150C"
  }
});
