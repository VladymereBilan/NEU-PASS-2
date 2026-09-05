import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { NEU_DARK } from "../../src/theme/brand";

const VISITOR_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(visitor)/home" },
  { key: "visitor-pass", label: "My Pass", icon: "qrcode", route: "/(visitor)/visitor-pass" },
  { key: "checkout", label: "Checkout", icon: "logout-variant", route: "/(visitor)/checkout" },
  { key: "notifications", label: "Alerts", icon: "bell-outline", route: "/(visitor)/notifications" }
];

export default function VisitorNotificationsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <DashboardScreen roleLabel="Visitor" onSignOut={() => void handleSignOut()} tabs={VISITOR_TABS}>
      <View style={styles.card}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.body}>Placeholder for visitor notifications.</Text>
      </View>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEU_DARK.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: NEU_DARK.white
  },
  body: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  }
});
