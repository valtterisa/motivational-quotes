import { useState, useEffect, type ReactNode } from "react";
import { AuthContext, type User } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        // User not authenticated, that's okay
        console.debug("Not authenticated", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const setAuth = (u: User) => {
    setUser(u);
  };

  const clearAuth = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setAuth, clearAuth, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
