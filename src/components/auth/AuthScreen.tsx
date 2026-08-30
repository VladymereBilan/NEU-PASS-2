import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NEU_COLORS } from "../../theme/brand";

// Shared chrome for every auth screen (landing, visitor login/sign-up, guard
// login): centers a card on a branded background, and — unlike the plain
// `justifyContent: "center"` View these screens used before — keeps fields
// reachable above the keyboard on shorter phones via KeyboardAvoidingView +
// a scrollable container instead of letting the keyboard cover them.
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  screen: {
    flex: 1,
    backgroundColor: NEU_COLORS.screenBg
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: NEU_COLORS.card,
    padding: 24,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: NEU_COLORS.border,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3
  }
});
