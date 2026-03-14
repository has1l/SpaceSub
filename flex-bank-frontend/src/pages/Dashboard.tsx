import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { Account } from '../types';
import Spinner from '../components/Spinner';

const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Dashboard() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', currency: 'RUB', balance: '' });
  const [creating, setCreating] = useState(false);

  const fetchAccounts = useCallback(async (signal?: AbortSignal) => {
    // Primary: AuthContext token (set synchronously by flushSync in AuthCallback)
    // Fallback: localStorage (for page refreshes where context hasn't hydrated yet)
    const authToken = token || localStorage.getItem('flexbank_token');
    console.log('[Dashboard] fetchAccounts called, token source:', token ? 'context' : 'localStorage', authToken ? `(${authToken.length} chars)` : 'NONE');

    if (!authToken) {
      console.warn('[Dashboard] fetchAccounts skipped — no token available');
      return;
    }

    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      console.log('[Dashboard] JWT payload:', { sub: payload.sub, email: payload.email, yandexId: payload.yandexId });
    } catch { /* ignore */ }

    try {
      console.log('[Dashboard] Sending GET /accounts...');
      const res = await api.get('/accounts', { signal });
      if (signal?.aborted) return;
      const data = Array.isArray(res.data) ? res.data : [];
      console.log(`[Dashboard] GET /accounts returned ${data.length} accounts`);
      setAccounts(data);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      console.error('[Dashboard] GET /accounts failed:', err);
      setAccounts((prev) => prev.length > 0 ? prev : []);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  // Re-run when token becomes available (handles AuthCallback → navigate flow)
  useEffect(() => {
    if (!token) {
      console.log('[Dashboard] useEffect: waiting for token from AuthContext...');
      return;
    }
    console.log('[Dashboard] useEffect fired, token available');
    setLoading(true);
    const controller = new AbortController();
    fetchAccounts(controller.signal);
    return () => { controller.abort(); };
  }, [token, fetchAccounts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/accounts', {
        name: form.name,
        currency: form.currency,
        initialBalance: Number(form.balance) || 0,
      });
      setForm({ name: '', currency: 'RUB', balance: '' });
      setShowForm(false);
      await fetchAccounts();
    } finally {
      setCreating(false);
    }
  };

  const formatBalance = (balance: number, currency: string) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0,
    }).format(balance ?? 0);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const accountWord = (n: number) => {
    if (n === 1) return 'счёт';
    if (n >= 2 && n <= 4) return 'счёта';
    return 'счетов';
  };

  if (loading) return <Spinner text="Загрузка счетов..." />;

  /* ── Empty state ── */
  if (accounts.length === 0) {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate">
        <motion.div variants={fadeUp} className="cosmic-card p-8 md:p-16 text-center relative overflow-hidden">
          <div className="orbital-ring" style={{ width: 200, height: 200, top: -60, right: -60, opacity: 0.3 }} />
          <EmptyAccountIllustration />
          <p className="text-text-stellar text-xl md:text-2xl font-bold mt-6"
             style={{ fontFamily: 'var(--font-display)' }}>
            У вас пока нет счетов
          </p>
          <p className="text-text-nebula text-sm mt-2 mb-8"
             style={{ fontFamily: 'var(--font-body)' }}>
            Создайте первый счёт, чтобы начать управлять финансами
          </p>

          {showForm ? (
            <motion.form
              onSubmit={handleCreate}
              className="text-left max-w-sm mx-auto"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                         style={{ fontFamily: 'var(--font-mono)' }}>НАЗВАНИЕ</label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Основной счёт" required
                    className="w-full input-cosmic px-4 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                           style={{ fontFamily: 'var(--font-mono)' }}>ВАЛЮТА</label>
                    <select value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full input-cosmic px-4 py-2.5 text-sm">
                      <option value="RUB">RUB</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                           style={{ fontFamily: 'var(--font-mono)' }}>БАЛАНС</label>
                    <input type="number" value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      placeholder="0"
                      className="w-full input-cosmic px-4 py-2.5 text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-center">
                <motion.button type="submit" disabled={creating || !form.name}
                  className="btn-stellar px-6 py-2.5 text-sm rounded-xl disabled:opacity-40"
                  whileTap={{ scale: 0.98 }}>
                  {creating ? 'Создание...' : 'Создать'}
                </motion.button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 text-sm rounded-xl text-text-nebula transition-colors hover:text-text-stellar"
                  style={{ border: '1px solid rgba(79,124,255,0.1)' }}>
                  Отмена
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              onClick={() => setShowForm(true)}
              className="btn-stellar px-8 py-3 text-sm rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Создать первый счёт
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  /* ── Normal state ── */
  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      {/* Hero -- Total Balance */}
      <motion.div variants={fadeUp} className="cosmic-card p-5 md:p-8 mb-5 md:mb-8 glow-stellar relative overflow-hidden">
        <div className="orbital-ring" style={{ width: 180, height: 180, top: -40, right: -40, opacity: 0.4 }} />
        <div className="orbital-ring" style={{ width: 120, height: 120, top: -10, right: -10, opacity: 0.2, animationDuration: '15s', animationDirection: 'reverse' }} />

        <p className="text-text-nebula text-xs tracking-[0.2em] uppercase mb-3"
           style={{ fontFamily: 'var(--font-mono)' }}>
          Общий баланс
        </p>
        <p className="text-3xl md:text-5xl font-black text-text-stellar mb-2 tracking-tight"
           style={{ fontFamily: 'var(--font-display)' }}>
          {formatBalance(totalBalance, 'RUB')}
        </p>
        <p className="text-text-void text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          {accounts.length} {accountWord(accounts.length)}
        </p>
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-stellar" style={{ fontFamily: 'var(--font-display)' }}>
          Мои счета
        </h2>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          className="btn-stellar px-5 py-2.5 text-sm rounded-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showForm ? 'Отмена' : '+ Новый счёт'}
        </motion.button>
      </motion.div>

      {/* Create form */}
      {showForm && (
        <motion.form
          onSubmit={handleCreate}
          className="cosmic-card p-6 mb-8"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <h3 className="text-lg font-semibold text-text-stellar mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Создать счёт
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-text-nebula text-sm mb-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                НАЗВАНИЕ
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Основной счёт"
                required
                className="w-full input-cosmic px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-text-nebula text-sm mb-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                ВАЛЮТА
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full input-cosmic px-4 py-2.5 text-sm"
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-text-nebula text-sm mb-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                НАЧАЛЬНЫЙ БАЛАНС
              </label>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
                className="w-full input-cosmic px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={creating || !form.name}
            className="mt-4 btn-stellar px-6 py-2.5 text-sm rounded-lg disabled:opacity-40"
            whileTap={{ scale: 0.98 }}
          >
            {creating ? 'Создание...' : 'Создать'}
          </motion.button>
        </motion.form>
      )}

      {/* Accounts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc, i) => (
          <motion.div
            key={acc.id}
            variants={fadeUp}
            custom={i}
          >
            <Link
              to={`/accounts/${acc.id}`}
              className="cosmic-card cosmic-card-hover p-5 md:p-6 block relative group"
            >
              <div className="absolute -inset-px rounded-[1rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{
                     background: 'linear-gradient(135deg, rgba(79,124,255,0.1), rgba(123,97,255,0.05))',
                     zIndex: -1,
                   }} />

              <div className="flex items-center justify-between mb-4">
                <span className="text-text-nebula text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                  {acc.name ?? 'Счёт'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
                      style={{
                        background: 'rgba(79, 124, 255, 0.1)',
                        color: '#4F7CFF',
                        fontFamily: 'var(--font-mono)',
                      }}>
                  {acc.currency ?? 'RUB'}
                </span>
              </div>

              <div className="text-xl md:text-2xl font-bold text-text-stellar mb-1"
                   style={{ fontFamily: 'var(--font-display)' }}>
                {formatBalance(acc.balance ?? 0, acc.currency ?? 'RUB')}
              </div>

              <div className="text-text-void text-xs mt-3 flex items-center gap-1.5"
                   style={{ fontFamily: 'var(--font-mono)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00E5A0', boxShadow: '0 0 6px rgba(0,229,160,0.4)' }} />
                {acc.createdAt
                  ? `Открыт ${new Date(acc.createdAt).toLocaleDateString('ru-RU')}`
                  : 'Дата неизвестна'}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function EmptyAccountIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      className="mx-auto"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Orbit rings */}
      <ellipse cx="60" cy="60" rx="50" ry="18" stroke="rgba(79,124,255,0.15)" strokeWidth="1" strokeDasharray="4 4">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="20s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="60" cy="60" rx="35" ry="12" stroke="rgba(123,97,255,0.12)" strokeWidth="1" strokeDasharray="3 3">
        <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="15s" repeatCount="indefinite" />
      </ellipse>
      {/* Card body (bank card shape) */}
      <rect x="40" y="45" width="40" height="28" rx="5" fill="rgba(79,124,255,0.12)" stroke="rgba(79,124,255,0.25)" strokeWidth="1" />
      <rect x="46" y="52" width="12" height="8" rx="1.5" fill="rgba(79,124,255,0.2)" />
      <line x1="46" y1="66" x2="74" y2="66" stroke="rgba(79,124,255,0.15)" strokeWidth="1" />
      {/* Center glow */}
      <circle cx="60" cy="59" r="4" fill="#4F7CFF" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Orbiting dot */}
      <circle r="2.5" fill="#7B61FF">
        <animateMotion dur="6s" repeatCount="indefinite" path="M60,60 m-35,0 a35,12 0 1,0 70,0 a35,12 0 1,0 -70,0" />
        <animate attributeName="opacity" values="0.3;1;0.3" dur="6s" repeatCount="indefinite" />
      </circle>
    </motion.svg>
  );
}
