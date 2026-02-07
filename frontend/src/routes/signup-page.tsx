import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../state/auth";
import { apiCall } from "../lib/api";

export const SignupPage = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiCall<{ user: { id: string; email: string }; token: string }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate("/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate({ email, password });
  };

  const error = signup.isError
    ? signup.error instanceof Error ? signup.error.message : "Signup failed"
    : null;

  return (
    <div className="page auth">
      <h1>Sign up</h1>
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
            minLength={8}
          />
        </label>
        <button type="submit" className="btn primary" disabled={signup.isPending}>
          {signup.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
};

