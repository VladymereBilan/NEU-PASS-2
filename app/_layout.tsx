import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { RegistrationDraftProvider } from "../src/context/RegistrationDraftContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RegistrationDraftProvider>
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#111827" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "600" }
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="visitor-login" options={{ headerShown: false }} />
          <Stack.Screen name="visitor-sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="guard-login" options={{ headerShown: false }} />
        </Stack>
      </RegistrationDraftProvider>
    </AuthProvider>
  );
}
// james