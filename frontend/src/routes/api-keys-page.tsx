import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../state/auth";
import { apiCall, queryKeys } from "../lib/api";

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  revokedAt?: string;
}

export const ApiKeysPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.dashboard.apiKeys(), token ?? ""],
    queryFn: () =>
      apiCall<{ keys: ApiKey[] }>("/dashboard/api-keys", { token: token ?? undefined }),
    enabled: !!token,
  });

  const createKey = useMutation({
    mutationFn: (label: string) =>
      apiCall<{ token: string }>("/dashboard/api-keys", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ label }),
      }),
    onSuccess: (data) => {
      setCreatedKey(data.token);
      setNewLabel("");
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.apiKeys() });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) =>
      apiCall(`/dashboard/api-keys/${id}/revoke`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.apiKeys() });
    },
  });

  const keys = data?.keys ?? [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newLabel) return;
    createKey.mutate(newLabel);
  };

  const handleRevoke = (id: string) => {
    if (!token) return;
    revokeKey.mutate(id);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>API Keys</h1>
      {createdKey && (
        <div className="alert success">
          <p>Your new API key: <code>{createdKey}</code></p>
          <button onClick={() => navigator.clipboard.writeText(createdKey)}>
            Copy
          </button>
          <button onClick={() => setCreatedKey(null)}>Close</button>
        </div>
      )}
      <form onSubmit={handleCreate}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label"
        />
        <button type="submit">Create API Key</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Created</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td>{k.label}</td>
              <td>{new Date(k.createdAt).toLocaleDateString()}</td>
              <td>{k.revokedAt ? "Revoked" : "Active"}</td>
              <td>
                {!k.revokedAt && (
                  <button onClick={() => handleRevoke(k.id)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
