import { StyleSheet } from "react-native";
import { NEU_DARK } from "../../theme/brand";

// Buttons/links/error text repeated identically across every auth screen.
export const authStyles = StyleSheet.create({
  error: {
    color: NEU_DARK.error,
    backgroundColor: NEU_DARK.errorBg,
    borderWidth: 1,
    borderColor: NEU_DARK.errorBorder,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  primaryButton: {
    backgroundColor: NEU_DARK.emeraldStrong,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryButtonHover: {
    backgroundColor: "#0EA271",
    transform: [{ scale: 1.01 }]
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: "#0C8A62"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#04150C",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: NEU_DARK.amber,
    backgroundColor: NEU_DARK.amberSoft,
    alignItems: "center"
  },
  secondaryButtonHover: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    transform: [{ scale: 1.01 }]
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: "rgba(251, 191, 36, 0.28)"
  },
  secondaryButtonText: {
    color: NEU_DARK.amber,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 32
  },
  linkButtonHover: {
    transform: [{ scale: 1.02 }]
  },
  linkButtonPressed: {
    transform: [{ scale: 0.99 }]
  },
  linkText: {
    color: NEU_DARK.emerald,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline"
  },
  linkTextHover: {
    color: NEU_DARK.emeraldStrong,
    textDecorationLine: "underline"
  },
  note: {
    marginTop: 4,
    fontSize: 12,
    color: NEU_DARK.textMuted,
    textAlign: "center"
  }
});
