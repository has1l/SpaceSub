import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ConnectionCodePage() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCode(null);
    setCopied(false);
    try {
      const { data } = await api.post<{ code: string; expiresAt: string }>(
        '/connection-code',
      );
      setCode(data.code);
      setExpiresAt(new Date(data.expiresAt));
    } catch {
      setError('Не удалось сгенерировать код. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <motion.div
      className="max-w-md mx-auto py-6 md:py-10"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.h1
        variants={fadeUp}
        className="text-2xl font-bold text-text-stellar mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Код подключения
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="text-text-nebula text-sm mb-8"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Сгенерируйте одноразовый код для подключения Flex Банка к SpaceSub. Код действителен 5 минут.
      </motion.p>

      {error && (
        <motion.div
          variants={fadeUp}
          className="cosmic-card p-3 mb-6 text-sm"
          style={{ borderColor: 'rgba(255, 92, 122, 0.2)', color: '#FF5C7A' }}
        >
          {error}
        </motion.div>
      )}

      {!code && (
        <motion.button
          variants={fadeUp}
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 px-6 btn-stellar rounded-xl text-base disabled:opacity-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {loading ? 'Генерация...' : 'Сгенерировать код'}
        </motion.button>
      )}

      {code && (
        <motion.div
          className="cosmic-card p-5 md:p-8 text-center glow-stellar relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Orbital decoration */}
          <div className="orbital-ring" style={{ width: 200, height: 200, top: -60, right: -60, opacity: 0.3 }} />

          <p className="text-text-void text-xs tracking-[0.2em] uppercase mb-5"
             style={{ fontFamily: 'var(--font-mono)' }}>
            ВАШ КОД ПОДКЛЮЧЕНИЯ
          </p>

          <motion.div
            className="text-2xl md:text-4xl font-black tracking-[0.25em] gradient-text-cosmic mb-6"
            style={{ fontFamily: 'var(--font-mono)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {code}
          </motion.div>

          <div className="flex items-center justify-center gap-3 mb-5">
            <motion.button
              onClick={handleCopy}
              className="px-5 py-2 text-sm rounded-lg transition-all duration-300 cursor-pointer"
              style={{
                background: copied ? 'rgba(0, 229, 160, 0.1)' : 'rgba(79, 124, 255, 0.1)',
                color: copied ? '#00E5A0' : '#4F7CFF',
                border: `1px solid ${copied ? 'rgba(0, 229, 160, 0.2)' : 'rgba(79, 124, 255, 0.15)'}`,
                fontFamily: 'var(--font-mono)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              {copied ? 'Скопировано!' : 'Копировать'}
            </motion.button>
          </div>

          {secondsLeft > 0 ? (
            <div className="text-sm text-text-nebula" style={{ fontFamily: 'var(--font-body)' }}>
              Истекает через{' '}
              <span className="font-semibold text-text-stellar" style={{ fontFamily: 'var(--font-mono)' }}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="text-sm font-medium text-aurora-red" style={{ fontFamily: 'var(--font-body)' }}>
              Код истёк. Сгенерируйте новый.
            </div>
          )}

          {secondsLeft <= 0 && (
            <motion.button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 px-6 py-2.5 btn-stellar rounded-lg text-sm disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              Новый код
            </motion.button>
          )}
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="cosmic-card p-4 md:p-5 mt-6 md:mt-8">
        <p className="text-text-stellar text-sm font-medium mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Как использовать:
        </p>
        <ol className="list-none space-y-2.5 text-text-nebula text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          {[
            'Скопируйте код выше',
            'Откройте SpaceSub',
            'Перейдите в «Подключить Flex Банк»',
            'Вставьте код и нажмите «Подключить»',
          ].map((step, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
            >
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded text-accent-blue flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(79,124,255,0.1)', fontFamily: 'var(--font-mono)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {step}
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}
