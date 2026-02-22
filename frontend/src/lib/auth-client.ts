import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { API_BASE } from "./api";

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/auth`,
  plugins: [adminClient()],
});
