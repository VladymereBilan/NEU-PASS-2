import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useRegistrationDraft } from "../../src/context/RegistrationDraftContext";
import { FaceVerificationStatus } from "../../src/services/FaceVerificationService";
import {
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN,
  PURPOSE_OPTIONS
} from "../../src/types/VisitorRegistration";
import { FormScreen } from "../../src/components/FormScreen";
import { NEU_DARK } from "../../src/theme/brand";

type FormState = {
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  idType: string;
  idDescription: string;
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
  idDescription: "",
  idNumber: "",
  purpose: "",
  agenda: ""
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function RegisterVisitScreen() {
  const router = useRouter();
  const { email: accountEmail } = useAuth();
  const { startDraft } = useRegistrationDraft();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialState,
    email: accountEmail || ""
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPurposeOptions, setShowPurposeOptions] = useState(false);
  const [showIdTypeOptions, setShowIdTypeOptions] = useState(false);
  const [idTypeHovered, setIdTypeHovered] = useState(false);
  const [purposeHovered, setPurposeHovered] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);

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

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full Name is required.";
    } else if (
      !NAME_LETTER_PATTERN.test(form.fullName) ||
      NAME_DIGIT_PATTERN.test(form.fullName)
    ) {
      nextErrors.fullName = "Full Name must contain letters and cannot contain numbers.";
    }
    if (!form.address.trim()) {
      nextErrors.address = "Address is required.";
    } else if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(form.address) || !/\d/.test(form.address)) {
      nextErrors.address = "Address must contain both letters and a number.";
    }
    if (!form.contactNumber.trim())
      nextErrors.contactNumber = "Contact Number is required.";
    if (!form.email.trim()) {
      nextErrors.email = "Email Address is required.";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.idType.trim()) nextErrors.idType = "ID Type is required.";
    if (form.idType === "Other" && !form.idDescription.trim()) {
      nextErrors.idDescription = "Please specify the type of ID.";
    }
    if (!form.idNumber.trim()) {
      nextErrors.idNumber = "ID Number is required.";
    } else if (!ID_NUMBER_PATTERN.test(form.idNumber.trim())) {
      nextErrors.idNumber = "ID Number must contain numbers and may also contain letters.";
    }
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
      idType:
        form.idType === "Other"
          ? `Other: ${form.idDescription.trim()}`
          : form.idType.trim(),
      idNumber: form.idNumber.trim(),
      idImageUri: "",
      purposeOfVisit: form.purpose.trim(),
      otherAgenda: form.agenda.trim(),
      consentAccepted: false,
      ocrReviewed: false,
      faceVerificationStatus: FaceVerificationStatus.Pending,
      faceImageUri: ""
    });
    Alert.alert("Registration information saved for prototype.");
    router.push("/(visitor)/privacy-consent");
  };

  return (
    <FormScreen>
      <Text style={styles.title}>Register Visit</Text>
      <Text style={styles.subtitle}>Provide your details below.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={form.fullName}
          onChangeText={(value) => updateField("fullName", value)}
          placeholder="Juan Dela Cruz"
          placeholderTextColor={NEU_DARK.textFaint}
          style={styles.input}
        />
        {errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          value={form.address}
          onChangeText={(value) => updateField("address", value)}
          placeholder="Full address"
          placeholderTextColor={NEU_DARK.textFaint}
          style={styles.input}
        />
        {errors.address ? <Text style={styles.error}>{errors.address}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          value={form.contactNumber}
          onChangeText={(value) => updateField("contactNumber", value)}
          placeholder="09xxxxxxxxx"
          placeholderTextColor={NEU_DARK.textFaint}
          keyboardType="phone-pad"
          style={styles.input}
        />
        {errors.contactNumber ? <Text style={styles.error}>{errors.contactNumber}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          value={form.email}
          onChangeText={(value) => updateField("email", value)}
          placeholder="name@email.com"
          placeholderTextColor={NEU_DARK.textFaint}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>ID Type</Text>
        <Pressable
          style={({ pressed }) => [
            styles.select,
            (pressed || idTypeHovered || showIdTypeOptions) && styles.selectActive
          ]}
          onPress={() => setShowIdTypeOptions((prev) => !prev)}
          onHoverIn={() => setIdTypeHovered(true)}
          onHoverOut={() => setIdTypeHovered(false)}
        >
          <Text style={form.idType ? styles.selectText : styles.placeholderText}>
            {form.idType || "Select ID type"}
          </Text>
          <Text style={styles.selectCaret}>{showIdTypeOptions ? "▲" : "▼"}</Text>
        </Pressable>
        {showIdTypeOptions ? (
          <View style={styles.options}>
            {ID_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonActive]}
                onPress={() => {
                  updateField("idType", option);
                  if (option !== "Other") {
                    updateField("idDescription", "");
                  }
                  setShowIdTypeOptions(false);
                }}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {errors.idType ? <Text style={styles.error}>{errors.idType}</Text> : null}
      </View>

      {form.idType === "Other" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Specify ID Type</Text>
          <TextInput
            value={form.idDescription}
            onChangeText={(value) => updateField("idDescription", value)}
            placeholder="e.g. Foreign passport or residence permit"
            placeholderTextColor={NEU_DARK.textFaint}
            style={styles.input}
          />
          {errors.idDescription ? <Text style={styles.error}>{errors.idDescription}</Text> : null}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>ID Number</Text>
        <TextInput
          value={form.idNumber}
          onChangeText={(value) => updateField("idNumber", value)}
          placeholder="ID number"
          placeholderTextColor={NEU_DARK.textFaint}
          style={styles.input}
        />
        {errors.idNumber ? <Text style={styles.error}>{errors.idNumber}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Purpose of Visit</Text>
        <Pressable
          style={({ pressed }) => [
            styles.select,
            (pressed || purposeHovered || showPurposeOptions) && styles.selectActive
          ]}
          onPress={() => setShowPurposeOptions((prev) => !prev)}
          onHoverIn={() => setPurposeHovered(true)}
          onHoverOut={() => setPurposeHovered(false)}
        >
          <Text style={form.purpose ? styles.selectText : styles.placeholderText}>
            {form.purpose || "Select purpose"}
          </Text>
          <Text style={styles.selectCaret}>{showPurposeOptions ? "▲" : "▼"}</Text>
        </Pressable>
        {showPurposeOptions ? (
          <View style={styles.options}>
            {PURPOSE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonActive]}
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
        {errors.purpose ? <Text style={styles.error}>{errors.purpose}</Text> : null}
      </View>

      {isOthersSelected ? (
        <View style={styles.field}>
          <Text style={styles.label}>Please specify your agenda</Text>
          <TextInput
            value={form.agenda}
            onChangeText={(value) => updateField("agenda", value)}
            placeholder="Describe your agenda"
            placeholderTextColor={NEU_DARK.textFaint}
            style={styles.input}
          />
          {errors.agenda ? <Text style={styles.error}>{errors.agenda}</Text> : null}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          (pressed || submitHovered) && styles.submitButtonActive
        ]}
        onPress={handleSubmit}
        onHoverIn={() => setSubmitHovered(true)}
        onHoverOut={() => setSubmitHovered(false)}
      >
        <Text style={styles.submitText}>Submit</Text>
      </Pressable>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  subtitle: {
    fontSize: 14,
    color: NEU_DARK.textMuted
  },
  field: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_DARK.textMuted
  },
  input: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: NEU_DARK.inputBg,
    color: NEU_DARK.white
  },
  select: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: NEU_DARK.inputBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  selectActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  selectText: {
    fontSize: 14,
    color: NEU_DARK.white
  },
  placeholderText: {
    fontSize: 14,
    color: NEU_DARK.textFaint
  },
  selectCaret: {
    fontSize: 12,
    color: NEU_DARK.textMuted
  },
  options: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: NEU_DARK.card,
    overflow: "hidden"
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: NEU_DARK.border
  },
  optionButtonActive: {
    backgroundColor: NEU_DARK.emeraldSoft
  },
  optionText: {
    fontSize: 14,
    color: NEU_DARK.white
  },
  error: {
    fontSize: 12,
    color: NEU_DARK.red
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NEU_DARK.emeraldStrong,
    alignItems: "center"
  },
  submitButtonActive: {
    backgroundColor: "#0C8A62"
  },
  submitText: {
    color: "#04150C",
    fontSize: 16,
    fontWeight: "700"
  }
});
