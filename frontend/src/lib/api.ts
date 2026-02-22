export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

export const PUBLIC_API_BASE = (import.meta.env.VITE_PUBLIC_API_BASE_URL || API_BASE.replace(/:\d+$/, ":3002")).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export const apiCall = async <T = unknown>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> => {
  const { token, ...rest } = options || {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown_error" }));
    const code = (body && typeof body.error === "string" && body.error) || "request_failed";
    throw new ApiError(res.status, code, code);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null as T;
  }

  return res.json() as Promise<T>;
};

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  dashboard: {
    quotes: () => ["dashboard", "quotes"] as const,
    apiKeys: () => ["dashboard", "api-keys"] as const,
    liked: () => ["dashboard", "liked"] as const,
    saved: () => ["dashboard", "saved"] as const,
  },
  admin: {
    stats: () => ["admin", "stats"] as const,
  },
  feed: (sort?: string) => ["feed", sort ?? "newest"] as const,
} as const;
