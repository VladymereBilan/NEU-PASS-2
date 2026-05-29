import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import BackButton from "../../src/components/BackButton";
import { getLatestApprovedOrActiveVisitor } from "../../src/services/PrototypeRegistrationStore";
import { generateQRValue } from "../../src/services/QRService";
import {
  getExpirationStatus,
  shouldShowExpirationWarning
} from "../../src/services/ExpirationService";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

export default function VisitorPassScreen() {
  const [pass, setPass] = useState<VisitorRegistration | null>(null);
  const [expirationStatus, setExpirationStatus] = useState("-");
  const [warningShown, setWarningShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const latest = await getLatestApprovedOrActiveVisitor();
      setPass(latest);
    } catch (err) {
      setError("Unable to load visitor pass.");
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

  const updateExpirationStatus = useCallback(() => {
    if (!pass || !pass.expirationTime) {
      setExpirationStatus("-");
      return;
    }
    setExpirationStatus(getExpirationStatus(pass.expirationTime));
  }, [pass]);

  useEffect(() => {
    updateExpirationStatus();
    setWarningShown(false);
  }, [pass, updateExpirationStatus]);

  useEffect(() => {
    if (!pass || warningShown) return;
    if (shouldShowExpirationWarning(pass.expirationTime)) {
      Alert.alert(
        "Your Visitor Pass will expire in 15 minutes. Please proceed to checkout."
      );
      setWarningShown(true);
    }
  }, [pass, warningShown]);

  const isExpired = expirationStatus === "Expired";

  const qrValue = useMemo(() => {
    if (!pass) return "";
    return generateQRValue(pass.id, pass.visitorPassNumber || "");
  }, [pass]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>My Visitor Pass</Text>

        {loading ? (
          <Text style={styles.body}>Loading visitor pass...</Text>
        ) : error ? (
          <Text style={styles.body}>{error}</Text>
        ) : !pass ? (
          <Text style={styles.body}>
            No active visitor pass found. Please wait for guard approval.
          </Text>
        ) : (
          <View style={styles.passContent}>
            <Text style={styles.itemTitle}>{pass.fullName}</Text>
            <Text style={styles.itemText}>Purpose: {pass.purposeOfVisit}</Text>
            {pass.purposeOfVisit === "Others" && pass.otherAgenda ? (
              <Text style={styles.itemText}>
                Other Agenda: {pass.otherAgenda}
              </Text>
            ) : null}
            <Text style={styles.itemText}>
              Visitor Pass: {pass.visitorPassNumber || "-"}
            </Text>
            <Text style={styles.itemText}>Time In: {formatDate(pass.timeIn)}</Text>
            <Text style={styles.itemText}>
              Expiration: {formatDate(pass.expirationTime)}
            </Text>
            <Text style={styles.itemText}>QR Status: {pass.qrStatus}</Text>
            <Text style={styles.itemText}>
              Expiration Status: {expirationStatus}
            </Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={updateExpirationStatus}
            >
              <Text style={styles.secondaryText}>Check Expiration Status</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => void refresh()}
            >
              <Text style={styles.secondaryText}>Refresh</Text>
            </Pressable>

            <Text style={styles.note}>
              Push notifications will be added in Capstone 2.
            </Text>

            {isExpired ? (
              <Text style={styles.warning}>
                Your visitor pass has expired. Please proceed to the guard for
                review.
              </Text>
            ) : null}

            <View style={styles.qrBox}>
              <QRCode value={qrValue} size={180} />
              <Text style={styles.qrTitle}>QR Code</Text>
              <Text style={styles.qrValue}>{qrValue}</Text>
            </View>
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
  passContent: {
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
  warning: {
    fontSize: 13,
    color: "#b91c1c",
    lineHeight: 19
  },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  note: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18
  },
  qrBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f9fafb",
    gap: 6,
    alignItems: "center"
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  qrValue: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center"
  }
});
