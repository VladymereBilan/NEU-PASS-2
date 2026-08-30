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
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      {count !== undefined ? (
        <View style={styles.countRow}>
          <Text style={styles.count}>{count}</Text>
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
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
    justifyContent: "flex-end"
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
  }
});
