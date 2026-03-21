import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCursorGlow } from '../hooks/useCursorGlow';
import { API_BASE } from '../services/api';
import CosmicBackground from '../components/CosmicBackground';

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

  useCursorGlow();

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/yandex`;
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <CosmicBackground />

      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-8">
          <div className="relative w-20 h-20 md:w-28 md:h-28 mx-auto mb-6 md:mb-8">
            <div className="orbital-ring w-24 h-24 md:w-36 md:h-36 -top-2 -left-2 md:-top-4 md:-left-4" />
            <div
              className="absolute inset-0 rounded-3xl glow-stellar animate-pulse-glow-stellar flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F7CFF, #7B61FF)' }}
            >
              <span className="text-2xl md:text-4xl font-black text-white tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}>F</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-4 gradient-text-cosmic tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}>
            Flex Банк
          </h1>
          <p className="text-text-nebula text-base md:text-lg font-light tracking-wide"
             style={{ fontFamily: 'var(--font-body)' }}>
            Умные финансы. Элегантный контроль.
          </p>
        </div>

        <motion.button
          onClick={handleLogin}
          className="btn-stellar px-8 py-3.5 md:px-12 md:py-4 text-base md:text-lg rounded-2xl tracking-wide"
          style={{ fontFamily: 'var(--font-body)' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Войти через Яндекс
        </motion.button>

        <p className="text-text-void text-sm mt-8 font-light"
           style={{ fontFamily: 'var(--font-body)' }}>
          Безопасная авторизация через Яндекс ID
        </p>
      </motion.div>
    </div>
  );
}
