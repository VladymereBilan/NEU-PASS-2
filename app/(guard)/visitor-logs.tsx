import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { getAllRegistrations } from "../../src/services/PrototypeRegistrationStore";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function VisitorLogsScreen() {
  const [completed, setCompleted] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await getAllRegistrations();
      setCompleted(
        all.filter((registration) => registration.checkoutStatus === "Completed")
      );
    } catch (err) {
      setError("Unable to load visitor logs.");
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Visitor Logs</Text>
        <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={styles.body}>Loading visitor logs...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : completed.length === 0 ? (
          <Text style={styles.body}>No completed visitors.</Text>
        ) : (
          completed.map((registration) => (
            <View key={registration.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{registration.fullName}</Text>
              <Text style={styles.itemText}>
                Purpose: {registration.purposeOfVisit}
              </Text>
              <Text style={styles.itemText}>
                Time In: {formatDate(registration.timeIn)}
              </Text>
              <Text style={styles.itemText}>
                Time Out: {formatDate(registration.timeOut)}
              </Text>
              <Text style={styles.itemText}>
                Visitor Pass: {registration.visitorPassNumber}
              </Text>
              <Text style={styles.itemText}>QR Status: {registration.qrStatus}</Text>
              <Text style={styles.itemText}>
                Face Checkout Status: {registration.faceCheckoutVerificationStatus}
              </Text>
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
