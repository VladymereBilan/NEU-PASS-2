import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Purely a per-device display convenience for a guard who rotates between
// Main/SOM/PSB — NOT a security boundary. It only filters which registrations
// are *rendered* in a list; it must never gate which registrations a guard
// can act on (approve/reject/checkout), since any guard can be asked to
// cover any gate. See supabase/visitor-building-minors-migration.sql and
// CLAUDE.md for the building field itself.
export type StationFilterValue = "All" | "MAIN" | "SOM" | "PSB";

const STORAGE_KEY = "neu-pass:guard-station-view";
const VALID_VALUES: readonly StationFilterValue[] = ["All", "MAIN", "SOM", "PSB"];

// Shared across every screen that uses this hook (Pending/Active/Checkout/
// Logs) — switching the station on one screen applies to the others too,
// since it's one "which gate am I looking at right now" concept, not four
// independent ones.
export function useStationFilter() {
  const [station, setStationState] = useState<StationFilterValue>("All");

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored && (VALID_VALUES as readonly string[]).includes(stored)) {
        setStationState(stored as StationFilterValue);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setStation = useCallback((value: StationFilterValue) => {
    setStationState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  return { station, setStation };
}
