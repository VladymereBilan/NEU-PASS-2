import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, SafeAreaView } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

export default function VisitorLayout() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (role !== "visitor") {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        title: "Visitor",
        headerStyle: { backgroundColor: "#111827" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" }
      }}
    >
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="visitor-pass" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}
