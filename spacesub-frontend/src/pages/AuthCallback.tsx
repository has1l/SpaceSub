import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';
import { Starfield } from '../components/Starfield';

export function AuthCallback() {
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
      setError('Токен не получен. Попробуйте войти снова.');
    }
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <Starfield />
        <div className="station-panel p-8 max-w-sm text-center relative z-10">
          <p className="text-sm mb-4" style={{ color: 'var(--signal-danger)' }}>{error}</p>
          <a
            href="/"
            className="text-sm font-medium transition-colors duration-300"
            style={{ color: 'var(--signal-primary)' }}
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <Starfield />
      <div className="relative z-10">
        <Spinner text="Установка связи..." />
      </div>
    </div>
  );
}
