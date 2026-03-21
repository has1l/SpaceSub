import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import CosmicBackground from '../components/CosmicBackground';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Write to localStorage as backup
      localStorage.setItem('flexbank_token', token);
      // Update AuthContext synchronously so ProtectedRoute sees the token
      // before React Router renders the dashboard route
      flushSync(() => {
        setToken(token);
      });
      console.log('[AuthCallback] Token saved, navigating to dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      console.error('[AuthCallback] No token in URL params. Full URL:', window.location.href);
      setError('Токен не получен');
    }
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center relative z-10">
          <p className="text-aurora-red mb-4">{error}</p>
          <a href="/" className="text-accent-blue hover:text-accent-cyan transition-colors"
             style={{ fontFamily: 'var(--font-body)' }}>
            Вернуться ко входу
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'var(--color-void)' }}>
      <CosmicBackground />
      <div className="text-center relative z-10">
        <Spinner text="Авторизация..." />
      </div>
    </div>
  );
}
