import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

type Role = "visitor" | "guard" | null;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!selectedRole) {
      setError("Select a role to continue.");
      return;
    }

    setError("");
    signIn(selectedRole);

    // Future: replace with real authentication and session storage.
    if (selectedRole === "visitor") {
      router.replace("/(visitor)/home");
    } else {
      router.replace("/(guard)/home");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>NEU-Pass</Text>
        <Text style={styles.subtitle}>Role selection prototype</Text>

        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.roleButton,
              selectedRole === "visitor" && styles.roleButtonActive
            ]}
            onPress={() => setSelectedRole("visitor")}
          >
            <Text style={styles.roleText}>Visitor</Text>
          </Pressable>
          <Pressable
            style={[
              styles.roleButton,
              selectedRole === "guard" && styles.roleButtonActive
            ]}
            onPress={() => setSelectedRole("guard")}
          >
            <Text style={styles.roleText}>Guard</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Enter</Text>
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
    backgroundColor: "#f3f4f6"
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
    fontSize: 28,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb"
  },
  roleButtonActive: {
    borderColor: "#111827",
    backgroundColor: "#e5e7eb"
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  error: {
    color: "#b91c1c",
    fontSize: 13
  },
  loginButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  loginText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});
