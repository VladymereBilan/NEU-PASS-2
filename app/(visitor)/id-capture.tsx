import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import BackButton from "../../src/components/BackButton";

export default function IdCaptureScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BackButton />
        <Text style={styles.title}>ID Capture</Text>
        <Text style={styles.body}>
          Capture or upload your valid ID for verification.
        </Text>

        <View style={styles.previewBox}>
          <Text style={styles.previewText}>ID Image Preview</Text>
        </View>

        <Pressable style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryText}>Use Sample ID Image</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/(visitor)/ocr-review")}
        >
          <Text style={styles.primaryText}>Continue to OCR Review</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef2ff"
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
  body: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20
  },
  previewBox: {
    height: 180,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb"
  },
  previewText: {
    fontSize: 13,
    color: "#6b7280"
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600"
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  }
});
