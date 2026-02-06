import { useState, useEffect } from "react";
import { useAuth } from "../state/auth";
import { apiCall } from "../lib/api";

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  revokedAt?: string;
}

export const ApiKeysPage = () => {
  const { token } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiCall("/dashboard/api-keys", { token })
      .then((data: { keys: ApiKey[] }) => {
        setKeys(data.keys);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newLabel) return;
    try {
      const data = await apiCall("/dashboard/api-keys", {
        method: "POST",
        token,
        body: JSON.stringify({ label: newLabel }),
      });
      setCreatedKey(data.token);
      setNewLabel("");
      if (token) {
        const updated = await apiCall("/dashboard/api-keys", { token });
        setKeys(updated.keys);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!token) return;
    try {
      await apiCall(`/dashboard/api-keys/${id}/revoke`, {
        method: "POST",
        token,
      });
      const updated = await apiCall("/dashboard/api-keys", { token });
      setKeys(updated.keys);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

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
