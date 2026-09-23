import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { PressableInteractionState } from "../types/PressableState";
import { NEU_DARK } from "../theme/brand";

type BackButtonProps = {
  label?: string;
};

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
    >
      {({ pressed, hovered }: PressableInteractionState) => (
        <MaterialCommunityIcons
          name="arrow-left"
          size={20}
          color={pressed || hovered ? NEU_DARK.emerald : NEU_DARK.white}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: NEU_DARK.card
  },
  buttonActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft,
    transform: [{ scale: 1.04 }]
  }
});
