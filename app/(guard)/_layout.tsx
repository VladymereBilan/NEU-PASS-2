import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function GuardLayout() {
  const { role } = useAuth();

  // Future: replace with persisted auth checks (AsyncStorage or secure store).
  if (role !== "guard") {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        title: "Guard",
        headerStyle: { backgroundColor: "#111827" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" }
      }}
    >
      <Stack.Screen name="home" options={{ headerBackVisible: false }} />
    </Stack>
  );
}
