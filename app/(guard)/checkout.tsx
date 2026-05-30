import { useCallback, useMemo, useState } from "react";
import {
  Alert,
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
import BackButton from "../../src/components/BackButton";
import {
  completeCheckout,
  getCheckoutRequests
} from "../../src/services/PrototypeRegistrationStore";
import { getExpirationStatus } from "../../src/services/ExpirationService";
import { parseQRValue } from "../../src/services/QRService";
import { getVisitorById } from "../../src/repositories/VisitorRepository";
import type {
  FaceCheckoutVerificationStatus,
  VisitorRegistration
} from "../../src/types/VisitorRegistration";

type ScannerState = "idle" | "camera";

export default function CheckoutVerificationScreen() {
  const [requests, setRequests] = useState<VisitorRegistration[]>([]);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCheckoutRequests();
      setRequests(data);
    } catch {
      setError("Unable to load checkout requests.");
    } finally {
      setLoading(false);
    }
  }, []);

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

    return requests.filter((request) => {
      return (
        request.fullName.toLowerCase().includes(query) ||
        request.visitorPassNumber.toLowerCase().includes(query)
      );
    });
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
        Alert.alert("Invalid or expired QR.");
        return;
      }

      const visitor = await getVisitorById(payload.visitorId);
      if (
        !visitor ||
        visitor.registrationStatus !== "Active" ||
        visitor.visitorPassNumber !== payload.visitorPassNumber
      ) {
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
      }

      setScanMessage("QR scanned successfully.");
      setScannerState("idle");
    } catch {
      Alert.alert("Invalid or expired QR.");
    } finally {
      setScannerBusy(false);
    }
  };

  const manualLookup = async () => {
    const query = manualQuery.trim();
    if (!query) {
      setScanMessage("Enter a name or pass number to search manually.");
      return;
    }

    const found = requests.find((request) => {
      return (
        request.fullName.toLowerCase().includes(query.toLowerCase()) ||
        request.visitorPassNumber.toLowerCase().includes(query.toLowerCase())
      );
    });

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <BackButton />
          <Text style={styles.title}>Checkout Verification</Text>
          <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>

          <Pressable style={styles.scanButton} onPress={openScanner}>
            <Text style={styles.scanButtonText}>Scan Visitor QR</Text>
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
              <Pressable style={styles.secondaryButton} onPress={closeScanner}>
                <Text style={styles.secondaryText}>Close Scanner</Text>
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
            <Pressable style={styles.secondaryButton} onPress={manualLookup}>
              <Text style={styles.secondaryText}>Search</Text>
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
                      style={styles.completeButton}
                      onPress={() => handleComplete(request.id)}
                    >
                      <Text style={styles.completeText}>Complete Checkout</Text>
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
                style={styles.completeButton}
                onPress={() => handleComplete(scannedVisitor.id)}
              >
                <Text style={styles.completeText}>Complete Checkout</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scanButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  },
  refreshButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  refreshText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
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
  completeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600"
  }
});
