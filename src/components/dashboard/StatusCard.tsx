import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NEU_COLORS } from "../../theme/brand";

export type StatusTone = "neutral" | "pending" | "active" | "warning" | "danger";

const TONE_COLORS: Record<StatusTone, { accent: string; badgeBg: string; badgeText: string }> = {
  neutral: { accent: NEU_COLORS.border, badgeBg: "#F1F5F9", badgeText: NEU_COLORS.subtle },
  pending: { accent: NEU_COLORS.gold, badgeBg: "#FFF7E0", badgeText: NEU_COLORS.goldDark },
  active: { accent: NEU_COLORS.green, badgeBg: NEU_COLORS.greenTint, badgeText: NEU_COLORS.green },
  warning: { accent: "#D97706", badgeBg: "#FFF7ED", badgeText: "#B45309" },
  danger: { accent: NEU_COLORS.error, badgeBg: NEU_COLORS.errorBg, badgeText: NEU_COLORS.error }
};

type Props = {
  tone: StatusTone;
  badge: string;
  title: string;
  description: string;
  children?: ReactNode;
};

// The "at a glance" tile every dashboard leads with — what matters right now
// (pending approval / active pass / nothing yet), instead of an unranked
// list of buttons that makes the visitor hunt for the one action they need.
export function StatusCard({ tone, badge, title, description, children }: Props) {
  const colors = TONE_COLORS[tone];

  return (
    <View style={[styles.card, { borderLeftColor: colors.accent }]}>
      <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
        <Text style={[styles.badgeText, { color: colors.badgeText }]}>{badge}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEU_COLORS.card,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NEU_COLORS.border,
    borderLeftWidth: 5,
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: NEU_COLORS.ink
  },
  description: {
    fontSize: 13,
    color: NEU_COLORS.subtle,
    lineHeight: 19
  }
});
