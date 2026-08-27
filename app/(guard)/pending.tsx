import { useCallback, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getPendingRegistrations,
  markVisitorActive,
  rejectRegistration
} from "../../src/services/PrototypeRegistrationStore";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function PendingVerificationsScreen() {
  const [pending, setPending] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingRegistrations();
      setPending(data);
    } catch (err) {
      setError("Unable to load pending registrations.");
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

  const handleApprove = async (id: string) => {
    try {
      await markVisitorActive(id);
      await refresh();
      Alert.alert("Visitor approved.");
    } catch (err) {
      Alert.alert("Unable to approve visitor.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRegistration(id);
      await refresh();
      Alert.alert("Visitor rejected.");
    } catch (err) {
      Alert.alert("Unable to reject visitor.");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Pending Verifications</Text>
        <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
        <Text style={styles.note}>
          Prototype data is temporary. SQLite will be added in a later phase.
        </Text>

        {loading ? (
          <Text style={styles.body}>Loading pending registrations...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : pending.length === 0 ? (
          <Text style={styles.body}>No pending visitor registrations.</Text>
        ) : (
          pending.map((registration) => (
            <View key={registration.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{registration.fullName}</Text>
              <Text style={styles.itemText}>
                Purpose: {registration.purposeOfVisit}
              </Text>
              <Text style={styles.itemText}>
                Created: {new Date(registration.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.itemText}>
                Face Status: {registration.faceVerificationStatus}
              </Text>
              <Text style={styles.itemText}>Status: Pending</Text>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, styles.approve]}
                  onPress={() => handleApprove(registration.id)}
                >
                  <Text style={styles.actionText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => handleReject(registration.id)}
                >
                  <Text style={styles.actionText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
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
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  itemText: {
    fontSize: 13,
    color: "#374151"
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  approve: {
    backgroundColor: "#111827"
  },
  reject: {
    backgroundColor: "#6b7280"
  },
  actionText: {
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
