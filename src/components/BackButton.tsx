import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import type { PressableInteractionState } from "../types/PressableState";
import { NEU_DARK } from "../theme/brand";

type BackButtonProps = {
  label?: string;
};

// Flat "< Back" text link (no circular chip) — matches the guard-facing
// screens' reference design. Shared by guard-login and every guard screen
// that isn't part of the bottom tab bar (checkout, visitor-logs), so a
// change here is intentionally global rather than a per-screen override.
export default function BackButton({ label = "Back" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed, hovered }: PressableInteractionState) => [
        styles.button,
        (pressed || hovered) && styles.buttonActive
      ]}
      onPress={() => router.back()}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
    >
      {({ pressed, hovered }: PressableInteractionState) => (
        <>
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={pressed || hovered ? NEU_DARK.emerald : NEU_DARK.white}
          />
          <Text style={[styles.label, (pressed || hovered) && styles.labelActive]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 10
  },
  buttonActive: {
    opacity: 0.85
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: NEU_DARK.white
  },
  labelActive: {
    color: NEU_DARK.emerald
  }
});
