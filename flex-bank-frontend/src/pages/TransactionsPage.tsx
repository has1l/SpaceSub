import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { Transaction, TransactionCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import CategoryIcon from '../components/CategoryIcon';
import Spinner from '../components/Spinner';

const stagger = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions').then((res) => {
      setTransactions(res.data);
      setLoading(false);
    });
  }, []);

  const formatAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const date = new Date(tx.date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    (acc[date] ??= []).push(tx);
    return acc;
  }, {});

  if (loading) return <Spinner text="Загрузка операций..." />;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1
        variants={fadeUp}
        className="text-2xl font-bold text-text-stellar mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Операции
      </motion.h1>

      {transactions.length === 0 ? (
        <motion.div variants={fadeUp} className="cosmic-card p-8 md:p-16 text-center">
          <EmptyTransactionsIllustration />
          <p className="text-text-nebula text-lg mt-6" style={{ fontFamily: 'var(--font-display)' }}>
            Нет операций
          </p>
          <p className="text-text-void text-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Добавьте транзакцию в одном из счетов
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <motion.div key={date} variants={fadeUp}>
              <h3 className="text-text-void text-xs tracking-[0.15em] uppercase mb-3 px-1"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                {date}
              </h3>
              <div className="cosmic-card overflow-hidden">
                {txs.map((tx, i) => {
                  const cat = tx.category as TransactionCategory;
                  return (
                    <motion.div
                      key={tx.id}
                      className="px-4 py-3.5 md:px-5 md:py-4 flex items-center gap-4 transition-all duration-300 group"
                      style={{
                        borderBottom: i < txs.length - 1 ? '1px solid rgba(79, 124, 255, 0.04)' : 'none',
                      }}
                      whileHover={{ backgroundColor: 'rgba(79, 124, 255, 0.03)' }}
                    >
                      <div className="transition-transform duration-300 group-hover:scale-110">
                        <CategoryIcon category={cat} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-text-stellar text-sm font-medium truncate"
                           style={{ fontFamily: 'var(--font-body)' }}>
                          {tx.merchant || tx.description}
                        </p>
                        <p className="text-text-void text-xs mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                          {CATEGORY_LABELS[cat] || cat}
                          {tx.account && (
                            <span className="ml-2 text-text-void/60">· {tx.account.name}</span>
                          )}
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
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function EmptyTransactionsIllustration() {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      className="mx-auto"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Radar dish */}
      <path d="M30 65 Q50 30 70 65" stroke="rgba(79,124,255,0.3)" strokeWidth="1.5" fill="none" />
      <path d="M35 65 Q50 38 65 65" stroke="rgba(79,124,255,0.2)" strokeWidth="1" fill="none" />
      <line x1="50" y1="55" x2="50" y2="80" stroke="rgba(79,124,255,0.25)" strokeWidth="1.5" />
      <line x1="40" y1="80" x2="60" y2="80" stroke="rgba(79,124,255,0.2)" strokeWidth="1.5" />
      {/* Signal waves */}
      <circle cx="50" cy="45" r="8" stroke="rgba(79,124,255,0.2)" strokeWidth="0.5" fill="none">
        <animate attributeName="r" values="8;20;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="45" r="12" stroke="rgba(123,97,255,0.15)" strokeWidth="0.5" fill="none">
        <animate attributeName="r" values="12;28;12" dur="3s" repeatCount="indefinite" begin="0.5s" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx="50" cy="45" r="3" fill="#4F7CFF" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    </motion.svg>
  );
}
