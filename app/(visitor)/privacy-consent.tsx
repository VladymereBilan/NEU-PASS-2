import { useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";

export default function PrivacyConsentScreen() {
  const router = useRouter();
  const { updateDraft } = useRegistrationDraft();
  const [acceptHovered, setAcceptHovered] = useState(false);
  const [declineHovered, setDeclineHovered] = useState(false);

  const handleAccept = () => {
    updateDraft({ consentAccepted: true });
    Alert.alert("Consent accepted. You may continue to the next step.");
    router.push("/(visitor)/id-capture");
  };

  const handleDecline = () => {
    Alert.alert("Consent is required to continue registration.");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Privacy Consent Form</Text>
        <Text style={styles.body}>
          NEU-Pass collects personal information and facial image for visitor
          verification and campus security. This is in compliance with the Data
          Privacy Act of 2012 (Republic Act No. 10173).
        </Text>
        <View style={styles.statementBox}>
          <Text style={styles.statement}>
            I voluntarily consent to the collection, processing, and storage of my
            personal information and facial image for visitor verification, campus
            security, and access management purposes in accordance with the Data
            Privacy Act of 2012 (Republic Act No. 10173).
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryDecision,
              (pressed || acceptHovered) && styles.primaryDecisionActive
            ]}
            onPress={handleAccept}
            onHoverIn={() => setAcceptHovered(true)}
            onHoverOut={() => setAcceptHovered(false)}
          >
            <Text style={[styles.buttonText, (acceptHovered || false) && styles.buttonTextActive]}>Accept</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryDecision,
              (pressed || declineHovered) && styles.secondaryDecisionActive
            ]}
            onPress={handleDecline}
            onHoverIn={() => setDeclineHovered(true)}
            onHoverOut={() => setDeclineHovered(false)}
          >
            <Text style={[styles.buttonText, (declineHovered || false) && styles.buttonTextActive]}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
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
    gap: 16,
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
    color: "#4b5563",
    lineHeight: 20
  },
  statementBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12
  },
  statement: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 19
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryDecision: {
    backgroundColor: "#111827"
  },
  primaryDecisionActive: {
    backgroundColor: "#0F766E",
    transform: [{ scale: 1.01 }]
  },
  secondaryDecision: {
    backgroundColor: "#111827"
  },
  secondaryDecisionActive: {
    backgroundColor: "#0F766E",
    transform: [{ scale: 1.01 }]
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  },
  buttonTextActive: {
    color: "#EAF5EE"
  }
});
