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
      localStorage.setItem('flexbank_token', token);
      flushSync(() => { setToken(token); });
      navigate('/dashboard', { replace: true });
    } else {
      setError('Токен не получен');
    }
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center relative z-10">
          <p className="text-accent-red mb-4">{error}</p>
          <a href="/" className="text-accent-blue hover:text-accent-blue/80 transition-colors text-sm">
            Вернуться ко входу
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center" style={{ background: 'var(--color-void)' }}>
      <CosmicBackground />
      <div className="text-center relative z-10">
        <Spinner text="Авторизация..." />
      </div>
    </div>
  );
}
