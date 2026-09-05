import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getPendingRegistrations,
  markVisitorActive,
  rejectRegistration
} from "../../src/services/PrototypeRegistrationStore";
import { getVisitorImageSignedUrl } from "../../src/lib/imageUpload";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

const GUARD_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(guard)/home" },
  { key: "pending", label: "Pending", icon: "account-clock-outline", route: "/(guard)/pending" },
  { key: "active-visitors", label: "Active", icon: "account-group-outline", route: "/(guard)/active-visitors" },
  { key: "reports", label: "Reports", icon: "chart-bar", route: "/(guard)/reports" }
];

type ImageUrls = { idUrl: string | null; faceUrl: string | null };

export default function PendingVerificationsScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const username = email ? email.split("@")[0] : null;
  const roleLabel = username ? `Guard · ${username}` : "Guard";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={GUARD_TABS}>
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
        <Text style={styles.refreshText}>Refresh</Text>
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
            <Text style={styles.itemText}>Purpose: {registration.purposeOfVisit}</Text>
            <Text style={styles.itemText}>
              Created: {new Date(registration.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.itemText}>Face Status: {registration.faceVerificationStatus}</Text>
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
                <Text style={[styles.actionText, styles.approveText]}>
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
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
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
    color: NEU_DARK.textMuted
  },
  thumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  imagePlaceholder: {
    height: 100,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: NEU_DARK.textMuted,
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
    backgroundColor: NEU_DARK.emeraldStrong
  },
  reject: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: NEU_DARK.border
  },
  actionDisabled: {
    opacity: 0.7
  },
  actionText: {
    color: NEU_DARK.white,
    fontSize: 14,
    fontWeight: "700"
  },
  approveText: {
    color: "#04150C"
  },
  refreshButton: {
    paddingVertical: 10,
    borderRadius: 10,
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
  }
});
