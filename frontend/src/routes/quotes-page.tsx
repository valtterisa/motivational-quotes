import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../state/auth";
import { apiCall, queryKeys } from "../lib/api";

interface Quote {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export const QuotesPage = () => {
  const { token } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...queryKeys.dashboard.quotes(), token ?? ""],
    queryFn: () =>
      apiCall<{ items: Quote[] }>("/dashboard/quotes", { token: token ?? undefined }),
    enabled: !!token,
  });

  const quotes = data?.items ?? [];

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error?.message}</div>;

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
