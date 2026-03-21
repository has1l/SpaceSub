import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { Account, TransactionCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

interface AccountSummary {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  expenseByCategory: Record<string, number>;
}

const stagger = { animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: accs } = await api.get<Account[]>('/accounts');
        setAccounts(accs);
        const results = await Promise.all(accs.map(a => api.get<AccountSummary>(`/accounts/${a.id}/summary`)));
        setSummaries(results.map(r => r.data));
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 pt-6">
        <div className="shimmer w-32 h-6 rounded-lg" />
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}</div>
        <div className="shimmer w-[240px] h-[240px] rounded-full mx-auto mt-4" style={{ borderWidth: 28, borderColor: 'var(--color-surface-elevated)', borderStyle: 'solid', background: 'transparent' }} />
        <div className="space-y-2 mt-4">{[1,2,3,4,5].map(i => <div key={i} className="shimmer h-10 rounded-lg" />)}</div>
      </div>
    );
  }

  const totalIncome = summaries.reduce((s, a) => s + a.totalIncome, 0);
  const totalExpense = summaries.reduce((s, a) => s + a.totalExpense, 0);
  const totalTxCount = summaries.reduce((s, a) => s + a.transactionCount, 0);

  const mergedCategories: Record<string, number> = {};
  for (const s of summaries) {
    for (const [cat, val] of Object.entries(s.expenseByCategory)) {
      mergedCategories[cat] = (mergedCategories[cat] || 0) + val;
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(n);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="pt-4 lg:pt-6">
      <motion.h1 variants={fadeUp} className="text-2xl font-semibold font-display text-text-primary mb-6">
        Аналитика
      </motion.h1>

      {accounts.length === 0 ? (
        <motion.div variants={fadeUp} className="data-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-10">
            <svg viewBox="0 0 64 64" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1">
              <circle cx="32" cy="32" r="28" /><circle cx="32" cy="32" r="18" /><circle cx="32" cy="32" r="8" />
              <line x1="32" y1="32" x2="32" y2="4" />
            </svg>
          </div>
          <p className="text-text-secondary">Нет данных для анализа</p>
          <p className="text-text-tertiary text-sm mt-1">Создайте счёт и добавьте операции</p>
        </motion.div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'ДОХОДЫ', value: fmt(totalIncome), cls: 'text-accent-cyan' },
              { label: 'РАСХОДЫ', value: fmt(totalExpense), cls: 'text-accent-red' },
              { label: 'ОПЕРАЦИЙ', value: String(totalTxCount), cls: 'text-accent-gold' },
            ].map((card, i) => (
              <motion.div key={card.label} variants={fadeUp} className="data-card text-center py-5 px-3">
                <p className="text-[10px] font-body uppercase tracking-[0.15em] text-text-tertiary mb-2">{card.label}</p>
                <motion.p className={`text-xl font-mono font-light ${card.cls}`}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  {card.value}
                </motion.p>
              </motion.div>
            ))}
          </div>

          {/* Donut + Legend */}
          <motion.div variants={fadeUp} className="data-card-elevated p-5 md:p-8 mb-6">
            <h2 className="text-base font-semibold font-display text-text-primary mb-6">Расходы по категориям</h2>
            <DonutWithLegend data={mergedCategories} />
          </motion.div>

          {/* Per-account */}
          {summaries.length > 1 && (
            <>
              <motion.h2 variants={fadeUp} className="text-base font-semibold font-display text-text-primary mb-4">По счетам</motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaries.map(s => (
                  <motion.div key={s.accountId} variants={fadeUp} className="data-card p-5">
                    <p className="font-medium font-display text-text-primary mb-3">{s.accountName}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-text-tertiary text-xs font-mono">Баланс</span><p className="font-mono text-accent-gold font-light">{fmt(s.balance)}</p></div>
                      <div><span className="text-text-tertiary text-xs font-mono">Операций</span><p className="font-mono text-text-primary">{s.transactionCount}</p></div>
                      <div><span className="text-text-tertiary text-xs font-mono">Доходы</span><p className="font-mono text-accent-cyan font-light">{fmt(s.totalIncome)}</p></div>
                      <div><span className="text-text-tertiary text-xs font-mono">Расходы</span><p className="font-mono text-accent-red font-light">{fmt(s.totalExpense)}</p></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ── Donut Chart with Legend ── */
function DonutWithLegend({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return <p className="text-text-tertiary text-sm text-center py-8">Нет данных о расходах</p>;
  }

  const radius = 80, cx = 100, cy = 100, sw = 28;
  let cumAngle = -90;

  const segments = entries.map(([cat, value], i) => {
    const angle = (value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const sr = (startAngle * Math.PI) / 180;
    const er = (endAngle * Math.PI) / 180;
    const la = angle > 180 ? 1 : 0;
    const color = CATEGORY_COLORS[cat as TransactionCategory] || '#6B7280';

    return (
      <motion.path key={cat}
        d={`M ${cx + radius * Math.cos(sr)} ${cy + radius * Math.sin(sr)} A ${radius} ${radius} 0 ${la} 1 ${cx + radius * Math.cos(er)} ${cy + radius * Math.sin(er)}`}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
      />
    );
  });

  const fmtTotal = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(total);

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10">
      {/* Donut */}
      <div className="flex-shrink-0 mx-auto lg:mx-0">
        <svg viewBox="0 0 200 200" className="w-[220px] h-[220px] md:w-[260px] md:h-[260px]">
          {segments}
          <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--color-text-tertiary)" style={{ fontSize: '9px', fontFamily: 'JetBrains Mono' }}>РАСХОДЫ</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--color-accent-gold)" style={{ fontSize: '14px', fontFamily: 'Outfit', fontWeight: 300 }}>{fmtTotal} ₽</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 mt-6 lg:mt-0 space-y-0">
        {entries.map(([cat, value], i) => {
          const color = CATEGORY_COLORS[cat as TransactionCategory] || '#6B7280';
          const pct = Math.round((value / total) * 100);
          return (
            <motion.div key={cat}
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm text-text-primary">{CATEGORY_LABELS[cat as TransactionCategory] || cat}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-text-tertiary">{pct}%</span>
                <span className="font-mono text-sm text-accent-gold font-light">
                  {new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(value)} ₽
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
