import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import { AuthProvider } from "./state/auth";
import { LandingPage } from "./routes/landing-page";
import { LoginPage } from "./routes/login-page";
import { SignupPage } from "./routes/signup-page";
import { DashboardLayout } from "./routes/dashboard-layout";
import { DashboardHome } from "./routes/dashboard-home";
import { QuotesPage } from "./routes/quotes-page";
import { ApiKeysPage } from "./routes/api-keys-page";
import { ApiDocsPage } from "./routes/api-docs-page";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="docs" element={<ApiDocsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
