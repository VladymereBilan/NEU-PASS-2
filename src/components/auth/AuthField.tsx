import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NEU_COLORS } from "../../theme/brand";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

// Labeled TextInput shared by every auth screen. When secureTextEntry is
// requested, adds a Show/Hide toggle instead of always masking the value —
// non-technical visitors/guards mistyping a password with no way to check it
// is a common source of failed-login confusion.
export function AuthField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none"
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, secureTextEntry && styles.inputWithToggle]}
        />
        {secureTextEntry ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={8}
          >
            <Text style={styles.toggleText}>{revealed ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600"
  },
  inputRow: {
    position: "relative",
    justifyContent: "center"
  },
  input: {
    borderWidth: 1,
    borderColor: NEU_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: NEU_COLORS.ink,
    backgroundColor: "#F9FBF9"
  },
  inputWithToggle: {
    paddingRight: 56
  },
  toggle: {
    position: "absolute",
    right: 12
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_COLORS.green
  }
});
