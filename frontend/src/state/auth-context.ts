import { createContext } from "react";

export interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
