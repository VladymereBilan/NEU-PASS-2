import { useCallback, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import BackButton from "../../src/components/BackButton";
import {
  completeCheckout,
  getCheckoutRequests
} from "../../src/services/PrototypeRegistrationStore";
import type { FaceCheckoutVerificationStatus, VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function CheckoutVerificationScreen() {
  const [requests, setRequests] = useState<VisitorRegistration[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<
    Record<string, FaceCheckoutVerificationStatus>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCheckoutRequests();
      setRequests(data);
    } catch (err) {
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
      Alert.alert("Checkout completed.");
    } catch (err) {
      Alert.alert("Unable to complete checkout.");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>Checkout Verification</Text>
        <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={styles.body}>Loading checkout requests...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : requests.length === 0 ? (
          <Text style={styles.body}>No checkout requests.</Text>
        ) : (
          requests.map((request) => (
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
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ecfeff"
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
  itemCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: "#f9fafb"
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
  }
});
