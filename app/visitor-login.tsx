import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { authenticateVisitor } from "../src/repositories/AccountRepository";

export default function VisitorLoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authenticateVisitor(email, password);
      signIn("visitor");
      router.replace("/(visitor)/home");
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : "Unable to log in.";
      setError(message);
      Alert.alert("Visitor Login", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Visitor Login</Text>
        <Text style={styles.subtitle}>Use your registered email and password.</Text>

        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.push("/visitor-sign-up")}>
          <Text style={styles.linkText}>Create a visitor account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
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
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4
  },
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#f9fafb"
  },
  error: {
    color: "#b91c1c",
    fontSize: 13
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8
  },
  linkText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600"
  }
});
