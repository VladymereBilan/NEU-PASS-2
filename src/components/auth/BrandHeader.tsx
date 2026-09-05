import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NEU_DARK } from "../../theme/brand";

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="shield-check-outline" size={30} color={NEU_DARK.emerald} />
      </View>
      <Text style={styles.eyebrow}>NEW ERA UNIVERSITY</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
    marginBottom: 8
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NEU_DARK.emeraldSoft,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder,
    marginBottom: 10
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: NEU_DARK.emerald
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: NEU_DARK.white,
    marginTop: 2
  },
  subtitle: {
    fontSize: 13,
    color: NEU_DARK.textMuted,
    textAlign: "center",
    marginTop: 2
  }
});
