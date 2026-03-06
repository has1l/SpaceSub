import { motion } from 'framer-motion';
import { API_BASE } from '../services/api';
import { SatelliteIcon } from '../components/SatelliteIcon';
import { Starfield } from '../components/Starfield';

const stagger = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/yandex`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <Starfield />

      <motion.div
        className="relative z-10 text-center max-w-md w-full"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Orbit rings decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            className="orbit-ring"
            style={{ width: 400, height: 400, marginLeft: -200, marginTop: -200 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          >
            <div style={{
              position: 'absolute', top: -2, left: '50%', marginLeft: -2,
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--signal-primary)', boxShadow: '0 0 10px rgba(0,212,170,0.5)',
            }} />
          </motion.div>
          <motion.div
            className="orbit-ring"
            style={{ width: 300, height: 300, marginLeft: -150, marginTop: -150, opacity: 0.5 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          >
            <div style={{
              position: 'absolute', bottom: -2, left: '30%',
              width: 3, height: 3, borderRadius: '50%',
              background: 'var(--signal-secondary)', boxShadow: '0 0 8px rgba(14,165,233,0.4)',
            }} />
          </motion.div>
          <div
            className="orbit-ring"
            style={{ width: 500, height: 500, marginLeft: -250, marginTop: -250, opacity: 0.25 }}
          />
        </div>

        {/* Logo */}
        <motion.div variants={fadeUp} className="mb-3 flex items-center justify-center gap-3">
          <SatelliteIcon size={40} color="var(--signal-primary)" animate />
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-5xl font-black tracking-tight text-gradient-signal mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          SpaceSub
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-sm tracking-widest uppercase mb-12"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}
        >
          Центр мониторинга подписок
        </motion.p>

        {/* Login card */}
        <motion.div
          variants={fadeUp}
          className="station-panel station-panel-glow p-8 relative overflow-hidden"
        >
          <div className="scan-line" />

          <p
            className="text-sm mb-6"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.6)' }}
          >
            Войдите, чтобы начать отслеживать ваши подписки из единого центра управления
          </p>

          <motion.button
            onClick={handleLogin}
            className="btn-signal w-full py-3.5 text-sm font-bold"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Войти через Яндекс
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div
          variants={fadeUp}
          className="mt-16 flex items-center justify-center gap-3"
          style={{ color: 'rgba(200,214,229,0.15)' }}
        >
          <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.2))' }} />
          <span className="text-[10px] tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            Subscription Aggregator v1.0
          </span>
          <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(0,212,170,0.2), transparent)' }} />
        </motion.div>
      </motion.div>
    </div>
  );
}
