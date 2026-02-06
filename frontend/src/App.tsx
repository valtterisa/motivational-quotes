import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./state/auth";
import { LandingPage } from "./routes/LandingPage";
import { LoginPage } from "./routes/LoginPage";
import { SignupPage } from "./routes/SignupPage";
import { DashboardLayout } from "./routes/DashboardLayout";
import { DashboardHome } from "./routes/DashboardHome";
import { QuotesPage } from "./routes/QuotesPage";
import { ApiKeysPage } from "./routes/ApiKeysPage";
import { ApiDocsPage } from "./routes/ApiDocsPage";

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
