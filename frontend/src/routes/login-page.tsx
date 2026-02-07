import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../state/auth";
import { apiCall } from "../lib/api";

export const LoginPage = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiCall<{ user: { id: string; email: string }; token: string }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate("/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const error = login.isError
    ? login.error instanceof Error ? login.error.message : "Login failed"
    : null;

  return (
    <div className="page auth">
      <h1>Log in</h1>
      {error && <div className="error">{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn primary" disabled={login.isPending}>
          {login.isPending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
};

