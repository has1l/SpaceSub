import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import Spinner from '../components/Spinner';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received');
      return;
    }

    api
      .get(`/auth/yandex/callback?code=${code}`)
      .then((res) => {
        setToken(res.data.accessToken);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setError('Authorization failed. Please try again.');
      });
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/" className="text-blue-400 hover:text-blue-300">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="text-gray-400 mt-4">Авторизация...</p>
      </div>
    </div>
  );
}
