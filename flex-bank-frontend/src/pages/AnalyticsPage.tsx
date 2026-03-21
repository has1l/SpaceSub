import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { Account, TransactionCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import Spinner from '../components/Spinner';

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

const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-void text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          Нет данных о расходах
        </p>
      </div>
    );
  }

  const radius = 80;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 24;

  let cumAngle = -90;
  const segments = entries.map(([cat, value], i) => {
    const angle = (value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const color = CATEGORY_COLORS[cat as TransactionCategory] || '#6B7280';

    return (
      <motion.path
        key={cat}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      />
    );
  });

  const formatTotal = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(total);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-40 h-40 md:w-52 md:h-52">
        {segments}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-text-void" style={{ fontSize: '9px', fontFamily: 'JetBrains Mono' }}>
          РАСХОДЫ
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-text-stellar" style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700 }}>
          {formatTotal} ₽
        </text>
      </svg>

      <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-2.5 mt-6">
        {entries.map(([cat, value], i) => {
          const color = CATEGORY_COLORS[cat as TransactionCategory] || '#6B7280';
          const pct = Math.round((value / total) * 100);
          return (
            <motion.div
              key={cat}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}40` }} />
              <span className="text-text-nebula text-xs truncate" style={{ fontFamily: 'var(--font-body)' }}>
                {CATEGORY_LABELS[cat as TransactionCategory] || cat}
              </span>
              <span className="text-text-stellar text-xs font-semibold ml-auto" style={{ fontFamily: 'var(--font-mono)' }}>
                {pct}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: accs } = await api.get<Account[]>('/accounts');
        setAccounts(accs);

        const results = await Promise.all(
          accs.map((a) => api.get<AccountSummary>(`/accounts/${a.id}/summary`)),
        );
        setSummaries(results.map((r) => r.data));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner text="Анализ данных..." />;

  const totalIncome = summaries.reduce((s, a) => s + a.totalIncome, 0);
  const totalExpense = summaries.reduce((s, a) => s + a.totalExpense, 0);
  const totalTxCount = summaries.reduce((s, a) => s + a.transactionCount, 0);

  const mergedCategories: Record<string, number> = {};
  for (const s of summaries) {
    for (const [cat, val] of Object.entries(s.expenseByCategory)) {
      mergedCategories[cat] = (mergedCategories[cat] || 0) + val;
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1
        variants={fadeUp}
        className="text-2xl font-bold text-text-stellar mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Аналитика
      </motion.h1>

      {accounts.length === 0 ? (
        <motion.div variants={fadeUp} className="cosmic-card p-8 md:p-16 text-center">
          <EmptyScanIllustration />
          <p className="text-text-nebula text-lg mt-6" style={{ fontFamily: 'var(--font-display)' }}>
            Нет данных для анализа
          </p>
          <p className="text-text-void text-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Создайте счёт и добавьте операции для аналитики
          </p>
        </motion.div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'ДОХОДЫ', value: fmt(totalIncome), color: 'text-aurora-green', iconPath: 'M12 19V5m0 0l-5 5m5-5l5 5', iconColor: '#00E5A0' },
              { label: 'РАСХОДЫ', value: fmt(totalExpense), color: 'text-aurora-red', iconPath: 'M12 5v14m0 0l5-5m-5 5l-5-5', iconColor: '#FF5C7A' },
              { label: 'ОПЕРАЦИЙ', value: totalTxCount.toString(), color: 'text-accent-blue', iconPath: 'M4 6h16M4 12h16M4 18h16', iconColor: '#4F7CFF' },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                variants={fadeUp}
                className="cosmic-card p-5 relative overflow-hidden group"
              >
                {/* Scan line on hover */}
                <div className="absolute left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                     style={{
                       background: 'linear-gradient(90deg, transparent, rgba(79,124,255,0.3), transparent)',
                       animation: 'scan-line 2s ease-in-out infinite',
                       top: 0,
                     }} />

                <p className="text-text-void text-xs tracking-[0.15em] uppercase mb-2"
                   style={{ fontFamily: 'var(--font-mono)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={card.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-px"><path d={card.iconPath} /></svg>
                  {card.label}
                </p>
                <motion.p
                  className={`text-xl font-bold ${card.color}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  {card.value}
                </motion.p>
              </motion.div>
            ))}
          </div>

          {/* Donut chart */}
          <motion.div variants={fadeUp} className="cosmic-card p-5 md:p-8 mb-5 md:mb-8 glow-stellar">
            <h2 className="text-lg font-semibold text-text-stellar mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Расходы по категориям
            </h2>
            <DonutChart data={mergedCategories} />
          </motion.div>

          {/* Per-account summaries */}
          {summaries.length > 1 && (
            <>
              <motion.h2
                variants={fadeUp}
                className="text-lg font-semibold text-text-stellar mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                По счетам
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaries.map((s) => (
                  <motion.div key={s.accountId} variants={fadeUp} className="cosmic-card cosmic-card-hover p-5">
                    <p className="text-text-stellar font-medium mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      {s.accountName}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Баланс</span>
                        <p className="text-text-stellar font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {fmt(s.balance)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Операций</span>
                        <p className="text-text-stellar font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {s.transactionCount}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Доходы</span>
                        <p className="text-aurora-green font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {fmt(s.totalIncome)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Расходы</span>
                        <p className="text-aurora-red font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {fmt(s.totalExpense)}
                        </p>
                      </div>
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

function EmptyScanIllustration() {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      className="mx-auto"
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="50" cy="50" r="40" stroke="rgba(79,124,255,0.1)" strokeWidth="1" />
      <circle cx="50" cy="50" r="28" stroke="rgba(79,124,255,0.08)" strokeWidth="1" />
      <circle cx="50" cy="50" r="16" stroke="rgba(79,124,255,0.06)" strokeWidth="1" />
      <circle cx="50" cy="50" r="3" fill="#4F7CFF" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(79,124,255,0.2)" strokeWidth="1" />
    </motion.svg>
  );
}
