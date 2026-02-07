import { useState, type ReactNode } from "react";
import { AuthContext, type User } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const getInitialAuth = () => {
    const stored = localStorage.getItem("auth");
    return stored ? JSON.parse(stored) : { user: null, token: null };
  };

  const initialAuth = getInitialAuth();
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);

  const setAuth = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("auth", JSON.stringify({ user: u, token: t }));
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
