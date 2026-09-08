import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { guardUsernameToEmail } from "../src/lib/guardAuth";
import { supabase } from "../src/lib/supabaseClient";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { AuthField } from "../src/components/auth/AuthField";
import { authStyles } from "../src/components/auth/authStyles";
import BackButton from "../src/components/BackButton";

export default function GuardLoginScreen() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [username, setUsername] = useState("guard01");
  const [password, setPassword] = useState("guard123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
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
    <AuthScreen>
      <BackButton />
      <BrandHeader title="Guard Login" subtitle="Admin-managed accounts only." />

      <AuthField label="Username" value={username} onChangeText={setUsername} icon="account" autoCapitalize="none" />
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
    </AuthScreen>
  );
}
