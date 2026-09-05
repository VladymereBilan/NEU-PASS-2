import { StyleSheet, Text, View } from "react-native";
import { NEU_DARK } from "../../theme/brand";

function timeOfDayGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstNameOf(fullName?: string | null) {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

// Shown only on the two Home screens. `name` is optional — a visitor with no
// registration yet, or a guard (whose display name isn't fetched anywhere
// today), simply gets the greeting with no name rather than a fabricated one.
export function Greeting({ name }: { name?: string | null }) {
  const now = new Date();
  const greeting = timeOfDayGreeting(now.getHours());
  const firstName = firstNameOf(name);

  const dateLabel = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  });

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {greeting}
        {firstName ? `, ${firstName}` : ""} 👋
      </Text>
      <Text style={styles.date}>
        {dateLabel} · New Era University
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  date: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  }
});
