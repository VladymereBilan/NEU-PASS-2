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
          size={22}
          color="#000000"
          style={(pressed || hovered) && styles.iconActive}
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
    backgroundColor: NEU_DARK.emerald
  },
  buttonActive: {
    backgroundColor: NEU_DARK.emeraldStrong,
    transform: [{ scale: 1.04 }]
  },
  iconActive: {
    opacity: 0.7
  }
});
