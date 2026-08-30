import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { authStyles } from "../src/components/auth/authStyles";

export default function LoginScreen() {
  const router = useRouter();
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (role === "visitor") {
    return <Redirect href="/(visitor)/home" />;
  }

  if (role === "guard") {
    return <Redirect href="/(guard)/home" />;
  }

  return (
    <AuthScreen>
      <BrandHeader title="NEU-Pass" subtitle="Visitor Management System" />

      <Pressable style={authStyles.primaryButton} onPress={() => router.push("/visitor-login")}>
        <Text style={authStyles.primaryButtonText}>Visitor Login</Text>
      </Pressable>
      <Pressable style={authStyles.secondaryButton} onPress={() => router.push("/visitor-sign-up")}>
        <Text style={authStyles.secondaryButtonText}>Visitor Sign Up</Text>
      </Pressable>
      <Pressable style={authStyles.primaryButton} onPress={() => router.push("/guard-login")}>
        <Text style={authStyles.primaryButtonText}>Guard Login</Text>
      </Pressable>

      <Text style={authStyles.note}>
        Guard accounts are admin-managed. Visitors create their own accounts.
      </Text>
    </AuthScreen>
  );
}
