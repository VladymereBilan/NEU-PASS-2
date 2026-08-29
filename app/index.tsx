import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (role === "visitor") {
    return <Redirect href="/(visitor)/home" />;
  }

  if (role === "guard") {
    return <Redirect href="/(guard)/home" />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>NEU-Pass</Text>
        <Text style={styles.subtitle}>Visitor-first mobile prototype</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/visitor-login")}
        >
          <Text style={styles.primaryButtonText}>Visitor Login</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/visitor-sign-up")}
        >
          <Text style={styles.secondaryButtonText}>Visitor Sign Up</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/guard-login")}
        >
          <Text style={styles.primaryButtonText}>Guard Login</Text>
        </Pressable>

        <Text style={styles.note}>
          Guard accounts are admin-managed. Visitors create their own accounts.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6"
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280"
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600"
  },
  note: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center"
  }
});
