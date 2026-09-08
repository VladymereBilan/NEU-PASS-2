import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getAllVisitors } from "../../src/repositories/VisitorRepository";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { NEU_DARK } from "../../src/theme/brand";
import { PURPOSE_OPTIONS, type VisitorRegistration } from "../../src/types/VisitorRegistration";

const GUARD_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(guard)/home" },
  { key: "pending", label: "Pending", icon: "account-clock-outline", route: "/(guard)/pending" },
  { key: "active-visitors", label: "Active", icon: "account-group-outline", route: "/(guard)/active-visitors" },
  { key: "reports", label: "Reports", icon: "chart-bar", route: "/(guard)/reports" }
];

type MetricCardProps = {
  label: string;
  value: number;
};

export default function ReportsScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [visitors, setVisitors] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshHovered, setRefreshHovered] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllVisitors();
      setVisitors(data);
    } catch {
      setError("Unable to load reports.");
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

  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(new Date()), []);

  const summary = useMemo(() => {
    const now = new Date();
    return {
      totalVisitors: visitors.length,
      activeVisitors: visitors.filter((v) => v.registrationStatus === "Active").length,
      completedVisitors: visitors.filter((v) => v.checkoutStatus === "Completed").length,
      pendingVisitors: visitors.filter((v) => v.registrationStatus === "Pending").length,
      expiredQrPasses: visitors.filter((v) => {
        if (!v.expirationTime) return false;
        const expiration = new Date(v.expirationTime);
        return expiration.getTime() < now.getTime() && v.qrStatus !== "Used/Invalid";
      }).length
    };
  }, [visitors]);

  const purposeCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PURPOSE_OPTIONS.map((purpose) => [purpose, 0])
    ) as Record<(typeof PURPOSE_OPTIONS)[number], number>;

    visitors.forEach((visitor) => {
      const purpose = visitor.purposeOfVisit as (typeof PURPOSE_OPTIONS)[number];
      if (purpose in counts) {
        counts[purpose] += 1;
      }
    });

    return counts;
  }, [visitors]);

  const daily = useMemo(() => {
    const visitorsToday = visitors.filter((visitor) => {
      const createdAt = visitor.createdAt ? new Date(visitor.createdAt) : null;
      return createdAt ? createdAt >= today : false;
    }).length;

    const completedToday = visitors.filter((visitor) => {
      const timeOut = visitor.timeOut ? new Date(visitor.timeOut) : null;
      return timeOut ? timeOut >= today : false;
    }).length;

    const activeToday = visitors.filter((visitor) => {
      const timeIn = visitor.timeIn ? new Date(visitor.timeIn) : null;
      return timeIn ? timeIn >= today && visitor.registrationStatus === "Active" : false;
    }).length;

    return { visitorsToday, completedToday, activeToday };
  }, [today, visitors]);

  const monthly = useMemo(() => {
    const visitorsThisMonth = visitors.filter((visitor) => {
      const createdAt = visitor.createdAt ? new Date(visitor.createdAt) : null;
      return createdAt ? createdAt >= monthStart : false;
    }).length;

    const completedThisMonth = visitors.filter((visitor) => {
      const timeOut = visitor.timeOut ? new Date(visitor.timeOut) : null;
      return timeOut ? timeOut >= monthStart : false;
    }).length;

    return { visitorsThisMonth, completedThisMonth };
  }, [monthStart, visitors]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const username = email ? email.split("@")[0] : null;
  const roleLabel = username ? `Guard · ${username}` : "Guard";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={GUARD_TABS}>
      <Text style={styles.title}>Reports Dashboard</Text>
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
      <Text style={styles.note}>
        Exportable reports and full web-based admin dashboard will be implemented in the next phase.
      </Text>

      {loading ? (
        <Text style={styles.body}>Loading reports...</Text>
      ) : error ? (
        <Text style={styles.body}>{error}</Text>
      ) : visitors.length === 0 ? (
        <Text style={styles.body}>No visitor records found.</Text>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <MetricCard label="Total Visitors" value={summary.totalVisitors} />
            <MetricCard label="Active Visitors" value={summary.activeVisitors} />
            <MetricCard label="Completed Visitors" value={summary.completedVisitors} />
            <MetricCard label="Pending Visitors" value={summary.pendingVisitors} />
            <MetricCard label="Expired QR Passes" value={summary.expiredQrPasses} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purpose Counts</Text>
            <View style={styles.summaryGrid}>
              {Object.entries(purposeCounts).map(([label, value]) => (
                <MetricCard key={label} label={label} value={value} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Logs</Text>
            <View style={styles.summaryGrid}>
              <MetricCard label="Visitors Today" value={daily.visitorsToday} />
              <MetricCard label="Completed Today" value={daily.completedToday} />
              <MetricCard label="Active Today" value={daily.activeToday} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Logs</Text>
            <View style={styles.summaryGrid}>
              <MetricCard label="Visitors This Month" value={monthly.visitorsThisMonth} />
              <MetricCard label="Completed This Month" value={monthly.completedThisMonth} />
            </View>
          </View>
        </>
      )}
    </DashboardScreen>
  );
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// Philippines has no DST, so a fixed UTC+8 offset is safe — kept consistent
// with the approve_visitor RPC's own "Asia/Manila" expiration-time logic and
// admin-web's reportStats.ts, so guard-app and admin-web day/month
// boundaries agree regardless of the guard device's own timezone setting.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      MANILA_OFFSET_MS
  );
}

function startOfMonth(date: Date) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - MANILA_OFFSET_MS);
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  note: {
    fontSize: 12,
    color: NEU_DARK.textFaint,
    lineHeight: 18
  },
  body: {
    fontSize: 14,
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
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    backgroundColor: NEU_DARK.card,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    gap: 6
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  metricLabel: {
    fontSize: 12,
    color: NEU_DARK.textMuted,
    lineHeight: 16
  },
  section: {
    gap: 12,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NEU_DARK.white
  }
});
