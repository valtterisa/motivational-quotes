import { useState, useEffect } from "react";
import { useAuth } from "../state/auth";
import { apiCall } from "../lib/api";

interface Quote {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export const QuotesPage = () => {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiCall("/dashboard/quotes", { token })
      .then((data: { items: Quote[] }) => {
        setQuotes(data.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Your Quotes</h1>
      <table>
        <thead>
          <tr>
            <th>Text</th>
            <th>Author</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td>{q.text}</td>
              <td>{q.author || "-"}</td>
              <td>{new Date(q.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
