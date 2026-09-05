import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getLatestApprovedOrActiveVisitor,
  requestCheckout
} from "../../src/services/PrototypeRegistrationStore";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";
import type { PressableInteractionState } from "../../src/types/PressableState";

const VISITOR_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(visitor)/home" },
  { key: "visitor-pass", label: "My Pass", icon: "qrcode", route: "/(visitor)/visitor-pass" },
  { key: "checkout", label: "Checkout", icon: "logout-variant", route: "/(visitor)/checkout" },
  { key: "notifications", label: "Alerts", icon: "bell-outline", route: "/(visitor)/notifications" }
];

export default function VisitorCheckoutScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [pass, setPass] = useState<VisitorRegistration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleRequest = async () => {
    if (!pass || pass.checkoutStatus === "Checkout Requested") {
      return;
    }
    try {
      setSubmitting(true);
      await requestCheckout(pass.id);
      Alert.alert(
        "Checkout request sent. Please proceed to the guard for verification."
      );
      await refresh();
    } catch (err) {
      Alert.alert("Unable to request checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const roleLabel = pass?.fullName ? `Visitor · ${pass.fullName}` : "Visitor";

  return (
    <DashboardScreen roleLabel={roleLabel} onSignOut={() => void handleSignOut()} tabs={VISITOR_TABS}>
      <Text style={styles.screenTitle}>Request Checkout</Text>

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
          <Text style={styles.itemText}>Visitor Pass: {pass.visitorPassNumber}</Text>
          <Text style={styles.itemText}>Time In: {formatDate(pass.timeIn)}</Text>
          <Text style={styles.itemText}>Expiration: {formatDate(pass.expirationTime)}</Text>
          <Text style={styles.itemText}>QR Status: {pass.qrStatus}</Text>
          <Text style={styles.itemText}>Checkout Status: {pass.checkoutStatus}</Text>

          {pass.checkoutStatus === "Checkout Requested" ? (
            <Text style={styles.body}>
              Checkout already requested. Please proceed to the guard for verification.
            </Text>
          ) : (
            <Pressable
              style={({ pressed, hovered }: PressableInteractionState) => [
                styles.button,
                submitting && styles.buttonDisabled,
                (pressed || hovered) && !submitting && styles.buttonActive
              ]}
              onPress={handleRequest}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Requesting..." : "Request Checkout"}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed, hovered }: PressableInteractionState) => [
              styles.secondaryButton,
              (pressed || hovered) && styles.secondaryButtonActive
            ]}
            onPress={() => void refresh()}
          >
            {({ pressed, hovered }: PressableInteractionState) => (
              <Text style={[styles.secondaryText, (pressed || hovered) && styles.secondaryTextActive]}>
                Refresh
              </Text>
            )}
          </Pressable>
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
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: NEU_DARK.emeraldStrong,
    alignItems: "center"
  },
  buttonActive: {
    backgroundColor: "#0C8A62"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#04150C",
    fontSize: 15,
    fontWeight: "700"
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
  secondaryTextActive: {
    color: NEU_DARK.emerald
  }
});
