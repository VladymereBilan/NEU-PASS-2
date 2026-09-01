import { useCallback, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getLatestApprovedOrActiveVisitor,
  requestCheckout
} from "../../src/services/PrototypeRegistrationStore";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";
import type { PressableInteractionState } from "../../src/types/PressableState";

export default function VisitorCheckoutScreen() {
  const { email } = useAuth();
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Request Checkout</Text>

        {loading ? (
          <Text style={styles.body}>Loading visitor pass...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : !pass ? (
          <Text style={styles.body}>
            No active visitor pass found. Please wait for guard approval.
          </Text>
        ) : (
          <View style={styles.content}>
            <Text style={styles.itemTitle}>{pass.fullName}</Text>
            <Text style={styles.itemText}>Purpose: {pass.purposeOfVisit}</Text>
            <Text style={styles.itemText}>
              Visitor Pass: {pass.visitorPassNumber}
            </Text>
            <Text style={styles.itemText}>
              Time In: {formatDate(pass.timeIn)}
            </Text>
            <Text style={styles.itemText}>
              Expiration: {formatDate(pass.expirationTime)}
            </Text>
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
                <Text
                  style={[styles.secondaryText, (pressed || hovered) && styles.secondaryTextActive]}
                >
                  Refresh
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef2ff"
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
  body: {
    fontSize: 14,
    color: "#4b5563"
  },
  content: {
    gap: 8
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
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  buttonActive: {
    backgroundColor: "#0f766e",
    transform: [{ scale: 1.01 }]
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryButtonActive: {
    backgroundColor: "#dfe8e5",
    transform: [{ scale: 1.01 }]
  },
  secondaryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryTextActive: {
    color: "#064A28"
  }
});
