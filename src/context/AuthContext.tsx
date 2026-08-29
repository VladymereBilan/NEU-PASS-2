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
      .select("account_type")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const accountType = data?.account_type;
        setRole(accountType === "visitor" || accountType === "guard" ? accountType : null);
        setRoleResolved(true);
      });

    return () => {
      active = false;
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
