import { Link } from "react-router-dom";

export const LandingPage = () => {
  return (
    <div className="page landing">
      <header className="landing-hero">
        <h1>Motivational Quotes API</h1>
        <p>Get fresh motivation on demand with a simple API key.</p>
        <div className="landing-actions">
          <Link to="/signup" className="btn primary">
            Get an API key
          </Link>
          <Link to="/login" className="btn secondary">
            Sign in
          </Link>
        </div>
      </header>
    </div>
  );
};

