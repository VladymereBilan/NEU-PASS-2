import { Image, StyleSheet, Text, View } from "react-native";
import { NEU_COLORS } from "../../theme/brand";

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/branding/neu-logo.webp")}
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: 84,
    height: 84,
    marginBottom: 10
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: NEU_COLORS.green
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: NEU_COLORS.ink,
    marginTop: 2
  },
  subtitle: {
    fontSize: 13,
    color: NEU_COLORS.subtle,
    textAlign: "center",
    marginTop: 2
  }
});
