import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('flexbank_token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}