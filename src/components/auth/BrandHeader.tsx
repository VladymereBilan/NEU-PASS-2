import { Image, StyleSheet, Text, View } from "react-native";
import { NEU_DARK } from "../../theme/brand";

export function BrandHeader({
  title,
  subtitle,
  eyebrow = "NEW ERA UNIVERSITY"
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Image
          source={require("../../../assets/branding/neu-logo.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
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
    overflow: "hidden",
    marginBottom: 10
  },
  logo: {
    width: "100%",
    height: "100%"
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
