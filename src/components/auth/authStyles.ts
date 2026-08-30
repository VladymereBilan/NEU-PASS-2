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
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.gold,
    backgroundColor: "#FFFBEB",
    alignItems: "center"
  },
  secondaryButtonText: {
    color: NEU_COLORS.goldDark,
    fontSize: 16,
    fontWeight: "700"
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
