import { useAuth } from "../state/auth";

export const ApiDocsPage = () => {
  const { token } = useAuth();
  const apiKey = token ? "your-api-key-here" : "";

  return (
    <div>
      <h1>API Documentation</h1>
      <section>
        <h2>Authentication</h2>
        <p>Use your API key in the <code>x-api-key</code> header:</p>
        <pre>
          <code>{`curl -H "x-api-key: ${apiKey}" \\
  https://your-domain/api/v1/quotes/random`}</code>
        </pre>
      </section>
      <section>
        <h2>Endpoints</h2>
        <h3>GET /api/v1/quotes/random</h3>
        <p>Get a random quote.</p>
        <pre>
          <code>{`curl -H "x-api-key: ${apiKey}" \\
  https://your-domain/api/v1/quotes/random`}</code>
        </pre>
        <h3>GET /api/v1/quotes</h3>
        <p>List quotes with cursor-based pagination.</p>
        <pre>
          <code>{`curl -H "x-api-key: ${apiKey}" \\
  "https://your-domain/api/v1/quotes?limit=20&cursor=..."`}</code>
        </pre>
      </section>
      <section>
        <h2>Error Responses</h2>
        <ul>
          <li><code>401</code> - Missing or invalid API key</li>
          <li><code>429</code> - Rate limit exceeded</li>
          <li><code>404</code> - Resource not found</li>
        </ul>
      </section>
    </div>
  );
};
