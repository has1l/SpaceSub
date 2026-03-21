import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

const TOTAL_SECONDS = 300; // 5 min

export default function ConnectionCodePage() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const handleGenerate = async () => {
    setLoading(true); setError(null); setCode(null); setCopied(false);
    try {
      const { data } = await api.post<{ code: string; expiresAt: string }>('/connection-code');
      setCode(data.code);
      setExpiresAt(new Date(data.expiresAt));
    } catch { setError('Не удалось сгенерировать код. Попробуйте снова.'); }
    finally { setLoading(false); }
  };

  const handleCopy = useCallback(() => {
    if (code) { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, [code]);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = secondsLeft / TOTAL_SECONDS;

  // Timer ring color
  const ringColor = secondsLeft <= 15 ? 'var(--color-accent-red)' : secondsLeft <= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-cyan)';
  const circumference = 2 * Math.PI * 28;

  return (
    <motion.div
      className="max-w-md mx-auto py-6 md:py-10 flex flex-col items-center"
      initial="initial" animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.h1 variants={fadeUp} className="text-2xl font-semibold font-display text-text-primary mb-1 self-start">
        Код подключения
      </motion.h1>
      <motion.p variants={fadeUp} className="text-sm text-text-secondary mb-8 self-start">
        Сгенерируйте одноразовый код для подключения к SpaceSub. Код действует 5 минут.
      </motion.p>

      {error && (
        <motion.div variants={fadeUp} className="data-card p-3 mb-6 w-full text-sm text-accent-red border-accent-red/20">
          {error}
        </motion.div>
      )}

      {!code && (
        <motion.button variants={fadeUp} onClick={handleGenerate} disabled={loading}
          className="w-full py-6 rounded-3xl bg-accent-blue text-white font-semibold font-display text-lg cursor-pointer
                     shadow-[0_4px_32px_rgba(59,111,232,0.25)] hover:shadow-[0_0_40px_rgba(59,111,232,0.3)]
                     active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
          {loading ? 'Генерация...' : 'Сгенерировать код'}
        </motion.button>
      )}

      {code && (
        <motion.div className="data-card-elevated p-6 md:p-10 text-center w-full"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

          <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-mono mb-6">КОД ПОДКЛЮЧЕНИЯ</p>

          {/* Animated code characters */}
          <div className="flex justify-center gap-0.5 mb-6">
            {code.split('').map((char, i) => (
              <motion.span key={i}
                className={`font-mono font-light tracking-[0.1em] ${char === '-' ? 'text-text-tertiary text-[28px] md:text-[36px]' : 'text-accent-gold text-[32px] md:text-[44px]'}`}
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Copy */}
          <button onClick={handleCopy}
            className="text-sm font-mono px-5 py-2 rounded-lg transition-all duration-200 cursor-pointer mb-6"
            style={{
              background: copied ? 'rgba(45,212,191,0.1)' : 'rgba(59,111,232,0.08)',
              color: copied ? 'var(--color-accent-cyan)' : 'var(--color-accent-blue)',
              border: `1px solid ${copied ? 'rgba(45,212,191,0.2)' : 'rgba(59,111,232,0.12)'}`,
            }}>
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>

          {/* Timer ring */}
          {secondsLeft > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border-subtle)" strokeWidth="3" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={ringColor} strokeWidth="3"
                    strokeLinecap="round" strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-base text-text-primary">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs text-text-tertiary mt-2">Осталось</span>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-accent-red font-medium mb-4">Код истёк</p>
              <button onClick={handleGenerate} disabled={loading}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer">
                Новый код
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Instructions */}
      <motion.div variants={fadeUp} className="data-card p-4 md:p-5 mt-6 w-full">
        <p className="text-sm font-semibold font-display text-text-primary mb-3">Как подключить</p>
        <ol className="space-y-2.5 text-text-secondary text-sm">
          {['Скопируйте код выше', 'Откройте SpaceSub', 'Перейдите в «Подключить Flex Банк»', 'Вставьте код и нажмите «Подключить»'].map((step, i) => (
            <motion.li key={i} className="flex items-start gap-3"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0"
                    style={{ background: 'rgba(59,111,232,0.1)', color: 'var(--color-accent-blue)' }}>
                {i + 1}
              </span>
              {step}
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}
