import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { getAllRegistrations } from "../../src/services/PrototypeRegistrationStore";
import { AppBackground } from "../../src/components/AppBackground";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function VisitorLogsScreen() {
  const [completed, setCompleted] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshHovered, setRefreshHovered] = useState(false);

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
    <AppBackground>
      <SafeAreaView style={styles.flex} edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
        <Text style={styles.title}>Visitor Logs</Text>
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
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
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
  itemCard: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: NEU_DARK.card
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
  }
});
