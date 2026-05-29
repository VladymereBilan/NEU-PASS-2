import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

type BackButtonProps = {
  label?: string;
};

export default function BackButton({ label = "Back" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable style={styles.button} onPress={() => router.back()}>
      <Text style={styles.text}>{label}</Text>
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
  text: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600"
  }
});
