import React, { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/auth";
import type { User } from "../types";

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function fetchUser() {
    try {
      const profile = await getMe();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("[auth] failed to fetch profile, logging out", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("prepai.token");
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(token: string) {
    localStorage.setItem("prepai.token", token);
    setIsLoading(true);
    await fetchUser();
  }

  function logout() {
    localStorage.removeItem("prepai.token");
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
