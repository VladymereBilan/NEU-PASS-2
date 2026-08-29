import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { guardUsernameToEmail } from "../src/lib/guardAuth";
import { supabase } from "../src/lib/supabaseClient";

export default function GuardLoginScreen() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("guard01");
  const [password, setPassword] = useState("guard123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (role === "guard") {
    return <Redirect href="/(guard)/home" />;
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: guardUsernameToEmail(username),
        password
      });
      if (authError || !data.user) throw new Error("Invalid guard username or password.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.account_status === "Blocked") {
        await supabase.auth.signOut();
        throw new Error("This guard account is blocked by admin.");
      }

      router.replace("/(guard)/home");
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : "Unable to log in.";
      setError(message);
      Alert.alert("Guard Login", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Guard Login</Text>
        <Text style={styles.subtitle}>Admin-managed accounts only.</Text>

        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
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
    backgroundColor: "#ecfeff"
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
  }
});
