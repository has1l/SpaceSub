import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import type { Account, Transaction, TransactionCategory } from '../types';
import { CATEGORY_LABELS } from '../types';

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'OTHER', label: 'Другое' },
  { value: 'SUBSCRIPTIONS', label: 'Подписки' },
  { value: 'SUPERMARKETS', label: 'Супермаркеты' },
  { value: 'TRANSFERS', label: 'Переводы' },
  { value: 'DIGITAL_SERVICES', label: 'Цифровые сервисы' },
  { value: 'INVESTMENTS', label: 'Инвестиции' },
  { value: 'TRANSPORT', label: 'Транспорт' },
  { value: 'RESTAURANTS', label: 'Рестораны' },
  { value: 'HEALTH', label: 'Здоровье' },
];

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: 'Расход' },
  { value: 'INCOME', label: 'Доход' },
  { value: 'TRANSFER', label: 'Перевод' },
];

const stagger = { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '', currency: 'RUB', description: '', merchant: '', type: 'EXPENSE', category: 'OTHER',
  });

  const fetchData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        api.get('/accounts'),
        api.get(`/accounts/${id}/transactions`, { params: { ...(from && { from }), ...(to && { to }) } }),
      ]);
      setAccount(accRes.data.find((a: Account) => a.id === id) || null);
      setTransactions(txRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id, from, to]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post(`/accounts/${id}/transactions`, {
        date: new Date(form.date).toISOString(), amount: Number(form.amount), currency: form.currency,
        description: form.description, merchant: form.merchant || undefined, type: form.type, category: form.category,
      });
      setForm({ date: new Date().toISOString().split('T')[0], amount: '', currency: 'RUB', description: '', merchant: '', type: 'EXPENSE', category: 'OTHER' });
      setShowForm(false);
      setLoading(true);
      await fetchData();
    } finally { setCreating(false); }
  };

  const fmtAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <div className="shimmer w-32 h-4 rounded-lg" />
        <div className="shimmer w-48 h-4 rounded-lg" />
        <div className="shimmer w-40 h-12 rounded-xl" />
        <div className="shimmer h-12 rounded-xl mt-4" />
        {[1,2,3,4,5].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Счёт не найден</p>
        <Link to="/dashboard" className="text-accent-blue text-sm mt-2 inline-block">Назад к счетам</Link>
      </div>
    );
  }

  /* Group transactions by date */
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const d = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    (acc[d] ??= []).push(tx);
    return acc;
  }, {});

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="pt-4 lg:pt-6">
      <motion.div variants={fadeUp}>
        <Link to="/dashboard" className="text-text-tertiary hover:text-text-secondary text-sm mb-6 inline-flex items-center gap-1.5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Назад к счетам
        </Link>
      </motion.div>

      {/* Account hero */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-semibold font-display text-text-primary">{account.name}</h1>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase" style={{ background: 'rgba(212,168,83,0.08)', color: 'var(--color-accent-gold-dim)' }}>
            {account.currency}
          </span>
        </div>
        <p className="font-mono text-[40px] md:text-[48px] font-light text-accent-gold tracking-tight">
          {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: account.currency, minimumFractionDigits: 0 }).format(account.balance)}
        </p>
      </motion.div>

      {/* Filters + add button */}
      <motion.div variants={fadeUp} className="data-card p-3 flex flex-wrap items-center gap-2 mb-6">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-cosmic rounded-xl px-3 py-2.5 text-sm flex-1 min-w-[130px]" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-cosmic rounded-xl px-3 py-2.5 text-sm flex-1 min-w-[130px]" />
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">Сброс</button>
        )}
        <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2.5 rounded-xl text-sm ml-auto cursor-pointer">
          {showForm ? 'Отмена' : '+ Операция'}
        </button>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={handleCreate} className="data-card p-4 md:p-6 mb-6"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <h3 className="text-base font-semibold font-display text-text-primary mb-4">Новая операция</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField label="ДАТА" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
              <InputField label="СУММА" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="-799" required step="0.01" />
              <div>
                <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">ТИП</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full input-cosmic px-4 py-2.5 text-sm">
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">КАТЕГОРИЯ</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full input-cosmic px-4 py-2.5 text-sm">
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <InputField label="ОПИСАНИЕ" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="NETFLIX.COM" required />
              <InputField label="МЕРЧАНТ" value={form.merchant} onChange={(v) => setForm({ ...form, merchant: v })} placeholder="Netflix" />
              <div>
                <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">ВАЛЮТА</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full input-cosmic px-4 py-2.5 text-sm">
                  <option value="RUB">RUB</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={creating || !form.amount || !form.description} className="mt-4 btn-primary px-6 py-2.5 text-sm rounded-xl disabled:opacity-40 cursor-pointer">
              {creating ? 'Создание...' : 'Создать'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Transactions */}
      {transactions.length === 0 ? (
        <motion.div variants={fadeUp} className="data-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-20">
            <svg viewBox="0 0 64 64" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1">
              <circle cx="32" cy="32" r="28" strokeDasharray="4 4" />
              <circle cx="32" cy="32" r="3"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" /></circle>
            </svg>
          </div>
          <p className="text-text-secondary text-sm">Операций пока нет</p>
          <p className="text-text-tertiary text-xs mt-1">Создайте первую операцию</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <motion.div key={date} variants={fadeUp}>
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h3 className="font-mono text-xs text-text-tertiary uppercase tracking-wider">{date}</h3>
                <span className="font-mono text-xs text-text-tertiary">
                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(
                    txs.reduce((s, t) => s + t.amount, 0)
                  )}
                </span>
              </div>
              <div className="data-card overflow-hidden">
                {txs.map((tx, i) => {
                  const cat = tx.category as TransactionCategory;
                  return (
                    <div key={tx.id}
                      className="px-4 py-3.5 flex items-center gap-4 hover:bg-surface-interactive/50 transition-colors duration-200"
                      style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      <TxIcon category={tx.category} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{tx.merchant || tx.description}</p>
                        <p className="text-xs text-text-tertiary font-mono mt-0.5">{CATEGORY_LABELS[cat] || cat}</p>
                      </div>
                      <span className={`text-sm font-mono font-light flex-shrink-0 ${tx.amount < 0 ? 'text-accent-red' : 'text-accent-cyan'}`}>
                        {fmtAmount(tx.amount, tx.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required, step }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; step?: string;
}) {
  return (
    <div>
      <label className="block text-text-tertiary text-[10px] tracking-[0.1em] font-mono uppercase mb-1.5">{label}</label>
      <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full input-cosmic px-4 py-2.5 text-sm" />
    </div>
  );
}

const TX_ICONS: Record<string, string> = {
  SUBSCRIPTIONS: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  SUPERMARKETS: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  TRANSFERS: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  DIGITAL_SERVICES: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  INVESTMENTS: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  TRANSPORT: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16H3m10 0h6l3-4H13',
  RESTAURANTS: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  HEALTH: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  OTHER: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
};

function TxIcon({ category }: { category: string }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,111,232,0.06)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={TX_ICONS[category] || TX_ICONS.OTHER} />
      </svg>
    </div>
  );
}
