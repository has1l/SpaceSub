import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { SatelliteIcon } from '../components/SatelliteIcon';
import { OrbitDecoration } from '../components/OrbitDecoration';

const stagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function ConnectFlex() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get('error');

  const handleOAuthConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ url: string }>('/bank-integration/flex/oauth');
      window.location.href = data.url;
    } catch {
      setError('Не удалось инициировать подключение банка.');
      setLoading(false);
    }
  };

  const handleCodeConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!/^FB-[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Код должен быть в формате FB-XXXXXX');
      return;
    }
    setCodeLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/bank-integration/flex/connect-by-code', { code: trimmed });
      setSuccess(true);
      setCode('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Не удалось подключить банк по коду.';
      setError(msg);
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-lg mx-auto px-4 py-6 md:py-14"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SatelliteIcon size={24} color="var(--signal-primary)" animate />
          <h1
            className="text-2xl font-extrabold text-gradient-signal"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Подключить Flex Bank
          </h1>
        </div>
        <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}>
          Свяжите банковский спутник со SpaceSub одним из двух способов
        </p>
      </motion.div>

      {/* Errors */}
      {(error || oauthError) && (
        <motion.div
          variants={fadeUp}
          className="station-panel px-5 py-3.5 mb-6 flex items-center gap-2"
          style={{ borderColor: 'rgba(239,68,68,0.2)' }}
        >
          <div className="status-dot status-dot-danger" />
          <p className="text-sm" style={{ color: 'var(--signal-danger)' }}>
            {error || 'Не удалось подключить банк. Попробуйте снова.'}
          </p>
        </motion.div>
      )}

      {/* Success */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="station-panel px-5 py-3.5 mb-6 flex items-center gap-2"
          style={{ borderColor: 'rgba(0,212,170,0.2)' }}
        >
          <div className="status-dot status-dot-active" />
          <p className="text-sm" style={{ color: 'var(--signal-primary)' }}>
            Flex Bank успешно подключён!{' '}
            <a
              href="/dashboard"
              className="underline font-medium"
              style={{ color: 'var(--signal-primary)' }}
            >
              Перейти к панели управления
            </a>
          </p>
        </motion.div>
      )}

      {/* Method 1: Connection Code */}
      <motion.div
        variants={fadeUp}
        className="station-panel station-panel-glow p-5 md:p-7 mb-5 relative overflow-hidden"
      >
        <OrbitDecoration className="opacity-20" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--signal-primary)',
                background: 'rgba(0,212,170,0.08)',
              }}
            >
              Способ 01
            </span>
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
          >
            Код подключения
          </h2>
          <p
            className="text-xs mb-5"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}
          >
            Сгенерируйте код в Flex Bank и введите его здесь. Код действует 5 минут.
          </p>

          <form onSubmit={handleCodeConnect} className="flex gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="FB-XXXXXX"
              maxLength={9}
              className="input-station flex-1 text-center text-lg tracking-[0.25em] font-bold"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <motion.button
              type="submit"
              disabled={codeLoading || code.trim().length < 9}
              className="btn-signal px-6 whitespace-nowrap"
              whileTap={{ scale: 0.98 }}
            >
              {codeLoading ? '...' : 'Подключить'}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Divider */}
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-px" style={{ background: 'rgba(0,212,170,0.06)' }} />
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.2)' }}
        >
          или
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,212,170,0.06)' }} />
      </motion.div>

      {/* Method 2: OAuth */}
      <motion.div
        variants={fadeUp}
        className="station-panel p-5 md:p-7 text-center relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--signal-secondary)',
                background: 'rgba(14,165,233,0.08)',
              }}
            >
              Способ 02
            </span>
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
          >
            Через Яндекс
          </h2>
          <p
            className="text-xs mb-5"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}
          >
            Авторизуйтесь через Яндекс для автоматического подключения
          </p>

          <motion.button
            onClick={handleOAuthConnect}
            disabled={loading}
            className="btn-signal w-full py-3.5"
            style={{
              background: 'linear-gradient(135deg, var(--signal-secondary), #0284c7)',
              boxShadow: '0 0 20px rgba(14,165,233,0.2)',
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {loading ? 'Перенаправление...' : 'Подключить через Яндекс'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
