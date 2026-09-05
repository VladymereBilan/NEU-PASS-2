import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "../AppBackground";
import { NEU_DARK } from "../../theme/brand";

// Shared chrome for every auth screen (landing, visitor login/sign-up, guard
// login): the darkened campus photo background (via AppBackground, shared
// with the post-login dashboards), and — unlike a plain
// `justifyContent: "center"` View — keeps fields reachable above the
// keyboard on shorter phones via KeyboardAvoidingView + a scrollable
// container instead of letting the keyboard cover them.
//
// `variant="card"` (the default) wraps children in the translucent glass
// card used by the form screens (login/sign-up). `variant="plain"` renders
// children directly against the background, for the landing screen's
// full-bleed role-selection layout.
export function AuthScreen({
  children,
  variant = "card"
}: {
  children: ReactNode;
  variant?: "card" | "plain";
}) {
  return (
    <AppBackground>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {variant === "card" ? <View style={styles.card}>{children}</View> : children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: NEU_DARK.card,
    padding: 24,
    borderRadius: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder
  }
});
