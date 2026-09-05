import { useState, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "../AppBackground";
import { NEU_DARK } from "../../theme/brand";
import { BottomNavBar, type BottomNavTab } from "./BottomNavBar";

type Props = {
  roleLabel: string;
  onSignOut: () => void;
  tabs: BottomNavTab[];
  children: ReactNode;
};

// Shared chrome for the post-login dashboards (visitor/guard home + their
// linked tab screens): the same darkened campus background as the auth
// screens, a slim branded header with sign-out, and a bottom nav bar whose
// tabs are role-specific (see BottomNavBar.tsx for why it's a styled bar and
// not a real navigator).
export function DashboardScreen({ roleLabel, onSignOut, tabs, children }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <AppBackground>
      <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={NEU_DARK.emerald} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.appName}>NEU PASS</Text>
            <Text style={styles.roleLabel}>{roleLabel}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.signOut, (pressed || hovered) && styles.signOutActive]}
            onPress={onSignOut}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            hitSlop={8}
          >
            <View style={styles.signOutContent}>
              <MaterialCommunityIcons name="logout" size={14} color={NEU_DARK.white} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </SafeAreaView>
      <SafeAreaView edges={["bottom"]} style={styles.tabBarSafeArea}>
        <BottomNavBar tabs={tabs} />
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NEU_DARK.emeraldSoft,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder
  },
  headerText: {
    flex: 1
  },
  appName: {
    fontSize: 16,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  roleLabel: {
    fontSize: 12,
    color: NEU_DARK.emerald,
    fontWeight: "700"
  },
  signOut: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: NEU_DARK.card
  },
  signOutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  signOutActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_DARK.white
  },
  content: {
    padding: 20,
    paddingTop: 4,
    gap: 16
  },
  tabBarSafeArea: {
    backgroundColor: NEU_DARK.card
  }
});
