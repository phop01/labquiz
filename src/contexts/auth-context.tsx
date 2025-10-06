'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { StoredUser } from "@/lib/auth-storage";
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
} from "@/lib/auth-storage";

interface AuthContextValue {
  token?: string;
  user?: StoredUser;
  isReady: boolean;
  login: (payload: { token: string; user: StoredUser }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | undefined>();
  const [user, setUser] = useState<StoredUser | undefined>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = getAuthUser();
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(storedUser);
    setIsReady(true);
  }, []);

  const login = ({ token: nextToken, user: nextUser }: { token: string; user: StoredUser }) => {
    setToken(nextToken);
    setUser(nextUser);
    saveAuthSession(nextToken, nextUser);
  };

  const logout = () => {
    setToken(undefined);
    setUser(undefined);
    clearAuthSession();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isReady,
      login,
      logout,
    }),
    [token, user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
