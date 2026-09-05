import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NEU_DARK } from "../../theme/brand";

export type ActionTileTint = "green" | "blue" | "gold" | "neutral";

const TINTS: Record<ActionTileTint, { border: string; iconBg: string; iconColor: string }> = {
  green: { border: NEU_DARK.cardBorder, iconBg: NEU_DARK.emeraldSoft, iconColor: NEU_DARK.emerald },
  blue: { border: "rgba(96, 165, 250, 0.25)", iconBg: NEU_DARK.blueSoft, iconColor: NEU_DARK.blue },
  gold: { border: "rgba(251, 191, 36, 0.3)", iconBg: NEU_DARK.amberSoft, iconColor: NEU_DARK.amber },
  neutral: { border: NEU_DARK.border, iconBg: "rgba(255,255,255,0.08)", iconColor: NEU_DARK.white }
};

type Props = {
  label: string;
  description?: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tint?: ActionTileTint;
  count?: number;
  onPress: () => void;
};

// A tappable tile for the action grid. `count` renders a number badge (used
// on the guard dashboard for queue sizes); omit it for actions that don't
// have a meaningful count (e.g. the visitor's "Notifications"). `icon`/`tint`
// are optional so any existing caller passing just label/count/onPress keeps
// working unchanged.
export function ActionTile({ label, description, icon, tint = "green", count, onPress }: Props) {
  const [hovered, setHovered] = useState(false);
  const colors = TINTS[tint];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { borderColor: colors.border },
        (pressed || hovered) && styles.tileActive
      ]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {icon ? (
        <View style={[styles.iconBadge, { backgroundColor: colors.iconBg }]}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.iconColor} />
        </View>
      ) : null}
      {count !== undefined ? (
        <View style={styles.countRow}>
          <Text style={styles.count}>{count}</Text>
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Pressable>
  );
}

export function ActionGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: NEU_DARK.card,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    minHeight: 92,
    justifyContent: "flex-end"
  },
  tileActive: {
    transform: [{ scale: 1.01 }]
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  countRow: {
    alignSelf: "flex-start"
  },
  count: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.emerald
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: NEU_DARK.white
  },
  description: {
    fontSize: 11,
    color: NEU_DARK.textMuted
  }
});
