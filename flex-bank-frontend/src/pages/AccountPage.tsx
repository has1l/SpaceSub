import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { Account, Transaction, TransactionCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import Spinner from '../components/Spinner';

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

const stagger = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

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
    amount: '',
    currency: 'RUB',
    description: '',
    merchant: '',
    type: 'EXPENSE',
    category: 'OTHER',
  });

  const fetchData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        api.get('/accounts'),
        api.get(`/accounts/${id}/transactions`, {
          params: { ...(from && { from }), ...(to && { to }) },
        }),
      ]);
      const acc = accRes.data.find((a: Account) => a.id === id);
      setAccount(acc || null);
      setTransactions(txRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, from, to]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post(`/accounts/${id}/transactions`, {
        date: new Date(form.date).toISOString(),
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description,
        merchant: form.merchant || undefined,
        type: form.type,
        category: form.category,
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'RUB',
        description: '',
        merchant: '',
        type: 'EXPENSE',
        category: 'OTHER',
      });
      setShowForm(false);
      setLoading(true);
      await fetchData();
    } finally {
      setCreating(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  if (loading) return <Spinner text="Загрузка счёта..." />;
  if (!account) {
    return (
      <div className="text-center py-16">
        <p className="text-text-nebula">Счёт не найден</p>
        <Link to="/dashboard" className="text-accent-blue hover:text-accent-cyan text-sm mt-2 inline-block transition-colors">
          Назад к счетам
        </Link>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <Link to="/dashboard" className="text-text-void hover:text-text-nebula text-sm mb-6 inline-flex items-center gap-1.5 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Назад к счетам
        </Link>
      </motion.div>

      {/* Account card */}
      <motion.div variants={fadeUp} className="cosmic-card p-5 md:p-6 mb-5 md:mb-8 glow-stellar relative overflow-hidden">
        <div className="orbital-ring" style={{ width: 150, height: 150, top: -35, right: -35, opacity: 0.3 }} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-text-nebula text-sm mb-1" style={{ fontFamily: 'var(--font-body)' }}>{account.name}</p>
            <p className="text-2xl md:text-3xl font-bold text-text-stellar" style={{ fontFamily: 'var(--font-display)' }}>
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: account.currency,
                minimumFractionDigits: 0,
              }).format(account.balance)}
            </p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: 'rgba(79, 124, 255, 0.1)',
                  color: '#4F7CFF',
                  fontFamily: 'var(--font-mono)',
                }}>
            {account.currency}
          </span>
        </div>
      </motion.div>

      {/* Transactions header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-text-stellar" style={{ fontFamily: 'var(--font-display)' }}>
          Транзакции
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-cosmic rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-cosmic rounded-lg px-3 py-2 text-sm"
          />
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="btn-stellar px-4 py-2 rounded-lg text-sm"
            whileTap={{ scale: 0.98 }}
          >
            {showForm ? 'Отмена' : '+ Транзакция'}
          </motion.button>
        </div>
      </motion.div>

      {/* Create transaction form */}
      {showForm && (
        <motion.form
          onSubmit={handleCreate}
          className="cosmic-card p-4 md:p-6 mb-4 md:mb-6"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-text-stellar mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Новая транзакция
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'ДАТА', type: 'date', key: 'date', required: true },
              { label: 'СУММА', type: 'number', key: 'amount', placeholder: '-799', required: true },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                       style={{ fontFamily: 'var(--font-mono)' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  step={field.type === 'number' ? '0.01' : undefined}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full input-cosmic px-4 py-2.5 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                     style={{ fontFamily: 'var(--font-mono)' }}>ТИП</label>
              <select value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full input-cosmic px-4 py-2.5 text-sm">
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                     style={{ fontFamily: 'var(--font-mono)' }}>КАТЕГОРИЯ</label>
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full input-cosmic px-4 py-2.5 text-sm">
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                     style={{ fontFamily: 'var(--font-mono)' }}>ОПИСАНИЕ</label>
              <input type="text" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="NETFLIX.COM" required
                className="w-full input-cosmic px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-text-void text-xs tracking-[0.1em] mb-1.5"
                     style={{ fontFamily: 'var(--font-mono)' }}>МЕРЧАНТ</label>
              <input type="text" value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="Netflix"
                className="w-full input-cosmic px-4 py-2.5 text-sm" />
            </div>
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
          </div>
          <motion.button
            type="submit"
            disabled={creating || !form.amount || !form.description}
            className="mt-4 btn-stellar px-6 py-2.5 text-sm rounded-lg disabled:opacity-40"
            whileTap={{ scale: 0.98 }}
          >
            {creating ? 'Создание...' : 'Создать'}
          </motion.button>
        </motion.form>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <motion.div variants={fadeUp} className="cosmic-card p-12 text-center">
          <p className="text-text-nebula" style={{ fontFamily: 'var(--font-body)' }}>Нет транзакций</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="cosmic-card overflow-hidden">
          {transactions.map((tx, i) => {
            const cat = tx.category as TransactionCategory;
            return (
              <motion.div
                key={tx.id}
                className="px-4 py-3.5 md:px-5 md:py-4 flex items-center gap-4 transition-all duration-300 group"
                style={{
                  borderBottom: i < transactions.length - 1 ? '1px solid rgba(79, 124, 255, 0.04)' : 'none',
                }}
                whileHover={{ backgroundColor: 'rgba(79, 124, 255, 0.03)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                     style={{ background: 'rgba(79, 124, 255, 0.08)' }}>
                  {CATEGORY_ICONS[cat] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-stellar text-sm font-medium truncate">
                    {tx.merchant || tx.description}
                  </p>
                  <p className="text-text-void text-xs mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {new Date(tx.date).toLocaleDateString('ru-RU')} · {CATEGORY_LABELS[cat] || cat}
                  </p>
                </div>
                <div className={`text-sm font-semibold flex-shrink-0 ${
                  tx.amount < 0 ? 'text-aurora-red' : 'text-aurora-green'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatAmount(tx.amount, tx.currency)}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
