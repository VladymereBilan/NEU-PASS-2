import { StyleSheet } from "react-native";
import { NEU_COLORS } from "../../theme/brand";

// Buttons/links/error text repeated identically across every auth screen.
export const authStyles = StyleSheet.create({
  error: {
    color: NEU_COLORS.error,
    backgroundColor: NEU_COLORS.errorBg,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  primaryButton: {
    backgroundColor: NEU_COLORS.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(11, 110, 60, 0.25)",
    shadowColor: NEU_COLORS.green,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4
  },
  primaryButtonHover: {
    backgroundColor: "#0E7F49",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    transform: [{ scale: 1.01 }]
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.12,
    shadowRadius: 10,
    backgroundColor: NEU_COLORS.greenDark
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.gold,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    shadowColor: NEU_COLORS.gold,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 3
  },
  secondaryButtonHover: {
    backgroundColor: "#FFF4D6",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    transform: [{ scale: 1.01 }]
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: "#FDE8B1"
  },
  secondaryButtonText: {
    color: NEU_COLORS.goldDark,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8
  },
  linkText: {
    color: NEU_COLORS.green,
    fontSize: 13,
    fontWeight: "700"
  },
  note: {
    marginTop: 4,
    fontSize: 12,
    color: NEU_COLORS.subtle,
    textAlign: "center"
  }
});
