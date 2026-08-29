import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import { extractIdFields } from "../../src/services/OcrService";

type OcrForm = {
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
};

type OcrErrors = Partial<Record<keyof OcrForm, string>>;

export default function OcrReviewScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [form, setForm] = useState<OcrForm>({
    fullName: draft?.fullName ?? "",
    address: draft?.address ?? "",
    idType: draft?.idType ?? "",
    idNumber: draft?.idNumber ?? ""
  });
  const [errors, setErrors] = useState<OcrErrors>({});
  const [scanning, setScanning] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let active = true;

    if (!draft) {
      setScanning(false);
      return;
    }

    extractIdFields(draft.idImageUri)
      .then((result) => {
        if (!active) return;

        if (result.confidence === "none") {
          setStatusMessage(
            draft.idImageUri
              ? "Couldn't read the ID photo automatically — please review the fields below."
              : ""
          );
          return;
        }

        // OCR only ever overlays a field it actually found something for —
        // whatever the visitor already typed in the previous step stays as
        // the fallback for anything OCR missed.
        setForm((prev) => ({
          fullName: result.fields.fullName || prev.fullName,
          address: result.fields.address || prev.address,
          idType: result.fields.idType || prev.idType,
          idNumber: result.fields.idNumber || prev.idNumber
        }));
        setStatusMessage("Detected from ID — please review and correct anything below.");
      })
      .catch(() => {
        if (active) {
          setStatusMessage("Couldn't read the ID photo automatically — please review the fields below.");
        }
      })
      .finally(() => {
        if (active) setScanning(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Text style={styles.title}>OCR Review</Text>
        <Text style={styles.body}>
          Text detected from your ID is prefilled below — please review and correct anything
          that's wrong before continuing.
        </Text>

        {scanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator />
            <Text style={styles.scanningText}>Reading ID photo...</Text>
          </View>
        ) : statusMessage ? (
          <Text style={styles.status}>{statusMessage}</Text>
        ) : null}

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
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  scanningText: {
    fontSize: 13,
    color: "#4b5563"
  },
  status: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600"
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
