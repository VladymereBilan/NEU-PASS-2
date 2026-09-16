import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#111827" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "600" }
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="guard-login" options={{ headerShown: false }} />
          <Stack.Screen name="(guard)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
