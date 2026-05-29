import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import BackButton from "../../src/components/BackButton";
import { getActiveVisitors } from "../../src/services/PrototypeRegistrationStore";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function ActiveVisitorsScreen() {
  const [active, setActive] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActiveVisitors();
      setActive(data);
    } catch (err) {
      setError("Unable to load active visitors.");
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
        <BackButton />
        <Text style={styles.title}>Active Visitors</Text>
        <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
        <Text style={styles.note}>
          QR code generation will be added in the next phase.
        </Text>

        {loading ? (
          <Text style={styles.body}>Loading active visitors...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : active.length === 0 ? (
          <Text style={styles.body}>No active visitors.</Text>
        ) : (
          active.map((registration) => (
            <View key={registration.id} style={styles.itemCard}>
              <View style={styles.badgeRow}>
                <Text style={styles.itemTitle}>{registration.fullName}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.itemText}>
                Purpose: {registration.purposeOfVisit}
              </Text>
              {registration.purposeOfVisit === "Others" &&
              registration.otherAgenda ? (
                <Text style={styles.itemText}>
                  Other Agenda: {registration.otherAgenda}
                </Text>
              ) : null}
              <Text style={styles.itemText}>
                Time In: {formatDateTime(registration.timeIn)}
              </Text>
              <Text style={styles.itemText}>
                Visitor Pass: {registration.visitorPassNumber}
              </Text>
              <Text style={styles.itemText}>
                Expiration: {formatDateTime(registration.expirationTime)}
              </Text>
              <Text style={styles.itemText}>
                QR Status: {registration.qrStatus}
              </Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

function formatDateTime(value: string) {
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
  note: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  activeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#111827"
  },
  activeBadgeText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600"
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
