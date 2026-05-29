import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import BackButton from "../../src/components/BackButton";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";

type OcrForm = {
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
};

type OcrErrors = Partial<Record<keyof OcrForm, string>>;

const sampleData: OcrForm = {
  fullName: "Juan Dela Cruz",
  address: "Quezon City",
  idType: "School ID",
  idNumber: "NEU-2026-0001"
};

export default function OcrReviewScreen() {
  const router = useRouter();
  const { updateDraft } = useRegistrationDraft();
  const [form, setForm] = useState<OcrForm>({
    fullName: "",
    address: "",
    idType: "",
    idNumber: ""
  });
  const [errors, setErrors] = useState<OcrErrors>({});

  useEffect(() => {
    setForm(sampleData);
  }, []);

  const updateField = (key: keyof OcrForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): OcrErrors => {
    const nextErrors: OcrErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Full Name is required.";
    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (!form.idNumber.trim()) nextErrors.idNumber = "ID Number is required.";
    return nextErrors;
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    updateDraft({
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      idType: form.idType.trim(),
      idNumber: form.idNumber.trim(),
      ocrReviewed: true
    });
    router.push("/(visitor)/facial-verification");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>OCR Review</Text>
        <Text style={styles.body}>
          OCR extraction is prototype-only. Real OCR will be added in Capstone 2.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={form.fullName}
            onChangeText={(value) => updateField("fullName", value)}
            style={styles.input}
          />
          {errors.fullName ? (
            <Text style={styles.error}>{errors.fullName}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            value={form.address}
            onChangeText={(value) => updateField("address", value)}
            style={styles.input}
          />
          {errors.address ? (
            <Text style={styles.error}>{errors.address}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>ID Type</Text>
          <TextInput
            value={form.idType}
            onChangeText={(value) => updateField("idType", value)}
            style={styles.input}
          />
          {errors.idType ? (
            <Text style={styles.error}>{errors.idType}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>ID Number</Text>
          <TextInput
            value={form.idNumber}
            onChangeText={(value) => updateField("idNumber", value)}
            style={styles.input}
          />
          {errors.idNumber ? (
            <Text style={styles.error}>{errors.idNumber}</Text>
          ) : null}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryText}>Continue</Text>
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
  field: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    color: "#111827"
  },
  error: {
    fontSize: 12,
    color: "#b91c1c"
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});
