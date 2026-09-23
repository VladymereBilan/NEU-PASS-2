import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getActiveVisitors } from "../../src/services/PrototypeRegistrationStore";
import { isOverdue } from "../../src/services/ExpirationService";
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

export default function ActiveVisitorsScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [active, setActive] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshHovered, setRefreshHovered] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActiveVisitors();
      // Overdue visitors (past their pass expiration and still not checked
      // out) surface first — they're the ones a guard needs to chase down,
      // not someone who just walked in.
      const sorted = [...data].sort((a, b) => {
        const aOverdue = isOverdue(a.expirationTime);
        const bOverdue = isOverdue(b.expirationTime);
        if (aOverdue === bOverdue) return 0;
        return aOverdue ? -1 : 1;
      });
      setActive(sorted);
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

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const username = email ? email.split("@")[0] : null;
  const roleLabel = username ? `Guard · ${username}` : "Guard";

  return (
    <DashboardScreen
      roleLabel={roleLabel}
      onSignOut={() => void handleSignOut()}
      tabs={GUARD_TABS}
    >
      <Text style={styles.title}>Active Visitors</Text>
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
        <Text style={styles.body}>Loading active visitors...</Text>
      ) : error ? (
        <Text style={styles.body}>{error}</Text>
      ) : active.length === 0 ? (
        <Text style={styles.body}>No active visitors.</Text>
      ) : (
        active.map((registration) => {
          const overdue = isOverdue(registration.expirationTime);
          return (
            <View
              key={registration.id}
              style={[styles.itemCard, overdue && styles.itemCardOverdue]}
            >
              <View style={styles.badgeRow}>
                <Text style={styles.itemTitle}>{registration.fullName}</Text>
                <View style={overdue ? styles.overdueBadge : styles.activeBadge}>
                  <Text style={overdue ? styles.overdueBadgeText : styles.activeBadgeText}>
                    {overdue ? "Overdue" : "Active"}
                  </Text>
                </View>
              </View>
              {overdue ? (
                <Text style={styles.overdueNote}>
                  Past pass expiration and not checked out — please follow up.
                </Text>
              ) : null}
              <Text style={styles.itemText}>Purpose: {registration.purposeOfVisit}</Text>
              {registration.purposeOfVisit === "Others" && registration.otherAgenda ? (
                <Text style={styles.itemText}>Other Agenda: {registration.otherAgenda}</Text>
              ) : null}
              <Text style={styles.itemText}>Time In: {formatDateTime(registration.timeIn)}</Text>
              <Text style={styles.itemText}>Visitor Pass: {registration.visitorPassNumber}</Text>
              <Text style={styles.itemText}>Expiration: {formatDateTime(registration.expirationTime)}</Text>
              <Text style={styles.itemText}>QR Status: {registration.qrStatus}</Text>
            </View>
          );
        })
      )}
    </DashboardScreen>
  );
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
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
  itemCardOverdue: {
    borderColor: "#ef4444"
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
    backgroundColor: NEU_DARK.emeraldSoft
  },
  activeBadgeText: {
    fontSize: 12,
    color: NEU_DARK.emerald,
    fontWeight: "700"
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
