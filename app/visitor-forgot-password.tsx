import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { AuthField } from "../src/components/auth/AuthField";
import { authStyles } from "../src/components/auth/authStyles";

type Step = "request" | "reset";

// Visitors sign up with a real email (unlike admin/guard's synthetic
// accounts), so Supabase's own resetPasswordForEmail can deliver directly —
// no custom email provider needed. This uses the emailed 6-digit code
// (verifyOtp) rather than the clickable magic link, since a mobile app
// can't reliably catch a deep link back into itself (especially in Expo
// Go, where the callback URL is machine/network-specific) — typing a code
// works identically everywhere.
export default function VisitorForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Enter your registered email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
    } catch {
      // Swallow — the outcome must look identical whether or not the
      // account exists, so a caller can't use this to enumerate accounts.
    } finally {
      setLoading(false);
      setMessage("If that email is registered, we've sent a 6-digit reset code to it.");
      setStep("reset");
    }
  };

  const handleReset = async () => {
    if (!code.trim()) {
      setError("Enter the code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery"
      });
      if (verifyError) {
        throw new Error("Invalid or expired code. Please request a new one.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw new Error(updateError.message);
      }

      await supabase.auth.signOut();
      Alert.alert("Password updated. Please sign in with your new password.");
      router.replace("/visitor-login");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <BrandHeader
        title="Forgot Password"
        subtitle={
          step === "request"
            ? "Enter your registered email to receive a reset code."
            : "Enter the code we emailed you and choose a new password."
        }
      />

      {step === "request" ? (
        <>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            icon="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {error ? <Text style={authStyles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              authStyles.primaryButton,
              (pressed || isHovered) && authStyles.primaryButtonHover,
              pressed && authStyles.primaryButtonPressed,
              loading && authStyles.primaryButtonDisabled
            ]}
            onPress={handleSendCode}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            disabled={loading}
          >
            <Text style={authStyles.primaryButtonText}>
              {loading ? "Sending..." : "Send Reset Code"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {message ? <Text style={authStyles.note}>{message}</Text> : null}

          <AuthField label="Reset Code" value={code} onChangeText={setCode} icon="numeric" />
          <AuthField
            label="New Password"
            value={password}
            onChangeText={setPassword}
            icon="lock"
            secureTextEntry
          />
          <AuthField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon="lock-check"
            secureTextEntry
          />

          {error ? <Text style={authStyles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              authStyles.primaryButton,
              (pressed || isHovered) && authStyles.primaryButtonHover,
              pressed && authStyles.primaryButtonPressed,
              loading && authStyles.primaryButtonDisabled
            ]}
            onPress={handleReset}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            disabled={loading}
          >
            <Text style={authStyles.primaryButtonText}>
              {loading ? "Resetting..." : "Reset Password"}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable
        style={({ pressed }) => [
          authStyles.linkButton,
          (isLinkHovered || pressed) && authStyles.linkButtonHover,
          pressed && authStyles.linkButtonPressed
        ]}
        onPress={() => router.replace("/visitor-login")}
        onHoverIn={() => setIsLinkHovered(true)}
        onHoverOut={() => setIsLinkHovered(false)}
      >
        <Text style={[authStyles.linkText, isLinkHovered && authStyles.linkTextHover]}>
          Back to Sign In
        </Text>
      </Pressable>
    </AuthScreen>
  );
}
