import { useCallback, useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getPendingRegistrations,
  markVisitorActive,
  rejectRegistration
} from "../../src/services/PrototypeRegistrationStore";
import { getVisitorImageSignedUrl } from "../../src/lib/imageUpload";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

type ImageUrls = { idUrl: string | null; faceUrl: string | null };

export default function PendingVerificationsScreen() {
  const [pending, setPending] = useState<VisitorRegistration[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, ImageUrls>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshHovered, setRefreshHovered] = useState(false);
  const [processing, setProcessing] = useState<
    { id: string; action: "approve" | "reject" } | null
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingRegistrations();
      setPending(data);

      const entries = await Promise.all(
        data.map(async (registration) => {
          const [idUrl, faceUrl] = await Promise.all([
            getVisitorImageSignedUrl("visitor-ids", registration.idImageUri).catch(() => null),
            getVisitorImageSignedUrl("visitor-faces", registration.faceImageUri).catch(() => null)
          ]);
          return [registration.id, { idUrl, faceUrl }] as const;
        })
      );
      setImageUrls(Object.fromEntries(entries));
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
    if (processing) return;
    try {
      setProcessing({ id, action: "approve" });
      await markVisitorActive(id);
      await refresh();
      Alert.alert("Visitor approved.");
    } catch (err) {
      Alert.alert("Unable to approve visitor.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (processing) return;
    try {
      setProcessing({ id, action: "reject" });
      await rejectRegistration(id);
      await refresh();
      Alert.alert("Visitor rejected.");
    } catch (err) {
      Alert.alert("Unable to reject visitor.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Pending Verifications</Text>
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

              <View style={styles.imageRow}>
                <View style={styles.imageSlot}>
                  <Text style={styles.imageLabel}>ID Photo</Text>
                  {imageUrls[registration.id]?.idUrl ? (
                    <Image
                      source={{ uri: imageUrls[registration.id]!.idUrl! }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <Text style={styles.imagePlaceholder}>
                      {registration.idImageUri ? "Prototype sample" : "No image"}
                    </Text>
                  )}
                </View>
                <View style={styles.imageSlot}>
                  <Text style={styles.imageLabel}>Face Photo</Text>
                  {imageUrls[registration.id]?.faceUrl ? (
                    <Image
                      source={{ uri: imageUrls[registration.id]!.faceUrl! }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <Text style={styles.imagePlaceholder}>
                      {registration.faceImageUri ? "Prototype sample" : "No image"}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.approve,
                    processing?.id === registration.id && styles.actionDisabled
                  ]}
                  onPress={() => handleApprove(registration.id)}
                  disabled={!!processing}
                >
                  <Text style={styles.actionText}>
                    {processing?.id === registration.id && processing.action === "approve"
                      ? "Approving..."
                      : "Approve"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.reject,
                    processing?.id === registration.id && styles.actionDisabled
                  ]}
                  onPress={() => handleReject(registration.id)}
                  disabled={!!processing}
                >
                  <Text style={styles.actionText}>
                    {processing?.id === registration.id && processing.action === "reject"
                      ? "Rejecting..."
                      : "Reject"}
                  </Text>
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
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4
  },
  imageSlot: {
    flex: 1,
    gap: 4
  },
  imageLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280"
  },
  thumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e5e7eb"
  },
  imagePlaceholder: {
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    textAlignVertical: "center"
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
  actionDisabled: {
    opacity: 0.7
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
  }
});
