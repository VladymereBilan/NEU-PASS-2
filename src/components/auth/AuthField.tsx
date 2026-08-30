import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NEU_COLORS } from "../../theme/brand";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
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
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none"
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {icon ? (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={icon} size={18} color={NEU_COLORS.green} />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            secureTextEntry && styles.inputWithToggle
          ]}
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
  iconContainer: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: [{ translateY: -9 }],
    zIndex: 1
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
  inputWithIcon: {
    paddingLeft: 42
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
