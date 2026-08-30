import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { authStyles } from "../src/components/auth/authStyles";

export default function LoginScreen() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const [visitorLoginHovered, setVisitorLoginHovered] = useState(false);
  const [visitorSignUpHovered, setVisitorSignUpHovered] = useState(false);
  const [guardLoginHovered, setGuardLoginHovered] = useState(false);

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

      <Pressable
        style={({ pressed }) => [
          authStyles.primaryButton,
          visitorLoginHovered && authStyles.primaryButtonHover,
          pressed && authStyles.primaryButtonPressed
        ]}
        onPress={() => router.push("/visitor-login")}
        onHoverIn={() => setVisitorLoginHovered(true)}
        onHoverOut={() => setVisitorLoginHovered(false)}
      >
        <Text style={authStyles.primaryButtonText}>Visitor Login</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          authStyles.secondaryButton,
          visitorSignUpHovered && authStyles.secondaryButtonHover,
          pressed && authStyles.secondaryButtonPressed
        ]}
        onPress={() => router.push("/visitor-sign-up")}
        onHoverIn={() => setVisitorSignUpHovered(true)}
        onHoverOut={() => setVisitorSignUpHovered(false)}
      >
        <Text style={authStyles.secondaryButtonText}>Visitor Sign Up</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          authStyles.primaryButton,
          guardLoginHovered && authStyles.primaryButtonHover,
          pressed && authStyles.primaryButtonPressed
        ]}
        onPress={() => router.push("/guard-login")}
        onHoverIn={() => setGuardLoginHovered(true)}
        onHoverOut={() => setGuardLoginHovered(false)}
      >
        <Text style={authStyles.primaryButtonText}>Guard Login</Text>
      </Pressable>

      <Text style={authStyles.note}>
        Guard accounts are admin-managed. Visitors create their own accounts.
      </Text>
    </AuthScreen>
  );
}
