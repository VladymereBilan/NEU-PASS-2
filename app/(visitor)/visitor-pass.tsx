import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../../src/context/AuthContext";
import { getLatestApprovedOrActiveVisitor } from "../../src/services/PrototypeRegistrationStore";
import { generateQRValue } from "../../src/services/QRService";
import {
  getExpirationStatus,
  shouldShowExpirationWarning
} from "../../src/services/ExpirationService";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

const VISITOR_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(visitor)/home" },
  { key: "visitor-pass", label: "My Pass", icon: "qrcode", route: "/(visitor)/visitor-pass" },
  { key: "checkout", label: "Checkout", icon: "logout-variant", route: "/(visitor)/checkout" },
  { key: "notifications", label: "Alerts", icon: "bell-outline", route: "/(visitor)/notifications" }
];

export default function VisitorPassScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [pass, setPass] = useState<VisitorRegistration | null>(null);
  const [expirationStatus, setExpirationStatus] = useState("-");
  const [warningShown, setWarningShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondaryHovered, setSecondaryHovered] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) {
      setPass(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const latest = await getLatestApprovedOrActiveVisitor(email);
      setPass(latest);
    } catch (err) {
      setError("Unable to load visitor pass.");
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

  // Ticks every 30s while a pass is loaded so expiration status/the
  // near-expiration warning stay live for a visitor who leaves this screen
  // open, rather than only updating on focus or a manual refresh tap.
  const [tick, setTick] = useState(0);

  const updateExpirationStatus = useCallback(() => {
    if (!pass || !pass.expirationTime) {
      setExpirationStatus("-");
      return;
    }
    setExpirationStatus(getExpirationStatus(pass.expirationTime));
  }, [pass]);

  useEffect(() => {
    setWarningShown(false);
  }, [pass]);

  useEffect(() => {
    updateExpirationStatus();
  }, [pass, tick, updateExpirationStatus]);

  useEffect(() => {
    if (!pass || warningShown) return;
    if (shouldShowExpirationWarning(pass.expirationTime)) {
      Alert.alert(
        "Your Visitor Pass will expire in 15 minutes. Please proceed to checkout."
      );
      setWarningShown(true);
    }
  }, [pass, tick, warningShown]);

  useEffect(() => {
    if (!pass) return undefined;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [pass]);

  const isExpired = expirationStatus === "Expired";

  const qrValue = useMemo(() => {
    if (!pass) return "";
    return generateQRValue(pass.id, pass.visitorPassNumber || "");
  }, [pass]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const roleLabel = pass?.fullName ? `Visitor · ${pass.fullName}` : "Visitor";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={VISITOR_TABS}>
      <Text style={styles.screenTitle}>My Visitor Pass</Text>

      {loading ? (
        <ActivityIndicator color={NEU_DARK.emerald} />
      ) : error ? (
        <Text style={styles.body}>{error}</Text>
      ) : !pass ? (
        <Text style={styles.body}>No active visitor pass found. Please wait for guard approval.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.itemTitle}>{pass.fullName}</Text>
          <Text style={styles.itemText}>Purpose: {pass.purposeOfVisit}</Text>
          {pass.purposeOfVisit === "Others" && pass.otherAgenda ? (
            <Text style={styles.itemText}>Other Agenda: {pass.otherAgenda}</Text>
          ) : null}
          <Text style={styles.itemText}>Visitor Pass: {pass.visitorPassNumber || "-"}</Text>
          <Text style={styles.itemText}>Time In: {formatDate(pass.timeIn)}</Text>
          <Text style={styles.itemText}>Expiration: {formatDate(pass.expirationTime)}</Text>
          <Text style={styles.itemText}>QR Status: {pass.qrStatus}</Text>
          <Text style={styles.itemText}>Expiration Status: {expirationStatus}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || secondaryHovered) && styles.secondaryButtonActive
            ]}
            onPress={updateExpirationStatus}
            onHoverIn={() => setSecondaryHovered(true)}
            onHoverOut={() => setSecondaryHovered(false)}
          >
            <Text style={styles.secondaryText}>Check Expiration Status</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || secondaryHovered) && styles.secondaryButtonActive
            ]}
            onPress={() => void refresh()}
            onHoverIn={() => setSecondaryHovered(true)}
            onHoverOut={() => setSecondaryHovered(false)}
          >
            <Text style={styles.secondaryText}>Refresh</Text>
          </Pressable>

          {isExpired ? (
            <Text style={styles.warning}>
              Your visitor pass has expired. Please proceed to the guard for review.
            </Text>
          ) : null}

          {/* QR codes need light-on-dark contrast to scan reliably, so this
              box stays light regardless of the surrounding dark theme. */}
          <View style={styles.qrBox}>
            <QRCode value={qrValue} size={180} />
            <Text style={styles.qrTitle}>QR Code</Text>
            <Text style={styles.qrValue}>{qrValue}</Text>
          </View>
        </View>
      )}
    </DashboardScreen>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  body: {
    fontSize: 14,
    color: NEU_DARK.textMuted
  },
  card: {
    backgroundColor: NEU_DARK.card,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    gap: 8
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
  warning: {
    fontSize: 13,
    color: NEU_DARK.red,
    lineHeight: 19
  },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center"
  },
  secondaryButtonActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  secondaryText: {
    color: NEU_DARK.white,
    fontSize: 14,
    fontWeight: "600"
  },
  qrBox: {
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F9FAFB",
    gap: 6,
    alignItems: "center"
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  qrValue: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center"
  }
});
