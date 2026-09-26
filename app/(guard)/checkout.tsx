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
  getActiveVisitors,
  getVisitorPassByVisitorId
} from "../../src/services/PrototypeRegistrationStore";
import { getExpirationStatus, isOverdue } from "../../src/services/ExpirationService";
import { getVisitorImageSignedUrl } from "../../src/lib/imageUpload";
import { compareFaces } from "../../src/services/FaceMatchService";
import { parseQRValue } from "../../src/services/QRService";
import { AppBackground } from "../../src/components/AppBackground";
import BackButton from "../../src/components/BackButton";
import { NEU_DARK } from "../../src/theme/brand";
import type {
  FaceCheckoutVerificationStatus,
  VisitorRegistration
} from "../../src/types/VisitorRegistration";

type ScannerState = "idle" | "camera";

export default function CheckoutVerificationScreen() {
  const [activeVisitors, setActiveVisitors] = useState<VisitorRegistration[]>([]);
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
  const [liveCameraReady, setLiveCameraReady] = useState(false);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, number | null>>({});
  const [matchReasons, setMatchReasons] = useState<Record<string, string | undefined>>({});
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
      const data = await getActiveVisitors();
      setActiveVisitors(data);
      void Promise.all(data.map(loadFaceUrl));
    } catch {
      setError("Unable to load active visitors.");
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

  const filteredActiveVisitors = useMemo(() => {
    const query = manualQuery.trim().toLowerCase();
    const base = query
      ? activeVisitors.filter((visitor) => matchesManualQuery(visitor, query))
      : activeVisitors;

    // A scanned/looked-up visitor gets its own spotlight card below — drop it
    // from this list so its face-match controls (live camera, match state)
    // aren't rendered twice for the same id at once, which previously caused
    // two simultaneous CameraViews fighting over one shared camera ref.
    const withoutScanned = scannedVisitor
      ? base.filter((visitor) => visitor.id !== scannedVisitor.id)
      : base;

    // Overdue visitors (past pass expiration, still not checked out) surface
    // first so a guard working this list checks them out before newer
    // arrivals.
    return [...withoutScanned].sort((a, b) => {
      const aOverdue = isOverdue(a.expirationTime);
      const bOverdue = isOverdue(b.expirationTime);
      if (aOverdue === bOverdue) return 0;
      return aOverdue ? -1 : 1;
    });
  }, [manualQuery, activeVisitors, scannedVisitor]);

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
    } catch {
      Alert.alert("Unable to complete checkout.");
      setCompletingId(null);
      return;
    }

    // The checkout itself already succeeded server-side at this point — a
    // failure here is just a stale-list refresh, not a failed checkout, so
    // it must not surface as "Unable to complete checkout."
    setScannedVisitor(null);
    setScanMessage("");
    Alert.alert(completionMessage);
    await refresh().catch(() => setError("Checkout completed, but the list failed to refresh."));
    setCompletingId(null);
  };

  const openLiveCapture = async (id: string) => {
    // Keep one comparison in flight at a time so the guard cannot start
    // multiple expensive image uploads from the same checkout screen.
    if (matchingFor) {
      Alert.alert("Please wait for the current face comparison to finish.");
      return;
    }
    // Also block opening a second visitor's camera while one is already
    // open — otherwise tapping another row silently swaps whose camera is
    // showing, with no message, risking confusion about who is being
    // photographed.
    if (liveCaptureFor && liveCaptureFor !== id) {
      Alert.alert("Please finish or cancel the current live photo capture first.");
      return;
    }
    const result = permission?.granted ? permission : await requestPermission();
    if (!result?.granted) {
      Alert.alert("Camera permission was denied. You can still select a status manually.");
      return;
    }
    // Clear any prior comparison result for this visitor — otherwise, if the
    // new capture's compareFaces call fails before setMatchScores/setMatchReasons
    // run, the old result stays on screen looking like it's still current.
    setMatchScores((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMatchReasons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLiveCameraReady(false);
    setLiveCaptureFor(id);
  };

  const captureLivePhoto = async (id: string) => {
    if (!liveCameraRef.current || !liveCameraReady) return;

    try {
      const photo = await liveCameraRef.current.takePictureAsync({
        quality: 0.7
      });
      setLiveCaptureFor(null);
      if (!photo?.uri) {
        Alert.alert("No photo was captured. Please tap \"Capture Live Photo for Match\" and try again.");
        return;
      }

      // Set the lock as soon as we have a photo so a second comparison cannot
      // start while this request is preparing the live image.
      setMatchingFor(id);

      const result = await compareFaces(id, photo.uri);
      setMatchScores((prev) => ({ ...prev, [id]: result.score }));
      setMatchReasons((prev) => ({ ...prev, [id]: result.reason }));
      handleSelect(id, result.suggestion);

      if (result.autoComplete) {
        const similarityPercent = Math.round(result.score as number);
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

      let visitor: VisitorRegistration | null;
      try {
        visitor = await getVisitorPassByVisitorId(payload.visitorId);
      } catch {
        setScannerState("idle");
        Alert.alert("Unable to look up this visitor. Please check your connection and try again.");
        return;
      }

      if (
        !visitor ||
        visitor.registrationStatus !== "Active" ||
        visitor.qrStatus !== "Active" ||
        visitor.visitorPassNumber !== payload.visitorPassNumber
      ) {
        setScannerState("idle");
        Alert.alert("Invalid or expired QR.");
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

    const found = activeVisitors.find((visitor) => matchesManualQuery(visitor, query));

    if (!found) {
      setScanMessage("No matching active visitor found.");
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
          <CameraView
            key={id}
            ref={liveCameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={() => setLiveCameraReady(true)}
            onMountError={(error) => {
              setLiveCameraReady(false);
              setLiveCaptureFor(null);
              Alert.alert(`Unable to start camera: ${error.message}`);
            }}
          />
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              (pressed || scanHovered) && styles.scanButtonActive,
              !liveCameraReady && styles.scanButtonDisabled
            ]}
            onPress={() => void captureLivePhoto(id)}
            onHoverIn={() => setScanHovered(true)}
            onHoverOut={() => setScanHovered(false)}
            disabled={!liveCameraReady}
          >
            <Text style={[styles.scanButtonText, (scanHovered || false) && styles.scanButtonTextActive]}>
              {liveCameraReady ? "Capture" : "Starting Camera..."}
            </Text>
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
              ? `Technical comparison error — manual review required.${matchReasons[id] ? ` Reason: ${matchReasons[id]}` : ""}`
              : `AWS similarity: ${Number(matchScores[id]).toFixed(2)}% — ${
                  selectedStatus[id] || "Manual Review"
                }. Please confirm.`}
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
      <SafeAreaView style={styles.flex} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screenHeader}>
        <BackButton />
        <Text style={styles.screenHeaderTitle}>Checkout Verification</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
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
            <Text style={styles.body}>Loading active visitors...</Text>
          ) : error ? (
            <Text style={styles.body}>{error}</Text>
          ) : activeVisitors.length === 0 ? (
            <Text style={styles.body}>No active visitors.</Text>
          ) : (
            <View style={styles.listGap}>
              {filteredActiveVisitors.length === 0 ? (
                <Text style={styles.body}>No matching visitors.</Text>
              ) : (
                filteredActiveVisitors.map((visitor) => {
                  const overdue = isOverdue(visitor.expirationTime);
                  return (
                  <View key={visitor.id} style={[styles.itemCard, overdue && styles.itemCardOverdue]}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.itemTitle}>{visitor.fullName}</Text>
                      {overdue ? (
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueBadgeText}>Overdue</Text>
                        </View>
                      ) : null}
                    </View>
                    {overdue ? (
                      <Text style={styles.overdueNote}>
                        Past pass expiration and not checked out — please follow up.
                      </Text>
                    ) : null}
                    <Text style={styles.itemText}>
                      Purpose: {visitor.purposeOfVisit}
                    </Text>
                    <Text style={styles.itemText}>
                      Visitor Pass: {visitor.visitorPassNumber}
                    </Text>
                    <Text style={styles.itemText}>
                      Time In: {formatDate(visitor.timeIn)}
                    </Text>
                    <Text style={styles.itemText}>
                      Expiration: {formatDate(visitor.expirationTime)}
                    </Text>

                    {faceUrls[visitor.id] ? (
                      <Image source={{ uri: faceUrls[visitor.id]! }} style={styles.thumbnail} />
                    ) : null}

                    {renderFaceMatchControls(visitor.id)}

                    <Text style={styles.selectorLabel}>Face Verification</Text>
                    <View style={styles.selectorRow}>
                      {(["Matched", "Not Matched", "Manual Review"] as const).map(
                        (status) => (
                          <Pressable
                            key={status}
                            style={[
                              styles.selectorButton,
                              selectedStatus[visitor.id] === status &&
                                styles.selectorActive
                            ]}
                            onPress={() => handleSelect(visitor.id, status)}
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
                        !!completingId && styles.completeButtonDisabled
                      ]}
                      disabled={!!completingId}
                      onPress={() => handleComplete(visitor.id)}
                      onHoverIn={() => setCompleteHovered(true)}
                      onHoverOut={() => setCompleteHovered(false)}
                    >
                      <Text style={[styles.completeText, (completeHovered || false) && styles.completeTextActive]}>
                        {completingId === visitor.id ? "Completing..." : "Complete Checkout"}
                      </Text>
                    </Pressable>
                  </View>
                  );
                })
              )}
            </View>
          )}

          {scannedVisitor ? (
            <View
              style={[
                styles.scannedCard,
                isOverdue(scannedVisitor.expirationTime) && styles.itemCardOverdue
              ]}
            >
              <View style={styles.badgeRow}>
                <Text style={styles.sectionTitle}>Scanned Visitor</Text>
                {isOverdue(scannedVisitor.expirationTime) ? (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueBadgeText}>Overdue</Text>
                  </View>
                ) : null}
              </View>
              {isOverdue(scannedVisitor.expirationTime) ? (
                <Text style={styles.overdueNote}>
                  Past pass expiration and not checked out — please follow up.
                </Text>
              ) : null}
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
                  !!completingId && styles.completeButtonDisabled
                ]}
                disabled={!!completingId}
                onPress={() => handleComplete(scannedVisitor.id)}
                onHoverIn={() => setCompleteHovered(true)}
                onHoverOut={() => setCompleteHovered(false)}
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
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NEU_DARK.white
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
  scanButtonDisabled: {
    opacity: 0.6
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
  itemCardOverdue: {
    borderColor: "#ef4444"
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  overdueBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(239, 68, 68, 0.15)"
  },
  overdueBadgeText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "700"
  },
  overdueNote: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600"
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
  completeButtonDisabled: {
    opacity: 0.5
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
