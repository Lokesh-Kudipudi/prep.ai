import React, { createContext, useContext, useState } from "react";

type User = {
  id: string;
  full_name: string;
  email: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Mocked as true for now
  const [user, setUser] = useState<User | null>({
    id: "1",
    full_name: "Mock User",
    email: "mock@user.com",
  });
  const [isLoading] = useState<boolean>(false);

  function login(token: string) {
    localStorage.setItem("prepai.token", token);
    setIsAuthenticated(true);
    setUser({ id: "1", full_name: "Mock User", email: "mock@user.com" });
  }

  function logout() {
    localStorage.removeItem("prepai.token");
    setIsAuthenticated(false);
    setUser(null);
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
