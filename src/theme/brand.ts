// New Era University brand palette, sampled from the college seal
// (assets/branding/neu-logo.webp) — green/gold as primary, red used sparingly
// since it reads as an error color everywhere else in this app's UI.
export const NEU_COLORS = {
  green: "#0B6E3C",
  greenDark: "#064A28",
  greenTint: "#EAF5EE",
  gold: "#F5B517",
  goldDark: "#B8860B",
  ink: "#111827",
  subtle: "#4B5563",
  border: "#D8E3DC",
  card: "#FFFFFF",
  screenBg: "#F3F8F4",
  error: "#B91C1C",
  errorBg: "#FEF2F2"
};

// Dark "secure portal" palette used by the auth screens (landing, visitor
// login/sign-up, guard login) and the post-login dashboards (visitor/guard
// home + their linked tab screens) — matches admin-web's dark redesign.
// Kept separate from NEU_COLORS above since some screens (the visitor
// registration flow, guard's checkout/visitor-logs) still use it as-is.
export const NEU_DARK = {
  overlay: "rgba(3, 15, 9, 0.86)",
  card: "rgba(10, 31, 20, 0.85)",
  cardBorder: "rgba(16, 185, 129, 0.25)",
  emerald: "#34D399",
  emeraldStrong: "#10B981",
  emeraldSoft: "rgba(16, 185, 129, 0.12)",
  amber: "#FBBF24",
  amberSoft: "rgba(251, 191, 36, 0.12)",
  amberStrong: "#F59E0B",
  blue: "#60A5FA",
  blueSoft: "rgba(96, 165, 250, 0.12)",
  red: "#F87171",
  redSoft: "rgba(248, 113, 113, 0.12)",
  white: "#FFFFFF",
  textMuted: "#9CA3AF",
  textFaint: "#6B7280",
  inputBg: "rgba(255, 255, 255, 0.05)",
  border: "rgba(16, 185, 129, 0.2)",
  error: "#FCA5A5",
  errorBg: "rgba(239, 68, 68, 0.1)",
  errorBorder: "rgba(239, 68, 68, 0.3)"
};
