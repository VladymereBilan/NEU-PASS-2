import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NEU_COLORS } from "../../theme/brand";

type Props = {
  label: string;
  count?: number;
  onPress: () => void;
};

// A tappable tile for the action grid. `count` renders a number badge (used
// on the guard dashboard for queue sizes); omit it for actions that don't
// have a meaningful count (e.g. the visitor's "Notifications").
export function ActionTile({ label, count, onPress }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, (pressed || hovered) && styles.tileActive]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {count !== undefined ? (
        <View style={styles.countRow}>
          <Text style={styles.count}>{count}</Text>
        </View>
      ) : null}
      <Text style={[styles.label, (hovered || false) && styles.labelActive]}>{label}</Text>
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
    backgroundColor: NEU_COLORS.card,
    borderWidth: 1,
    borderColor: NEU_COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    minHeight: 84,
    justifyContent: "flex-end",
    shadowColor: NEU_COLORS.green,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  tileActive: {
    borderColor: NEU_COLORS.green,
    backgroundColor: NEU_COLORS.greenTint,
    transform: [{ scale: 1.01 }],
    shadowOpacity: 0.2,
    shadowRadius: 16
  },
  countRow: {
    alignSelf: "flex-start"
  },
  count: {
    fontSize: 24,
    fontWeight: "800",
    color: NEU_COLORS.green
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: NEU_COLORS.ink
  },
  labelActive: {
    color: NEU_COLORS.greenDark
  }
});
