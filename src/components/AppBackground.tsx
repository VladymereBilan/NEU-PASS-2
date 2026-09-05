import type { ReactNode } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { NEU_DARK } from "../theme/brand";

// The darkened campus-photo background shared by every dark-themed screen —
// auth screens (AuthScreen.tsx) and the post-login dashboards
// (DashboardScreen.tsx) — so both stay pixel-identical without duplicating
// the ImageBackground + overlay setup.
export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require("../../assets/branding/campus-bg.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NEU_DARK.overlay
  }
});
