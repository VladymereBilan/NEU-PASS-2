import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function GuardLayout() {
  const { role } = useAuth();

  // Future: replace with persisted auth checks (AsyncStorage or secure store).
  if (role !== "guard") {
    return <Redirect href="/" />;
  }

  return <Stack />;
}
