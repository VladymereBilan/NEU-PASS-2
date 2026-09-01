import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
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

  const handleComplete = async (id: string) => {
    const status = selectedStatus[id] || "Manual Review";
    try {
      await completeCheckout(id, status);
      await refresh();
      setScannedVisitor(null);
      setScanMessage("");
      Alert.alert("Checkout completed.");
    } catch {
      Alert.alert("Unable to complete checkout.");
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

      const referenceUrl = faceUrls[id];
      if (!referenceUrl) {
        Alert.alert("No reference photo available for this visitor — please select a status manually.");
        return;
      }

      setMatchingFor(id);
      const result = await compareFaces(referenceUrl, photo.uri);
      setMatchScores((prev) => ({ ...prev, [id]: result.score }));
      handleSelect(id, result.suggestion);
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
    <SafeAreaView style={styles.screen}>
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
                        (pressed || completeHovered) && styles.completeButtonActive
                      ]}
                      onPress={() => handleComplete(request.id)}
                      onHoverIn={() => setCompleteHovered(true)}
                      onHoverOut={() => setCompleteHovered(false)}
                    >
                      <Text style={[styles.completeText, (completeHovered || false) && styles.completeTextActive]}>Complete Checkout</Text>
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
                  (pressed || completeHovered) && styles.completeButtonActive
                ]}
                onPress={() => handleComplete(scannedVisitor.id)}
                onHoverIn={() => setCompleteHovered(true)}
                onHoverOut={() => setCompleteHovered(false)}
              >
                <Text style={[styles.completeText, (completeHovered || false) && styles.completeTextActive]}>Complete Checkout</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  screen: {
    flex: 1,
    backgroundColor: "#ecfeff"
  },
  scrollContent: {
    padding: 24
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    gap: 12,
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
    color: "#4b5563"
  },
  note: {
    fontSize: 12,
    color: "#6b7280"
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
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
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  scanButtonActive: {
    backgroundColor: "#0F766E",
    transform: [{ scale: 1.01 }]
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  },
  scanButtonTextActive: {
    color: "#EAF5EE"
  },
  refreshButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  refreshButtonActive: {
    backgroundColor: "#DFF9EE",
    transform: [{ scale: 1.01 }]
  },
  refreshText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  refreshTextActive: {
    color: "#064A28"
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryButtonActive: {
    backgroundColor: "#DFF9EE",
    transform: [{ scale: 1.01 }]
  },
  secondaryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryTextActive: {
    color: "#064A28"
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb"
  },
  searchInput: {
    fontSize: 14,
    color: "#6b7280"
  },
  listGap: {
    gap: 12
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: "#f9fafb"
  },
  scannedCard: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: "#eef2ff"
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  itemText: {
    fontSize: 13,
    color: "#374151"
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginTop: 4
  },
  matchSection: {
    gap: 8,
    marginTop: 4
  },
  matchSuggestion: {
    fontSize: 12,
    color: "#111827",
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
    color: "#4b5563"
  },
  selectorLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
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
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#ffffff"
  },
  selectorActive: {
    borderColor: "#111827",
    backgroundColor: "#e5e7eb"
  },
  selectorText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600"
  },
  completeButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  completeButtonActive: {
    backgroundColor: "#0F766E",
    transform: [{ scale: 1.01 }]
  },
  completeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600"
  },
  completeTextActive: {
    color: "#EAF5EE"
  }
});
