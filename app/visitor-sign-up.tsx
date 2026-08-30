import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { AuthField } from "../src/components/auth/AuthField";
import { authStyles } from "../src/components/auth/authStyles";

export default function VisitorSignUpScreen() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!email.includes("@")) return "Enter a valid email address.";
    if (!contactNumber.trim()) return "Contact number is required.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Password and confirm password must match.";
    return "";
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            contact_number: contactNumber.trim()
          }
        }
      });
      if (authError) throw new Error(authError.message);
      router.replace("/(visitor)/home");
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : "Unable to create account.";
      setError(message);
      Alert.alert("Visitor Sign Up", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <BrandHeader title="Visitor Sign Up" subtitle="Create your visitor account first." />

      <AuthField label="Full Name" value={fullName} onChangeText={setFullName} />
      <AuthField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <AuthField label="Contact Number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
      <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <AuthField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          authStyles.primaryButton,
          isHovered && authStyles.primaryButtonHover,
          pressed && authStyles.primaryButtonPressed,
          loading && authStyles.primaryButtonDisabled
        ]}
        onPress={handleSignUp}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        disabled={loading}
      >
        <Text style={authStyles.primaryButtonText}>{loading ? "Creating..." : "Create Account"}</Text>
      </Pressable>

      <Pressable style={authStyles.linkButton} onPress={() => router.push("/visitor-login")}>
        <Text style={authStyles.linkText}>Already have an account? Sign in</Text>
      </Pressable>
    </AuthScreen>
  );
}
