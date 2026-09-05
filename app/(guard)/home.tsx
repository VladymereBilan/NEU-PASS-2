import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getActiveVisitors,
  getCheckoutRequests,
  getPendingRegistrations
} from "../../src/services/PrototypeRegistrationStore";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { StatusCard, type StatusTone } from "../../src/components/dashboard/StatusCard";
import { ActionGrid, ActionTile } from "../../src/components/dashboard/ActionTile";
import { Greeting } from "../../src/components/dashboard/Greeting";
import { authStyles } from "../../src/components/auth/authStyles";
import { NEU_DARK } from "../../src/theme/brand";

const GUARD_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(guard)/home" },
  { key: "pending", label: "Pending", icon: "account-clock-outline", route: "/(guard)/pending" },
  { key: "active-visitors", label: "Active", icon: "account-group-outline", route: "/(guard)/active-visitors" },
  { key: "reports", label: "Reports", icon: "chart-bar", route: "/(guard)/reports" }
];

type Counts = { pending: number; active: number; checkoutRequests: number };

type StatusView = {
  tone: StatusTone;
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaRoute: string;
};

function resolveStatusView(counts: Counts): StatusView {
  if (counts.pending > 0) {
    return {
      tone: "pending",
      badge: "Action Needed",
      title: `${counts.pending} Pending Verification${counts.pending === 1 ? "" : "s"}`,
      description: "New visitor registrations are waiting for your review.",
      ctaLabel: "Review Now",
      ctaRoute: "/(guard)/pending"
    };
  }

  if (counts.checkoutRequests > 0) {
    return {
      tone: "pending",
      badge: "Checkout Requests",
      title: `${counts.checkoutRequests} Waiting for Checkout`,
      description: "Visitors have requested checkout and need verification.",
      ctaLabel: "Verify Now",
      ctaRoute: "/(guard)/checkout"
    };
  }

  return {
    tone: "active",
    badge: "All Clear",
    title: "No pending actions",
    description: `${counts.active} visitor${counts.active === 1 ? " is" : "s are"} currently on campus.`,
    ctaLabel: "View Active Visitors",
    ctaRoute: "/(guard)/active-visitors"
  };
}

export default function GuardHomeScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [counts, setCounts] = useState<Counts>({ pending: 0, active: 0, checkoutRequests: 0 });
  const [loading, setLoading] = useState(true);
  const [ctaHovered, setCtaHovered] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, active, checkoutRequests] = await Promise.all([
        getPendingRegistrations(),
        getActiveVisitors(),
        getCheckoutRequests()
      ]);
      setCounts({
        pending: pending.length,
        active: active.length,
        checkoutRequests: checkoutRequests.length
      });
    } catch {
      setCounts({ pending: 0, active: 0, checkoutRequests: 0 });
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

  const statusView = useMemo(() => resolveStatusView(counts), [counts]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  // Guards don't have a fetched full name anywhere today — their username
  // (the part of their synthetic email before "@") is real, truthful, and
  // needs no extra query.
  const username = email ? email.split("@")[0] : null;
  const roleLabel = username ? `Guard · ${username}` : "Guard";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={GUARD_TABS}>
      <Greeting name={username} />

      {loading ? (
        <ActivityIndicator color={NEU_DARK.emerald} />
      ) : (
        <StatusCard
          tone={statusView.tone}
          badge={statusView.badge}
          title={statusView.title}
          description={statusView.description}
        >
          <Pressable
            style={({ pressed }) => [
              authStyles.primaryButton,
              styles.cardCta,
              (pressed || ctaHovered) && authStyles.primaryButtonHover,
              pressed && authStyles.primaryButtonPressed
            ]}
            onPress={() => router.push(statusView.ctaRoute as never)}
            onHoverIn={() => setCtaHovered(true)}
            onHoverOut={() => setCtaHovered(false)}
          >
            <Text style={authStyles.primaryButtonText}>{statusView.ctaLabel}</Text>
          </Pressable>
        </StatusCard>
      )}

      <Text style={styles.sectionLabel}>Today at a Glance</Text>
      <ActionGrid>
        <ActionTile
          label="Pending Verifications"
          description="New registrations to review"
          icon="account-clock-outline"
          tint="gold"
          count={counts.pending}
          onPress={() => router.push("/(guard)/pending")}
        />
        <ActionTile
          label="Active Visitors"
          description="Visitors currently on campus"
          icon="account-group-outline"
          tint="green"
          count={counts.active}
          onPress={() => router.push("/(guard)/active-visitors")}
        />
        <ActionTile
          label="Checkout Verification"
          description="Verify visitors exiting campus"
          icon="qrcode-scan"
          tint="blue"
          count={counts.checkoutRequests}
          onPress={() => router.push("/(guard)/checkout")}
        />
        <ActionTile
          label="Visitor Logs"
          description="Completed visit history"
          icon="format-list-bulleted"
          tint="neutral"
          onPress={() => router.push("/(guard)/visitor-logs")}
        />
        <ActionTile
          label="Reports"
          description="Daily and monthly summaries"
          icon="chart-bar"
          tint="neutral"
          onPress={() => router.push("/(guard)/reports")}
        />
      </ActionGrid>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  cardCta: {
    marginTop: 6
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_DARK.textMuted
  }
});
