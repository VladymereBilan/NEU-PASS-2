import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function VisitorLayout() {
  const { role } = useAuth();

  // Future: replace with persisted auth checks (AsyncStorage or secure store).
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
      <Stack.Screen name="home" options={{ headerBackVisible: false }} />
    </Stack>
  );
}
