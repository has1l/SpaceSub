import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCursorGlow } from '../hooks/useCursorGlow';
import { API_BASE } from '../services/api';
import CosmicBackground from '../components/CosmicBackground';

const stagger = { animate: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } } };
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

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
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, searchParams, setToken, navigate]);

  useCursorGlow();

  return (
    <div className="min-h-svh flex items-center justify-center px-6">
      <CosmicBackground />

      <motion.div
        className="text-center relative z-10 max-w-sm w-full"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
               style={{ background: 'rgba(212, 168, 83, 0.1)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
            <span className="text-3xl font-bold font-display text-accent-gold">F</span>
          </div>
        </motion.div>

        {/* Blurred teaser number */}
        <motion.div
          variants={fadeUp}
          className="font-display font-extralight text-[80px] leading-none tracking-tighter select-none mb-2"
          style={{ color: 'rgba(212, 168, 83, 0.2)', animation: 'breathe 6s ease-in-out infinite' }}
        >
          ₽ 247 832
        </motion.div>

        {/* Title */}
        <motion.h1 variants={fadeUp} className="text-2xl font-semibold font-display text-text-primary mb-1">
          Flex Банк
        </motion.h1>

        <motion.p variants={fadeUp} className="text-sm text-text-secondary mb-12">
          Финансы на орбите
        </motion.p>

        {/* Login button */}
        <motion.button
          variants={fadeUp}
          onClick={() => { window.location.href = `${API_BASE}/auth/yandex`; }}
          className="w-full py-4 rounded-2xl bg-accent-blue text-white font-semibold text-base cursor-pointer
                     shadow-[0_4px_24px_rgba(59,111,232,0.25)] hover:shadow-[0_6px_32px_rgba(59,111,232,0.35)]
                     active:scale-[0.97] transition-all duration-200"
        >
          Войти через Яндекс
        </motion.button>

        <motion.p variants={fadeUp} className="text-xs text-text-tertiary mt-6">
          Авторизация через Яндекс ID
        </motion.p>
      </motion.div>

      {/* Glow behind button */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[300px] h-[300px] rounded-full pointer-events-none z-0"
           style={{ background: 'radial-gradient(circle, rgba(59,111,232,0.06) 0%, transparent 70%)' }} />
    </div>
  );
}
