import React, { createContext, useContext, useMemo, useState } from "react";

type Role = "visitor" | "guard" | null;

type AuthContextValue = {
  role: Role;
  signIn: (nextRole: Exclude<Role, null>) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      signIn: (nextRole) => setRole(nextRole),
      signOut: () => setRole(null)
    }),
    [role]
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
