const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const AUTH_TOKEN_KEY = "access_token";

export const getStoredToken = (): string | null =>
  typeof sessionStorage !== "undefined" ? sessionStorage.getItem(AUTH_TOKEN_KEY) : null;

export const setStoredToken = (token: string | null): void => {
  if (typeof sessionStorage === "undefined") return;
  if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  else sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const apiCall = async <T = unknown>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> => {
  const { token, ...rest } = options || {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  const bearer = token ?? getStoredToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: "include", // Important: include cookies in requests
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown_error" }));
    throw new Error(err.error || "request_failed");
  }
  return res.json() as Promise<T>;
};

export const queryKeys = {
  dashboard: {
    quotes: () => ["dashboard", "quotes"] as const,
    apiKeys: () => ["dashboard", "api-keys"] as const,
  },
} as const;
