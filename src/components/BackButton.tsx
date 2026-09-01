import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

type BackButtonProps = {
  label?: string;
};

export default function BackButton({ label = "Back" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed, hovered }) => [styles.button, (pressed || hovered) && styles.buttonActive]}
      onPress={() => router.back()}
    >
      <Text style={({ pressed, hovered }) => [styles.text, (pressed || hovered) && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb"
  },
  buttonActive: {
    backgroundColor: "#EAF5EE",
    transform: [{ scale: 1.02 }]
  },
  text: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  },
  textActive: {
    color: "#064A28"
  }
});
