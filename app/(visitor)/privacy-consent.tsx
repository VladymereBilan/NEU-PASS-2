import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import { FormScreen } from "../../src/components/FormScreen";
import { NEU_DARK } from "../../src/theme/brand";

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
    <FormScreen>
      <Text style={styles.title}>Privacy Consent Form</Text>
      <Text style={styles.body}>
        NEU-Pass collects personal information and facial image for visitor verification and
        campus security. This is in compliance with the Data Privacy Act of 2012 (Republic Act
        No. 10173).
      </Text>
      <View style={styles.statementBox}>
        <Text style={styles.statement}>
          I voluntarily consent to the collection, processing, and storage of my personal
          information and facial image for visitor verification, campus security, and access
          management purposes in accordance with the Data Privacy Act of 2012 (Republic Act No.
          10173).
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
          <Text style={styles.acceptText}>Accept</Text>
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
          <Text style={styles.buttonText}>Decline</Text>
        </Pressable>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  body: {
    fontSize: 14,
    color: NEU_DARK.textMuted,
    lineHeight: 20
  },
  statementBox: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14
  },
  statement: {
    fontSize: 13,
    color: NEU_DARK.textMuted,
    lineHeight: 19
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryDecision: {
    backgroundColor: NEU_DARK.emeraldStrong
  },
  primaryDecisionActive: {
    backgroundColor: "#0C8A62"
  },
  secondaryDecision: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  secondaryDecisionActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  buttonText: {
    color: NEU_DARK.white,
    fontSize: 15,
    fontWeight: "700"
  },
  acceptText: {
    color: "#04150C",
    fontSize: 15,
    fontWeight: "700"
  }
});
