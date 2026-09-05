import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getLatestVisitorRegistration } from "../../src/services/PrototypeRegistrationStore";
import { getExpirationStatus } from "../../src/services/ExpirationService";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { StatusCard, type StatusTone } from "../../src/components/dashboard/StatusCard";
import { ActionGrid, ActionTile } from "../../src/components/dashboard/ActionTile";
import { Greeting } from "../../src/components/dashboard/Greeting";
import { authStyles } from "../../src/components/auth/authStyles";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

const VISITOR_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(visitor)/home" },
  { key: "visitor-pass", label: "My Pass", icon: "qrcode", route: "/(visitor)/visitor-pass" },
  { key: "checkout", label: "Checkout", icon: "logout-variant", route: "/(visitor)/checkout" },
  { key: "notifications", label: "Alerts", icon: "bell-outline", route: "/(visitor)/notifications" }
];

type StatusView = {
  tone: StatusTone;
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaRoute: string;
};

function resolveStatusView(pass: VisitorRegistration | null): StatusView {
  if (!pass || pass.registrationStatus === "Completed") {
    return {
      tone: "neutral",
      badge: "No Active Visit",
      title: pass ? "Ready for your next visit?" : "Plan your visit",
      description: "Register a visit to get your pass approved by a guard.",
      ctaLabel: "Register Visit",
      ctaRoute: "/(visitor)/register"
    };
  }

  if (pass.registrationStatus === "Rejected") {
    return {
      tone: "danger",
      badge: "Registration Rejected",
      title: "Your last request was declined",
      description: "You can submit a new registration anytime.",
      ctaLabel: "Register Visit",
      ctaRoute: "/(visitor)/register"
    };
  }

  if (pass.registrationStatus === "Pending") {
    return {
      tone: "pending",
      badge: "Pending Approval",
      title: "Waiting for guard approval",
      description: "You'll be able to view your pass as soon as a guard reviews your registration.",
      ctaLabel: "View Status",
      ctaRoute: "/(visitor)/visitor-pass"
    };
  }

  if (pass.checkoutStatus === "Checkout Requested") {
    return {
      tone: "pending",
      badge: "Checkout Requested",
      title: `Pass ${pass.visitorPassNumber || "-"}`,
      description: "Your checkout request is waiting for a guard to verify.",
      ctaLabel: "View My Pass",
      ctaRoute: "/(visitor)/visitor-pass"
    };
  }

  const expirationStatus = pass.expirationTime ? getExpirationStatus(pass.expirationTime) : "Active";
  if (expirationStatus === "Expired") {
    return {
      tone: "danger",
      badge: "Expired",
      title: `Pass ${pass.visitorPassNumber || "-"}`,
      description: "Your pass has expired — please see a guard for checkout.",
      ctaLabel: "View My Pass",
      ctaRoute: "/(visitor)/visitor-pass"
    };
  }
  if (expirationStatus === "Near Expiration") {
    return {
      tone: "warning",
      badge: "Expiring Soon",
      title: `Pass ${pass.visitorPassNumber || "-"}`,
      description: "Your pass expires within 15 minutes. Please head to checkout.",
      ctaLabel: "View My Pass",
      ctaRoute: "/(visitor)/visitor-pass"
    };
  }

  return {
    tone: "active",
    badge: "Active Pass",
    title: `Pass ${pass.visitorPassNumber || "-"}`,
    description: pass.expirationTime
      ? `Valid until ${formatDate(pass.expirationTime)}`
      : "Your pass is active.",
    ctaLabel: "View My Pass",
    ctaRoute: "/(visitor)/visitor-pass"
  };
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function VisitorHomeScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [pass, setPass] = useState<VisitorRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [ctaHovered, setCtaHovered] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) {
      setPass(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const latest = await getLatestVisitorRegistration(email);
      setPass(latest);
    } catch {
      setPass(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh])
  );

  const statusView = useMemo(() => resolveStatusView(pass), [pass]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const roleLabel = pass?.fullName ? `Visitor · ${pass.fullName}` : "Visitor";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={VISITOR_TABS}>
      <Greeting name={pass?.fullName} />

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

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <ActionGrid>
        <ActionTile
          label="Register Visit"
          description="Submit a new visit request"
          icon="note-plus-outline"
          tint="green"
          onPress={() => router.push("/(visitor)/register")}
        />
        <ActionTile
          label="My Visitor Pass"
          description="View your QR entry pass"
          icon="qrcode"
          tint="blue"
          onPress={() => router.push("/(visitor)/visitor-pass")}
        />
        <ActionTile
          label="Request Checkout"
          description="Request to exit the campus"
          icon="logout-variant"
          tint="gold"
          onPress={() => router.push("/(visitor)/checkout")}
        />
        <ActionTile
          label="Notifications"
          description="Updates on your requests"
          icon="bell-outline"
          tint="neutral"
          onPress={() => router.push("/(visitor)/notifications")}
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
