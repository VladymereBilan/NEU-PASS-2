import { Pressable, StyleSheet, Text, View } from "react-native";
import { NEU_DARK } from "../../theme/brand";
import type { StationFilterValue } from "../../hooks/useStationFilter";

const OPTIONS: StationFilterValue[] = ["All", "MAIN", "SOM", "PSB"];

type Props = {
  value: StationFilterValue;
  onChange: (value: StationFilterValue) => void;
};

// Display-only filter chips for a guard's rotating shifts — see
// useStationFilter.ts for why this is never treated as a security boundary.
export function StationFilterBar({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option === "All" ? "All Stations" : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  chipActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: NEU_DARK.textMuted
  },
  chipTextActive: {
    color: NEU_DARK.emerald
  }
});
