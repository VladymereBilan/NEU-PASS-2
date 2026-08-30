import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { supabase } from "../src/lib/supabaseClient";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { AuthField } from "../src/components/auth/AuthField";
import { authStyles } from "../src/components/auth/authStyles";

export default function VisitorLoginScreen() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (role === "visitor") {
    return <Redirect href="/(visitor)/home" />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (authError || !data.user) throw new Error(authError?.message ?? "Unable to log in.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.account_status === "Blocked") {
        await supabase.auth.signOut();
        throw new Error("This visitor account is blocked.");
      }

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
    <AuthScreen>
      <BrandHeader title="Visitor Login" subtitle="Use your registered email and password." />

      <AuthField label="Email" value={email} onChangeText={setEmail} icon="email" keyboardType="email-address" autoCapitalize="none" />
      <AuthField label="Password" value={password} onChangeText={setPassword} icon="lock" secureTextEntry />

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          authStyles.primaryButton,
          isHovered && authStyles.primaryButtonHover,
          pressed && authStyles.primaryButtonPressed,
          loading && authStyles.primaryButtonDisabled
        ]}
        onPress={handleLogin}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        disabled={loading}
      >
        <Text style={authStyles.primaryButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
      </Pressable>

      <Pressable style={authStyles.linkButton} onPress={() => router.push("/visitor-sign-up")}>
        <Text style={authStyles.linkText}>Create a visitor account</Text>
      </Pressable>
    </AuthScreen>
  );
}
