import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import SignOutButton from "../../src/components/SignOutButton";
import { useAuth } from "../../src/context/AuthContext";

export default function VisitorHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Visitor Home</Text>
        <Text style={styles.subtitle}>Choose an action</Text>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(visitor)/register")}
        >
          <Text style={styles.actionText}>Register Visit</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(visitor)/visitor-pass")}
        >
          <Text style={styles.actionText}>My Visitor Pass</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(visitor)/notifications")}
        >
          <Text style={styles.actionText}>Notifications</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(visitor)/checkout")}
        >
          <Text style={styles.actionText}>Request Checkout</Text>
        </Pressable>

        <SignOutButton onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef2ff"
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  actionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600"
  }
});
