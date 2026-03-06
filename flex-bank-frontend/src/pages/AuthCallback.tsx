import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import CosmicBackground from '../components/CosmicBackground';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      navigate('/dashboard', { replace: true });
    } else {
      setError('Токен не получен');
    }
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'var(--color-void)' }}>
        <CosmicBackground />
        <div className="text-center relative z-10">
          <p className="text-aurora-red mb-4">{error}</p>
          <a href="/bank/" className="text-accent-blue hover:text-accent-cyan transition-colors"
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
