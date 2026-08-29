import React, { createContext, useContext, useMemo, useState } from "react";

type Role = "visitor" | "guard" | null;

type AuthContextValue = {
  role: Role;
  email: string | null;
  signIn: (nextRole: Exclude<Role, null>, email?: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      email,
      signIn: (nextRole, nextEmail) => {
        setRole(nextRole);
        setEmail(nextEmail ?? null);
      },
      signOut: () => {
        setRole(null);
        setEmail(null);
      }
    }),
    [role, email]
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
