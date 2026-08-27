import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";

export default function PrivacyConsentScreen() {
  const router = useRouter();
  const { updateDraft } = useRegistrationDraft();

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
          <Pressable style={[styles.button, styles.accept]} onPress={handleAccept}>
            <Text style={styles.buttonText}>Accept</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.decline]} onPress={handleDecline}>
            <Text style={styles.buttonText}>Decline</Text>
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
  accept: {
    backgroundColor: "#111827"
  },
  decline: {
    backgroundColor: "#6b7280"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  }
});
