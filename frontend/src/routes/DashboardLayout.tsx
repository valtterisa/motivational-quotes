import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export const DashboardLayout = () => {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <h2>Dashboard</h2>
        {user && <p>{user.email}</p>}
        <nav>
          <ul>
            <li>
              <Link to="/dashboard">Overview</Link>
            </li>
            <li>
              <Link to="/dashboard/quotes">Quotes</Link>
            </li>
            <li>
              <Link to="/dashboard/api-keys">API keys</Link>
            </li>
            <li>
              <Link to="/dashboard/docs">API docs</Link>
            </li>
          </ul>
        </nav>
        <button onClick={handleLogout}>Logout</button>
      </aside>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

