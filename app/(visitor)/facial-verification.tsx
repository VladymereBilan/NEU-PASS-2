import { useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import BackButton from "../../src/components/BackButton";
import {
  FaceVerificationStatus,
  type FaceVerificationStatusType,
  prototypeMode
} from "../../src/services/FaceVerificationService";
import { addRegistration } from "../../src/services/PrototypeRegistrationStore";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";

export default function FacialVerificationScreen() {
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useRegistrationDraft();
  const [status, setStatus] = useState<FaceVerificationStatusType>(
    FaceVerificationStatus.Pending
  );
  const [submitting, setSubmitting] = useState(false);

  const handleUseSample = () => {
    const nextStatus = prototypeMode();
    setStatus(nextStatus);
    updateDraft({ faceVerificationStatus: nextStatus });
  };

  const handleSubmit = async () => {
    if (!draft) {
      Alert.alert("Registration draft not found. Please start again.");
      router.replace("/");
      return;
    }

    const registration = {
      id: `REG-${Date.now()}`,
      fullName: draft.fullName,
      address: draft.address,
      contactNumber: draft.contactNumber,
      email: draft.email,
      idType: draft.idType,
      idNumber: draft.idNumber,
      purposeOfVisit: draft.purposeOfVisit,
      otherAgenda: draft.otherAgenda,
      consentAccepted: draft.consentAccepted,
      ocrReviewed: draft.ocrReviewed,
      faceVerificationStatus: draft.faceVerificationStatus || status,
      registrationStatus: "Pending" as const,
      timeIn: "",
      visitorPassNumber: "",
      qrStatus: "Inactive",
      expirationTime: "",
      checkoutStatus: "None",
      checkoutRequestedAt: "",
      timeOut: "",
      faceCheckoutVerificationStatus: "",
      createdAt: new Date().toISOString()
    };

    try {
      setSubmitting(true);
      await addRegistration(registration);
      clearDraft();
      Alert.alert("Registration submitted for guard verification.");
      router.replace("/(visitor)/home");
    } catch (error) {
      Alert.alert("Unable to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>Facial Verification</Text>
        <Text style={styles.body}>
          This step verifies that the visitor matches the submitted ID
          information.
        </Text>

        <View style={styles.previewBox}>
          <Text style={styles.previewText}>Face Image Preview</Text>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleUseSample}
        >
          <Text style={styles.secondaryText}>Use Sample Face Image</Text>
        </Pressable>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <Text style={styles.note}>
          Facial recognition is prototype-only. Real facial matching will be
          added in Capstone 2.
        </Text>

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryText}>
            {submitting ? "Submitting..." : "Submit for Guard Verification"}
          </Text>
        </Pressable>
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
  previewBox: {
    height: 180,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb"
  },
  previewText: {
    fontSize: 13,
    color: "#6b7280"
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600"
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827"
  },
  note: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  }
});
