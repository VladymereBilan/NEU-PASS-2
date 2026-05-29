import { Pressable, StyleSheet, Text } from "react-native";

type SignOutButtonProps = {
  onPress: () => void;
};

export default function SignOutButton({ onPress }: SignOutButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>Sign Out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  text: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  }
});
