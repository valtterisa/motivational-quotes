const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export const apiCall = async (
  path: string,
  options?: RequestInit & { token?: string },
) => {
  const { token, ...rest } = options || {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...rest.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown_error" }));
    throw new Error(err.error || "request_failed");
  }
  return res.json();
};
