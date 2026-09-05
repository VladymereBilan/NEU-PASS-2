import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { NEU_DARK } from "../../theme/brand";

export type BottomNavTab = {
  key: string;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  route: Href;
};

// A styled bottom bar, not a real navigator — deliberately, so switching
// tabs is just router.replace() to an existing Stack screen instead of
// restructuring routes (see the redesign plan's "Implementation approach"
// section for why: it keeps every existing router.push/replace call in the
// registration flow and guard checkout untouched).
export function BottomNavBar({ tabs }: { tabs: BottomNavTab[] }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active = pathname === tab.route || pathname.endsWith(`/${tab.key}`);

        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => {
              if (!active) router.replace(tab.route);
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={22}
              color={active ? NEU_DARK.emerald : NEU_DARK.textFaint}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: NEU_DARK.border,
    backgroundColor: NEU_DARK.card,
    paddingTop: 10,
    paddingBottom: 6
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: NEU_DARK.textFaint
  },
  labelActive: {
    color: NEU_DARK.emerald
  }
});
