import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { Account, Transaction } from '../types';

const stagger = { animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Dashboard() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', currency: 'RUB', balance: '' });
  const [creating, setCreating] = useState(false);

  const fetchAccounts = useCallback(async (signal?: AbortSignal) => {
    const authToken = token || localStorage.getItem('flexbank_token');
    if (!authToken) return;
    try {
      const [accRes, txRes] = await Promise.all([
        api.get('/accounts', { signal }),
        api.get('/transactions', { signal }),
      ]);
      if (signal?.aborted) return;
      setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
      const txs = Array.isArray(txRes.data) ? txRes.data : [];
      setRecentTx(txs.slice(0, 5));
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setAccounts(prev => prev.length > 0 ? prev : []);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const controller = new AbortController();
    fetchAccounts(controller.signal);
    return () => { controller.abort(); };
  }, [token, fetchAccounts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/accounts', { name: form.name, currency: form.currency, initialBalance: Number(form.balance) || 0 });
      setForm({ name: '', currency: 'RUB', balance: '' });
      setShowForm(false);
      await fetchAccounts();
    } finally { setCreating(false); }
  };

  const fmtBal = (balance: number, currency: string) => {
    const parts = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balance ?? 0).split(',');
    return { whole: parts[0], decimal: parts[1], sign: currency === 'RUB' ? ' ₽' : ` ${currency}` };
  };

  const fmtAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const total = fmtBal(totalBalance, 'RUB');

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6 pt-6">
        <div className="flex flex-col items-center py-16">
          <div className="shimmer w-32 h-3 mb-4" />
          <div className="shimmer w-56 h-14 rounded-2xl mb-3" />
          <div className="shimmer w-40 h-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (accounts.length === 0) {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="pt-6">
        <motion.div variants={fadeUp} className="data-card-elevated p-8 md:p-16 text-center">
          <div className="w-24 h-24 mx-auto mb-6 opacity-30 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect x="20" y="28" width="40" height="24" rx="4" stroke="var(--color-accent-gold)" strokeWidth="1" opacity="0.4" />
              <rect x="26" y="34" width="12" height="8" rx="1.5" fill="rgba(212,168,83,0.15)" />
              <circle cx="40" cy="40" r="30" stroke="var(--color-border-subtle)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>
          <p className="text-lg font-semibold font-display text-text-secondary">Нет открытых счетов</p>
          <p className="text-sm text-text-tertiary mt-2 mb-8">Создайте первый счёт, чтобы начать управлять финансами</p>

          <AnimatePresence mode="wait">
            {showForm ? (
              <CreateAccountForm key="form" form={form} setForm={setForm} creating={creating} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            ) : (
              <motion.button key="btn" onClick={() => setShowForm(true)}
                className="btn-primary px-8 py-3.5 text-sm rounded-2xl cursor-pointer"
                whileTap={{ scale: 0.97 }}>
                Открыть счёт
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  /* ── Normal ── */
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="pt-4 lg:pt-8">
      {/* Gravity Balance */}
      <motion.div variants={fadeUp} className="relative flex flex-col items-center py-12 md:py-20 mb-6">
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.03) 0%, transparent 70%)', animation: 'gravity-pulse 8s ease-in-out infinite' }} />
        <p className="text-xs font-body uppercase tracking-[0.15em] text-text-tertiary mb-3 relative z-10">ОБЩИЙ БАЛАНС</p>
        <GravityNumber whole={total.whole} decimal={total.decimal} sign={total.sign} />
        <div className="flex items-center gap-4 mt-4 relative z-10">
          <span className="text-sm text-text-secondary">{accounts.length} {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'}</span>
          <span className="w-px h-4 bg-border-subtle" />
          <span className="font-mono text-xs text-text-tertiary">обновлено {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="flex gap-3 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl text-sm whitespace-nowrap flex items-center gap-2 cursor-pointer transition-all duration-200
                     bg-surface-elevated border border-border-subtle text-text-secondary hover:border-accent-blue/20 hover:text-accent-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Новый счёт
        </button>
        <Link to="/connect"
          className="px-4 py-2.5 rounded-xl text-sm whitespace-nowrap flex items-center gap-2
                     bg-surface-elevated border border-border-subtle text-text-secondary hover:border-accent-blue/20 hover:text-accent-blue transition-all duration-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          Код подключения
        </Link>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <CreateAccountForm form={form} setForm={setForm} creating={creating} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accounts */}
      <motion.div variants={fadeUp} className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold font-display text-text-primary">Счета</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const b = fmtBal(acc.balance ?? 0, acc.currency ?? 'RUB');
          return (
            <motion.div key={acc.id} variants={fadeUp}>
              <Link to={`/accounts/${acc.id}`} className="data-card-elevated p-5 block group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-text-primary truncate">{acc.name ?? 'Счёт'}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase"
                        style={{ background: 'rgba(212,168,83,0.08)', color: 'var(--color-accent-gold-dim)' }}>
                    {acc.currency ?? 'RUB'}
                  </span>
                </div>
                <div className="font-mono text-2xl font-light text-accent-gold mt-1 mb-2">
                  {b.whole}<span className="text-accent-gold-dim text-lg">,{b.decimal}{b.sign}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono">
                  <PulseRing color="var(--color-accent-cyan)" />
                  {acc.createdAt ? `Открыт ${new Date(acc.createdAt).toLocaleDateString('ru-RU')}` : 'Дата неизвестна'}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <motion.div variants={fadeUp} className="mt-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold font-display text-text-primary">Последние операции</h2>
            <Link to="/transactions" className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors">Все →</Link>
          </div>
          <div className="data-card overflow-hidden">
            {recentTx.map((tx, i) => (
              <div key={tx.id} className="px-4 py-3.5 flex items-center gap-4 hover:bg-surface-interactive/50 transition-colors duration-200"
                   style={{ borderBottom: i < recentTx.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <CategoryIcon category={tx.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{tx.merchant || tx.description}</p>
                  <p className="text-xs text-text-tertiary font-mono mt-0.5">{new Date(tx.date).toLocaleDateString('ru-RU')}</p>
                </div>
                <span className={`text-sm font-mono font-light flex-shrink-0 ${tx.amount < 0 ? 'text-accent-red' : 'text-accent-cyan'}`}>
                  {fmtAmount(tx.amount, tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Sub-components ── */

function GravityNumber({ whole, decimal, sign }: { whole: string; decimal: string; sign: string }) {
  const [displayed, setDisplayed] = useState(0);
  const target = parseFloat(whole.replace(/\s/g, '') + '.' + decimal);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const dur = 1500;
    const from = 0;
    const to = target;
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplayed(from + (to - from) * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  const parts = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayed).split(',');

  return (
    <motion.div
      className="relative z-10 font-display font-extralight tracking-tighter text-accent-gold"
      style={{ fontSize: 'clamp(48px, 10vw, 72px)' }}
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {parts[0]}<span className="text-accent-gold-dim" style={{ fontSize: '0.55em' }}>,{parts[1]}{sign}</span>
    </motion.div>
  );
}

function PulseRing({ color }: { color: string }) {
  return (
    <span className="relative w-2 h-2 flex-shrink-0">
      <span className="absolute inset-0 rounded-full" style={{ background: color, opacity: 0.3, animation: 'pulse-ring 2s ease-out infinite' }} />
      <span className="absolute inset-[2px] rounded-full" style={{ background: color }} />
    </span>
  );
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  SUBSCRIPTIONS: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8',
  SUPERMARKETS: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  TRANSFERS: 'M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3',
  ENTERTAINMENT: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  DIGITAL_SERVICES: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  INVESTMENTS: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  TRANSPORT: 'M8 17h8M8 17l-2 3M16 17l2 3M12 2l5 7H7l5-7zM6 9h12v8H6z',
  RESTAURANTS: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  HEALTH: 'M22 12h-4l-3 9L9 3l-3 9H2',
};

function CategoryIcon({ category }: { category: string }) {
  const path = CATEGORY_ICON_MAP[category];
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
         style={{ background: 'rgba(59, 111, 232, 0.06)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {path ? <path d={path} /> : <circle cx="12" cy="12" r="1" />}
      </svg>
    </div>
  );
}

function CreateAccountForm({ form, setForm, creating, onSubmit, onCancel }: {
  form: { name: string; currency: string; balance: string };
  setForm: (f: typeof form) => void;
  creating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <motion.form onSubmit={onSubmit} className="data-card p-5 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <h3 className="text-base font-semibold font-display text-text-primary mb-4">Новый счёт</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">НАЗВАНИЕ</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Основной счёт" required className="w-full input-cosmic px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">ВАЛЮТА</label>
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full input-cosmic px-4 py-2.5 text-sm">
            <option value="RUB">RUB</option><option value="USD">USD</option><option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">БАЛАНС</label>
          <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" className="w-full input-cosmic px-4 py-2.5 text-sm" />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button type="submit" disabled={creating || !form.name} className="btn-primary px-6 py-2.5 text-sm rounded-xl disabled:opacity-40 cursor-pointer">
          {creating ? 'Создание...' : 'Создать'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 text-sm rounded-xl text-text-secondary border border-border-subtle hover:text-text-primary transition-colors cursor-pointer">
          Отмена
        </button>
      </div>
    </motion.form>
  );
}
