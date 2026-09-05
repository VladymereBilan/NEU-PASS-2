import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useAuth } from "../src/context/AuthContext";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { BrandHeader } from "../src/components/auth/BrandHeader";
import { NEU_DARK } from "../src/theme/brand";

export default function LoginScreen() {
  const router = useRouter();
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (role === "visitor") {
    return <Redirect href="/(visitor)/home" />;
  }

  if (role === "guard") {
    return <Redirect href="/(guard)/home" />;
  }

  return (
    <AuthScreen variant="plain">
      <BrandHeader title="NEU PASS" subtitle="Visitor Management System" />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>SELECT ROLE</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.options}>
        <RoleOption
          variant="primary"
          icon="account"
          title="Visitor Login"
          subtitle="Access with existing account"
          onPress={() => router.push("/visitor-login")}
        />
        <RoleOption
          variant="secondary"
          icon="account-plus"
          title="Visitor Sign Up"
          subtitle="Create a new visitor account"
          onPress={() => router.push("/visitor-sign-up")}
        />
        <RoleOption
          variant="neutral"
          icon="shield-account"
          title="Guard Login"
          subtitle="Restricted · Admin-managed access"
          onPress={() => router.push("/guard-login")}
        />
      </View>

      <View style={styles.noteBox}>
        <MaterialCommunityIcons name="information-outline" size={16} color={NEU_DARK.textMuted} />
        <Text style={styles.noteText}>
          Guard accounts are admin-managed. Visitors create their own accounts.
        </Text>
      </View>
    </AuthScreen>
  );
}

type RoleOptionVariant = "primary" | "secondary" | "neutral";

function RoleOption({
  variant,
  icon,
  title,
  subtitle,
  onPress
}: {
  variant: RoleOptionVariant;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const palette = ROLE_OPTION_PALETTES[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: palette.iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={palette.iconColor} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: palette.titleColor }]}>{title}</Text>
        <Text style={[styles.optionSubtitle, { color: palette.subtitleColor }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={palette.chevronColor} />
    </Pressable>
  );
}

const ROLE_OPTION_PALETTES: Record<
  RoleOptionVariant,
  {
    background: string;
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    subtitleColor: string;
    chevronColor: string;
  }
> = {
  primary: {
    background: NEU_DARK.emeraldStrong,
    border: "transparent",
    iconBg: "rgba(255, 255, 255, 0.2)",
    iconColor: NEU_DARK.white,
    titleColor: NEU_DARK.white,
    subtitleColor: "rgba(255, 255, 255, 0.8)",
    chevronColor: NEU_DARK.white
  },
  secondary: {
    background: NEU_DARK.amberSoft,
    border: NEU_DARK.amber,
    iconBg: "rgba(251, 191, 36, 0.25)",
    iconColor: NEU_DARK.amber,
    titleColor: NEU_DARK.amber,
    subtitleColor: "rgba(251, 191, 36, 0.75)",
    chevronColor: NEU_DARK.textMuted
  },
  neutral: {
    background: NEU_DARK.card,
    border: NEU_DARK.border,
    iconBg: "rgba(255, 255, 255, 0.08)",
    iconColor: NEU_DARK.white,
    titleColor: NEU_DARK.white,
    subtitleColor: NEU_DARK.textMuted,
    chevronColor: NEU_DARK.textMuted
  }
};

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 20
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: NEU_DARK.border
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: NEU_DARK.textFaint
  },
  options: {
    gap: 14
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  optionText: {
    flex: 1,
    gap: 2
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700"
  },
  optionSubtitle: {
    fontSize: 12
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 28,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: NEU_DARK.card
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: NEU_DARK.textMuted
  }
});
