import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getAllVisitors } from "../../src/repositories/VisitorRepository";
import {
  PURPOSE_OPTIONS,
  type VisitorRegistration
} from "../../src/types/VisitorRegistration";

type MetricCardProps = {
  label: string;
  value: number;
};

export default function ReportsScreen() {
  const [visitors, setVisitors] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      activeVisitors: visitors.filter((v) => v.registrationStatus === "Active")
        .length,
      completedVisitors: visitors.filter((v) => v.checkoutStatus === "Completed")
        .length,
      pendingVisitors: visitors.filter((v) => v.registrationStatus === "Pending")
        .length,
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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Reports Dashboard</Text>
          <Pressable style={styles.refreshButton} onPress={() => void refresh()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
          <Text style={styles.note}>
            Exportable reports and full web-based admin dashboard will be
            implemented in the next phase.
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
                <MetricCard
                  label="Completed Visitors"
                  value={summary.completedVisitors}
                />
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
                  <MetricCard
                    label="Visitors This Month"
                    value={monthly.visitorsThisMonth}
                  />
                  <MetricCard
                    label="Completed This Month"
                    value={monthly.completedThisMonth}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ecfeff"
  },
  content: {
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
    fontSize: 22,
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827"
  },
  metricLabel: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 16
  },
  section: {
    gap: 12,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  }
});
