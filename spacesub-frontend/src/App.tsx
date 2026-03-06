import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallback } from "./pages/AuthCallback";
import { Dashboard } from "./pages/Dashboard";
import { ConnectFlex } from "./pages/ConnectFlex";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/connect-flex" element={<ConnectFlex />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
