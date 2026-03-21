import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { Transaction, TransactionCategory } from '../types';
import { CATEGORY_LABELS } from '../types';

const stagger = { animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions').then((res) => { setTransactions(res.data); setLoading(false); });
  }, []);

  const fmtAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const date = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    (acc[date] ??= []).push(tx);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-5 pt-6">
        <div className="shimmer w-40 h-6 rounded-lg" />
        {[1,2,3].map(g => (
          <div key={g} className="space-y-2">
            <div className="shimmer w-32 h-3 rounded" />
            {[1,2,3,4].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="pt-4 lg:pt-6">
      <motion.div variants={fadeUp} className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold font-display text-text-primary">Все операции</h1>
        <span className="font-mono text-xs text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded-md">
          {transactions.length} операций
        </span>
      </motion.div>

      {transactions.length === 0 ? (
        <motion.div variants={fadeUp} className="data-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-15">
            <svg viewBox="0 0 64 64" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1">
              <path d="M20 42Q32 20 44 42" strokeLinecap="round" />
              <line x1="32" y1="36" x2="32" y2="52" />
              <line x1="26" y1="52" x2="38" y2="52" />
              <circle cx="32" cy="28" r="5"><animate attributeName="r" values="5;12;5" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" /></circle>
            </svg>
          </div>
          <p className="text-text-secondary">Нет операций</p>
          <p className="text-text-tertiary text-sm mt-1">Добавьте транзакцию в одном из счетов</p>
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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,111,232,0.06)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={TX_ICONS[tx.category] || TX_ICONS.OTHER} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{tx.merchant || tx.description}</p>
                        <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                          {CATEGORY_LABELS[cat] || cat}
                          {tx.account && <span className="opacity-60"> · {tx.account.name}</span>}
                        </p>
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
