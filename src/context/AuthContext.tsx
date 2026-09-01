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
      .then(async ({ data }) => {
        if (!active) return;

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
    };
  }, [session]);

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
