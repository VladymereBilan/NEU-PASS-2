import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { DashboardScreen } from "../../src/components/dashboard/DashboardScreen";
import type { BottomNavTab } from "../../src/components/dashboard/BottomNavBar";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabaseClient";
import { NEU_DARK } from "../../src/theme/brand";

const GUARD_TABS: BottomNavTab[] = [
  { key: "home", label: "Home", icon: "home-variant", route: "/(guard)/home" },
  { key: "pending", label: "Pending", icon: "account-clock-outline", route: "/(guard)/pending" },
  { key: "active-visitors", label: "Active", icon: "account-group-outline", route: "/(guard)/active-visitors" },
  { key: "reports", label: "Reports", icon: "chart-bar", route: "/(guard)/reports" }
];

export default function GuardProfileScreen() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAvatar = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.avatar_path) {
      const signed = await supabase.storage
        .from("profile-avatars")
        .createSignedUrl(data.avatar_path, 60 * 60);
      setAvatarUrl(signed.data?.signedUrl ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAvatar();
  }, [loadAvatar]);

  const choosePhoto = async () => {
    setError("");
    setMessage("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to change your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (result.canceled || !result.assets[0]) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    setSaving(true);
    const asset = result.assets[0];
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const response = await fetch(asset.uri);
    const buffer = await response.arrayBuffer();
    const upload = await supabase.storage.from("profile-avatars").upload(path, buffer, {
      contentType: asset.mimeType ?? "image/jpeg",
      upsert: false
    });
    if (upload.error) {
      setError("Unable to upload your profile picture.");
      setSaving(false);
      return;
    }

    const update = await supabase.rpc("update_own_guard_avatar", { p_avatar_path: path });
    if (update.error) {
      setError("Unable to save your profile picture.");
      setSaving(false);
      return;
    }

    const signed = await supabase.storage.from("profile-avatars").createSignedUrl(path, 60 * 60);
    setAvatarUrl(signed.data?.signedUrl ?? null);
    setMessage("Profile picture updated.");
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const username = email ? email.split("@")[0] : "guard";

  return (
    <DashboardScreen
      roleLabel={`Guard · ${username}`}
      onSignOut={() => void handleSignOut()}
      onProfilePicturePress={() => void choosePhoto()}
      tabs={GUARD_TABS}
    >
      <Text style={styles.title}>My Profile</Text>
      {loading ? (
        <ActivityIndicator color={NEU_DARK.emerald} />
      ) : (
        <View style={styles.content}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.username}>{username}</Text>
          <Pressable style={styles.button} onPress={() => void choosePhoto()} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Uploading..." : "Change profile picture"}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
        </View>
      )}
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: NEU_DARK.white, fontSize: 20, fontWeight: "800" },
  content: { alignItems: "center", gap: 12 },
  avatar: { width: 128, height: 128, borderRadius: 64 },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NEU_DARK.emeraldStrong
  },
  avatarLetter: { color: "#04150C", fontSize: 44, fontWeight: "800" },
  username: { color: NEU_DARK.textMuted, fontSize: 14, fontWeight: "700" },
  button: { backgroundColor: NEU_DARK.emeraldStrong, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#04150C", fontSize: 14, fontWeight: "800" },
  error: { color: "#fca5a5", fontSize: 13, textAlign: "center" },
  success: { color: "#86efac", fontSize: 13, textAlign: "center" }
});