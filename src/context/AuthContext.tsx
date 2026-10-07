import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type Role = "visitor" | "guard" | null;

type AuthContextValue = {
  role: Role;
  email: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [roleResolved, setRoleResolved] = useState(false);
  // Bumped to re-run the profile lookup after a failed one (see below).
  const [lookupAttempt, setLookupAttempt] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionResolved(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionResolved(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    if (!session) {
      setRole(null);
      setRoleResolved(true);
      return;
    }

    setRoleResolved(false);
    supabase
      .from("profiles")
      .select("account_type, account_status")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;

        // A failed lookup (flaky connection) says nothing about the account —
        // keep the last known role instead of resetting it to null, which
        // would bounce a signed-in guard back to the login screen.
        if (error) {
          setRoleResolved(true);
          // On a cold start there is no "last known role" to keep, so a guard
          // opening the app with a bad connection would sit on the login
          // screen despite a valid saved session. Retry a few times.
          if (lookupAttempt < 5) {
            retryTimer = setTimeout(() => setLookupAttempt((n) => n + 1), 3000);
          }
          return;
        }

        if (data?.account_status === "Blocked") {
          await supabase.auth.signOut();
          if (!active) return;
          setRole(null);
          setRoleResolved(true);
          return;
        }

        const accountType = data?.account_type;
        setRole(accountType === "visitor" || accountType === "guard" ? accountType : null);
        setRoleResolved(true);
      });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [session, lookupAttempt]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`profile-status-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`
        },
        async (payload) => {
          if (payload.new?.account_status === "Blocked") {
            await supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      email: session?.user.email ?? null,
      loading: !sessionResolved || !roleResolved,
      signOut: async () => {
        await supabase.auth.signOut();
      }
    }),
    [role, session, sessionResolved, roleResolved]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
