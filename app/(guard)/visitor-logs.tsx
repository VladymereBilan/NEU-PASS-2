import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { getCompletedRegistrationsPage } from "../../src/services/PrototypeRegistrationStore";
import { AppBackground } from "../../src/components/AppBackground";
import BackButton from "../../src/components/BackButton";
import { StationFilterBar } from "../../src/components/dashboard/StationFilterBar";
import { useStationFilter } from "../../src/hooks/useStationFilter";
import { NEU_DARK } from "../../src/theme/brand";
import type { VisitorRegistration } from "../../src/types/VisitorRegistration";

// Bounds each request to a page instead of the entire completed-checkout
// history, which only ever grows until the monthly archive/purge runs.
const PAGE_SIZE = 30;

export default function VisitorLogsScreen() {
  const [completed, setCompleted] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [refreshHovered, setRefreshHovered] = useState(false);
  const { station, setStation } = useStationFilter();

  // Display-only filter over the already-loaded page(s) — "Load more" still
  // paginates the full unfiltered history server-side (see loadMore below),
  // so a narrow station filter can leave a page looking sparse until more is
  // loaded; that's an acceptable MVP tradeoff for a purely local UI filter.
  const visibleCompleted = useMemo(
    () => (station === "All" ? completed : completed.filter((r) => r.building === station)),
    [completed, station]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { visitors, hasMore: more } = await getCompletedRegistrationsPage(null, PAGE_SIZE);
      setCompleted(visitors);
      setHasMore(more);
    } catch {
      setError("Unable to load visitor logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || completed.length === 0) return;
    setLoadingMore(true);
    try {
      const last = completed[completed.length - 1];
      const cursor = { timeOut: last.timeOut, id: last.id };
      const { visitors, hasMore: more } = await getCompletedRegistrationsPage(
        cursor,
        PAGE_SIZE
      );
      setCompleted((prev) => [...prev, ...visitors]);
      setHasMore(more);
    } catch {
      // Leave the already-loaded page visible; the guard can pull Refresh
      // to retry from the top rather than losing what's already on screen.
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, completed]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh])
  );

  return (
    <AppBackground>
      <SafeAreaView style={styles.flex} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.screenHeader}>
          <BackButton />
          <Text style={styles.screenHeaderTitle}>Visitor Logs</Text>
        </View>
        <View style={styles.card}>
          <FlatList
            style={styles.flex}
            data={visibleCompleted}
            keyExtractor={(registration) => registration.id}
            contentContainerStyle={styles.listContent}
            // Virtualized (unlike the old ScrollView+map) so rendering cost
            // stays flat as completed logs accumulate over the month, instead
            // of mounting every card at once.
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={7}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.5}
            refreshing={loading}
            onRefresh={() => void refresh()}
            ListHeaderComponent={
              <View style={styles.headerRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.refreshButton,
                    (pressed || refreshHovered) && styles.refreshButtonActive
                  ]}
                  onPress={() => void refresh()}
                  onHoverIn={() => setRefreshHovered(true)}
                  onHoverOut={() => setRefreshHovered(false)}
                >
                  <Text
                    style={[styles.refreshText, refreshHovered && styles.refreshTextActive]}
                  >
                    Refresh
                  </Text>
                </Pressable>
                <StationFilterBar value={station} onChange={setStation} />
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.body}>
                {loading
                  ? "Loading visitor logs..."
                  : error
                    ? error
                    : completed.length > 0
                      ? "No completed visitors at this station."
                      : "No completed visitors."}
              </Text>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.footerSpinner} color={NEU_DARK.emerald} />
              ) : null
            }
            renderItem={({ item: registration }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>{registration.fullName}</Text>
                <Text style={styles.itemText}>
                  Purpose: {registration.purposeOfVisit}
                </Text>
                <Text style={styles.itemText}>Building: {registration.building}</Text>
                {registration.accompanyingMinors > 0 ? (
                  <Text style={styles.itemText}>
                    Accompanying Minors: {registration.accompanyingMinors}
                  </Text>
                ) : null}
                <Text style={styles.itemText}>
                  Time In: {formatDate(registration.timeIn)}
                </Text>
                <Text style={styles.itemText}>
                  Time Out: {formatDate(registration.timeOut)}
                </Text>
                <Text style={styles.itemText}>
                  Visitor Pass: {registration.visitorPassNumber}
                </Text>
                <Text style={styles.itemText}>QR Status: {registration.qrStatus}</Text>
                <Text style={styles.itemText}>
                  Face Checkout Status: {registration.faceCheckoutVerificationStatus}
                </Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NEU_DARK.white
  },
  card: {
    flex: 1,
    margin: 20,
    backgroundColor: NEU_DARK.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NEU_DARK.cardBorder
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 12
  },
  footerSpinner: {
    paddingVertical: 12
  },
  headerRow: {
    gap: 12
  },
  body: {
    fontSize: 14,
    color: NEU_DARK.textMuted
  },
  itemCard: {
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: NEU_DARK.card
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NEU_DARK.white
  },
  itemText: {
    fontSize: 13,
    color: NEU_DARK.textMuted
  },
  refreshButton: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEU_DARK.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center"
  },
  refreshButtonActive: {
    borderColor: NEU_DARK.emerald,
    backgroundColor: NEU_DARK.emeraldSoft
  },
  refreshText: {
    color: NEU_DARK.white,
    fontSize: 14,
    fontWeight: "600"
  },
  refreshTextActive: {
    color: NEU_DARK.emerald
  }
});
