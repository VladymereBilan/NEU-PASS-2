import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import BackButton from "../../src/components/BackButton";
import { useRouter } from "expo-router";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import { FaceVerificationStatus } from "../../src/services/FaceVerificationService";

const PURPOSE_OPTIONS = [
  "Inquiries",
  "Enrollment",
  "Tuition Fee Payment",
  "Other Payments",
  "Others"
];

type FormState = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  purpose: string;
  agenda: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  fullName: "",
  address: "",
  contactNumber: "",
  email: "",
  idType: "",
  idNumber: "",
  purpose: "",
  agenda: ""
};

export default function RegisterVisitScreen() {
  const router = useRouter();
  const { startDraft } = useRegistrationDraft();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPurposeOptions, setShowPurposeOptions] = useState(false);

  const isOthersSelected = useMemo(
    () => form.purpose === "Others",
    [form.purpose]
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full Name is required.";
    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.contactNumber.trim())
      nextErrors.contactNumber = "Contact Number is required.";
    if (!form.email.trim()) nextErrors.email = "Email Address is required.";
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (!form.idNumber.trim()) nextErrors.idNumber = "ID Number is required.";
    if (!form.purpose.trim()) nextErrors.purpose = "Purpose is required.";
    if (form.purpose === "Others" && !form.agenda.trim()) {
      nextErrors.agenda = "Please specify your agenda.";
    }

    return nextErrors;
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startDraft({
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      idType: form.idType.trim(),
      idNumber: form.idNumber.trim(),
      purposeOfVisit: form.purpose.trim(),
      otherAgenda: form.agenda.trim(),
      consentAccepted: false,
      ocrReviewed: false,
      faceVerificationStatus: FaceVerificationStatus.Pending
    });
    Alert.alert("Registration information saved for prototype.");
    router.push("/(visitor)/privacy-consent");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <BackButton />
          <Text style={styles.title}>Register Visit</Text>
          <Text style={styles.subtitle}>Provide your details below.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              placeholder="Juan Dela Cruz"
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
              placeholder="Full address"
              style={styles.input}
            />
            {errors.address ? (
              <Text style={styles.error}>{errors.address}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              value={form.contactNumber}
              onChangeText={(value) => updateField("contactNumber", value)}
              placeholder="09xxxxxxxxx"
              keyboardType="phone-pad"
              style={styles.input}
            />
            {errors.contactNumber ? (
              <Text style={styles.error}>{errors.contactNumber}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              placeholder="name@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            {errors.email ? (
              <Text style={styles.error}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ID Type</Text>
            <TextInput
              value={form.idType}
              onChangeText={(value) => updateField("idType", value)}
              placeholder="Government ID"
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
              placeholder="ID number"
              style={styles.input}
            />
            {errors.idNumber ? (
              <Text style={styles.error}>{errors.idNumber}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Purpose of Visit</Text>
            <Pressable
              style={styles.select}
              onPress={() => setShowPurposeOptions((prev) => !prev)}
            >
              <Text style={styles.selectText}>
                {form.purpose || "Select purpose"}
              </Text>
              <Text style={styles.selectCaret}>
                {showPurposeOptions ? "▲" : "▼"}
              </Text>
            </Pressable>
            {showPurposeOptions ? (
              <View style={styles.options}>
                {PURPOSE_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={styles.optionButton}
                    onPress={() => {
                      updateField("purpose", option);
                      if (option !== "Others") {
                        updateField("agenda", "");
                      }
                      setShowPurposeOptions(false);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {errors.purpose ? (
              <Text style={styles.error}>{errors.purpose}</Text>
            ) : null}
          </View>

          {isOthersSelected ? (
            <View style={styles.field}>
              <Text style={styles.label}>Please specify your agenda</Text>
              <TextInput
                value={form.agenda}
                onChangeText={(value) => updateField("agenda", value)}
                placeholder="Describe your agenda"
                style={styles.input}
              />
              {errors.agenda ? (
                <Text style={styles.error}>{errors.agenda}</Text>
              ) : null}
            </View>
          ) : null}

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2ff"
  },
  scrollContent: {
    padding: 24
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
  subtitle: {
    fontSize: 14,
    color: "#6b7280"
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
  select: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  selectText: {
    fontSize: 14,
    color: "#111827"
  },
  selectCaret: {
    fontSize: 12,
    color: "#6b7280"
  },
  options: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  optionText: {
    fontSize: 14,
    color: "#111827"
  },
  error: {
    fontSize: 12,
    color: "#b91c1c"
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});
