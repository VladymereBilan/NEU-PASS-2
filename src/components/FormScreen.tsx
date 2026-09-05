import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "./AppBackground";
import { NEU_DARK } from "../theme/brand";

// Shared chrome for in-app form/flow screens reached via push navigation
// (the visitor registration flow: register -> id-capture -> ocr-review ->
// privacy-consent -> facial-verification) — the same darkened campus
// background and card as AuthScreen/DashboardScreen, but without a header
// of its own, since these screens already get the native Stack header
// (dark bg, back button, "Visitor" title) from (visitor)/_layout.tsx's
// screenOptions. `edges` excludes "top" so this doesn't double up with that
// native header's own safe-area handling.
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <AppBackground>
      <SafeAreaView style={styles.flex} edges={["bottom", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>{children}</View>
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
    padding: 20,
    paddingBottom: 32
  },
  card: {
    backgroundColor: NEU_DARK.card,
    padding: 20,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder
  }
});
