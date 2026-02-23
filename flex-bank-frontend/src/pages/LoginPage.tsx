import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../services/api';

export default function LoginPage() {
  const { isAuthenticated, setToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      navigate('/dashboard', { replace: true });
      return;
    }
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, searchParams, setToken, navigate]);

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/yandex`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
            <span className="text-3xl font-bold text-white">F</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Flex Bank</h1>
          <p className="text-gray-500 text-lg">Управляй финансами просто</p>
        </div>

        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25 cursor-pointer text-base"
        >
          Войти через Яндекс
        </button>

        <p className="text-gray-600 text-sm mt-6">
          Безопасная авторизация через Яндекс ID
        </p>
      </div>
    </div>
  );
}
