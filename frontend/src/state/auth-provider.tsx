import { type ReactNode } from "react";
import { AuthContext, type User } from "./auth-context";
import { authClient } from "@/lib/auth-client";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending } = authClient.useSession();
  const user: User | null =
    session?.user != null
      ? {
          id: session.user.id,
          email: session.user.email ?? "",
          role: (session.user as { role?: string }).role ?? "user",
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
