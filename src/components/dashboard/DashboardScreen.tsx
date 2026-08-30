import { useState, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NEU_COLORS } from "../../theme/brand";

type Props = {
  roleLabel: string;
  onSignOut: () => void;
  children: ReactNode;
};

// Shared chrome for the post-login dashboards (visitor/guard home): a slim
// branded header with sign-out, instead of each screen burying "Sign Out" as
// just another full-width button in the same stack as everything else.
export function DashboardScreen({ roleLabel, onSignOut, children }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/branding/neu-logo.webp")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.appName}>NEU-Pass</Text>
          <Text style={styles.roleLabel}>{roleLabel}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.signOut,
            (pressed || hovered) && styles.signOutActive
          ]}
          onPress={onSignOut}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          hitSlop={8}
        >
          <View style={styles.signOutContent}>
            <MaterialCommunityIcons
              name="door-open"
              size={14}
              color={NEU_COLORS.ink}
            />
            <Text style={[styles.signOutText, (hovered || false) && styles.signOutTextActive]}>
              Sign Out
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NEU_COLORS.screenBg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16
  },
  logo: {
    width: 36,
    height: 36
  },
  headerText: {
    flex: 1
  },
  appName: {
    fontSize: 16,
    fontWeight: "800",
    color: NEU_COLORS.ink
  },
  roleLabel: {
    fontSize: 12,
    color: NEU_COLORS.subtle,
    fontWeight: "600"
  },
  signOut: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NEU_COLORS.border,
    backgroundColor: NEU_COLORS.card
  },
  signOutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  signOutActive: {
    borderColor: NEU_COLORS.green,
    backgroundColor: NEU_COLORS.greenTint
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: NEU_COLORS.subtle
  },
  signOutTextActive: {
    color: NEU_COLORS.greenDark
  },
  content: {
    padding: 20,
    paddingTop: 4,
    gap: 16
  }
});
