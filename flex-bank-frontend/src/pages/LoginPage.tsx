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
  useCursorGlow();

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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
         style={{ background: 'var(--color-void)' }}>
      <CosmicBackground />

      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="mb-12"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative w-28 h-28 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-3xl flex items-center justify-center animate-pulse-glow-stellar"
              style={{ background: 'linear-gradient(135deg, #4F7CFF, #7B61FF)' }}
            >
              <span className="text-4xl font-black text-white tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}>F</span>
            </motion.div>
            {/* Orbital ring around logo */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ border: '1px solid rgba(79, 124, 255, 0.15)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                   style={{
                     background: '#4F7CFF',
                     boxShadow: '0 0 8px rgba(79, 124, 255, 0.6)',
                   }} />
            </motion.div>
          </div>

          <h1 className="text-6xl font-black mb-4 gradient-text-cosmic tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}>
            Flex Банк
          </h1>
          <p className="text-text-nebula text-lg font-light tracking-wide"
             style={{ fontFamily: 'var(--font-body)' }}>
            Умные финансы. Элегантный контроль.
          </p>
        </motion.div>

        {/* Login button */}
        <motion.button
          onClick={handleLogin}
          className="btn-stellar px-12 py-4 text-lg rounded-2xl tracking-wide"
          style={{ fontFamily: 'var(--font-body)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Войти через Яндекс
        </motion.button>

        <motion.p
          className="text-text-void text-sm mt-8 font-light"
          style={{ fontFamily: 'var(--font-body)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Безопасная авторизация через Яндекс ID
        </motion.p>
      </motion.div>
    </div>
  );
}
