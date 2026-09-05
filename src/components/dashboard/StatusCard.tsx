import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NEU_DARK } from "../../theme/brand";

export type StatusTone = "neutral" | "pending" | "active" | "warning" | "danger";

const TONE_COLORS: Record<StatusTone, { accent: string; badgeBg: string; badgeText: string }> = {
  neutral: { accent: NEU_DARK.border, badgeBg: "rgba(255,255,255,0.08)", badgeText: NEU_DARK.textMuted },
  pending: { accent: NEU_DARK.amber, badgeBg: NEU_DARK.amberSoft, badgeText: NEU_DARK.amber },
  active: { accent: NEU_DARK.emerald, badgeBg: NEU_DARK.emeraldSoft, badgeText: NEU_DARK.emerald },
  warning: { accent: NEU_DARK.amberStrong, badgeBg: NEU_DARK.amberSoft, badgeText: NEU_DARK.amberStrong },
  danger: { accent: NEU_DARK.red, badgeBg: NEU_DARK.redSoft, badgeText: NEU_DARK.red }
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
    <View style={[styles.card, { borderColor: colors.accent }]}>
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
    backgroundColor: NEU_DARK.card,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8
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
    color: NEU_DARK.white
  },
  description: {
    fontSize: 13,
    color: NEU_DARK.textMuted,
    lineHeight: 19
  }
});
