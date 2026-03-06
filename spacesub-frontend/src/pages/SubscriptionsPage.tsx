import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../components/Spinner';
import { SatelliteIcon } from '../components/SatelliteIcon';
import { OrbitDecoration } from '../components/OrbitDecoration';
import {
  subscriptionsApi,
  type DetectedSubscription,
  type SubscriptionSummary,
} from '../services/subscriptionsApi';

/* ── Helpers ── */

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  YEARLY: 'Ежегодно',
};

const PERIOD_SHORT: Record<string, string> = {
  WEEKLY: '/ нед',
  MONTHLY: '/ мес',
  QUARTERLY: '/ кв',
  YEARLY: '/ год',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ── Animation variants ── */

const stagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ── Summary Block ── */

function SummaryBlock({ summary }: { summary: SubscriptionSummary }) {
  const cards = [
    {
      label: 'Активных спутников',
      value: String(summary.activeCount),
      color: 'var(--signal-primary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'В месяц',
      value: formatCurrency(summary.monthlyTotal, 'RUB'),
      color: 'var(--signal-secondary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: 'В год',
      value: formatCurrency(summary.yearlyTotal, 'RUB'),
      color: '#a78bfa',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Скоро списание',
      value: String(summary.upcomingNext7Days.length),
      color: 'var(--signal-warn)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          variants={fadeUp}
          className="station-panel p-5 group relative overflow-hidden"
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${card.color}30, transparent)` }}
          />

          <div className="flex items-center gap-2 mb-3" style={{ color: card.color }}>
            {card.icon}
            <span
              className="text-[10px] tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}
            >
              {card.label}
            </span>
          </div>
          <motion.p
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: card.color }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            {card.value}
          </motion.p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Subscription Card ── */

function SubscriptionCard({ sub, index }: { sub: DetectedSubscription; index: number }) {
  const days = daysUntil(sub.nextExpectedCharge);
  const isUpcoming = days >= 0 && days <= 7;
  const lowConfidence = sub.confidence < 0.65;

  return (
    <motion.div
      variants={fadeUp}
      className={`station-panel p-5 relative overflow-hidden group transition-all duration-400 ${
        sub.isActive ? 'station-panel-glow' : 'opacity-50'
      }`}
      whileHover={{ y: -2 }}
    >
      {/* Orbit decoration per card */}
      <div className="absolute -top-6 -right-6 pointer-events-none">
        <motion.div
          className="orbit-ring"
          style={{ width: 70, height: 70, opacity: sub.isActive ? 0.3 : 0.1 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20 + index * 5, repeat: Infinity, ease: 'linear' }}
        >
          <div
            style={{
              position: 'absolute', top: -1.5, left: '50%', marginLeft: -1.5,
              width: 3, height: 3, borderRadius: '50%',
              background: sub.isActive ? 'var(--signal-primary)' : 'rgba(200,214,229,0.3)',
              boxShadow: sub.isActive ? '0 0 6px rgba(0,212,170,0.4)' : 'none',
            }}
          />
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SatelliteIcon
              size={16}
              color={sub.isActive ? 'var(--signal-primary)' : 'rgba(200,214,229,0.3)'}
            />
            <h3
              className="font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
            >
              {sub.merchant}
            </h3>
          </div>
          <p
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}
          >
            {PERIOD_LABELS[sub.periodType] ?? sub.periodType}
          </p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
          >
            {formatCurrency(sub.amount, sub.currency)}
          </p>
          <span
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.3)' }}
          >
            {PERIOD_SHORT[sub.periodType] ?? ''}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sub.isActive ? (
          <span className="badge badge-active">
            <span className="status-dot status-dot-active" style={{ width: 4, height: 4 }} />
            На орбите
          </span>
        ) : (
          <span className="badge badge-dim">Сошла с орбиты</span>
        )}
        {isUpcoming && (
          <span className="badge badge-warn">
            <span className="status-dot status-dot-warn" style={{ width: 4, height: 4 }} />
            Скоро списание
          </span>
        )}
        {lowConfidence && (
          <span className="badge badge-danger">Слабый сигнал</span>
        )}
      </div>

      {/* Meta grid */}
      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(0,212,170,0.05)' }}>
        {[
          { label: 'Последнее списание', value: formatDate(sub.lastChargeDate) },
          {
            label: 'Следующее',
            value: formatDate(sub.nextExpectedCharge),
            extra: days >= 0
              ? days === 0
                ? 'сегодня'
                : `через ${days} дн.`
              : null,
            warn: days >= 0 && days <= 3,
          },
          { label: 'Транзакций', value: String(sub.transactionCount) },
          {
            label: 'Сила сигнала',
            value: `${Math.round(sub.confidence * 100)}%`,
            warn: lowConfidence,
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.3)' }}>
              {item.label}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              color: 'warn' in item && item.warn
                ? 'var(--signal-warn)'
                : 'rgba(200,214,229,0.55)',
            }}>
              {item.value}
              {'extra' in item && item.extra && (
                <span className="ml-1.5" style={{ color: 'rgba(200,214,229,0.25)' }}>
                  ({item.extra})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Upcoming List ── */

function UpcomingList({ subs }: { subs: DetectedSubscription[] }) {
  if (subs.length === 0) return null;

  return (
    <motion.div variants={fadeUp} className="mb-8">
      <h2
        className="text-lg font-semibold mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--signal-warn)" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Ближайшие списания
      </h2>
      <div className="space-y-2">
        {subs.map((sub, i) => {
          const days = daysUntil(sub.nextExpectedCharge);
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="station-panel px-5 py-3.5 flex items-center justify-between group"
              style={{ borderColor: 'rgba(245,158,11,0.08)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="status-dot status-dot-warn" />
                <span
                  className="font-medium truncate"
                  style={{ fontFamily: 'var(--font-body)', color: '#e2e8f0' }}
                >
                  {sub.merchant}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                <span
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--signal-warn)' }}
                >
                  {days === 0 ? 'Сегодня' : `Через ${days} дн.`}
                </span>
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}
                >
                  {formatCurrency(sub.amount, sub.currency)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main Page ── */

export function SubscriptionsPage() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [active, setActive] = useState<DetectedSubscription[]>([]);
  const [upcoming, setUpcoming] = useState<DetectedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, activeData, upcomingData] = await Promise.all([
        subscriptionsApi.getSummary(),
        subscriptionsApi.getActive(),
        subscriptionsApi.getUpcoming(),
      ]);
      setSummary(summaryData);
      setActive(activeData);
      setUpcoming(upcomingData);
      setError(null);
    } catch {
      setError('Не удалось загрузить данные подписок');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedActive = useMemo(
    () =>
      [...active].sort(
        (a, b) =>
          new Date(a.nextExpectedCharge).getTime() -
          new Date(b.nextExpectedCharge).getTime(),
      ),
    [active],
  );

  if (loading) {
    return <Spinner className="min-h-[60vh]" text="Поиск спутников..." />;
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1
          className="text-3xl font-extrabold text-gradient-signal mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Обнаруженные подписки
        </h1>
        <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}>
          Автоматически обнаруженные повторяющиеся платежи на вашей орбите
        </p>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="station-panel px-5 py-3.5 mb-6"
            style={{ borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <p className="text-sm" style={{ color: 'var(--signal-danger)' }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {summary && <SummaryBlock summary={summary} />}

      {/* Upcoming */}
      <UpcomingList subs={upcoming} />

      {/* Active subscriptions */}
      {sortedActive.length === 0 ? (
        <motion.div
          variants={fadeUp}
          className="station-panel station-panel-glow p-16 text-center relative overflow-hidden"
        >
          <OrbitDecoration className="opacity-30" />

          <motion.svg
            width="80" height="80" viewBox="0 0 80 80" fill="none"
            className="mx-auto mb-6"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx="40" cy="40" r="30" stroke="rgba(0,212,170,0.08)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="40" cy="40" r="18" stroke="rgba(14,165,233,0.06)" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="40" cy="40" r="3" fill="rgba(0,212,170,0.3)">
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
          </motion.svg>

          <p
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(200,214,229,0.7)' }}
          >
            Подписки ещё не обнаружены
          </p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: 'rgba(200,214,229,0.3)' }}>
            Синхронизируйте банк и подождите — система автоматически обнаружит повторяющиеся платежи
          </p>
        </motion.div>
      ) : (
        <>
          <motion.h2
            variants={fadeUp}
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
          >
            <SatelliteIcon size={18} color="var(--signal-primary)" />
            Все активные подписки
            <span
              className="text-xs ml-1.5 px-2 py-0.5 rounded-full"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--signal-primary)',
                background: 'rgba(0,212,170,0.08)',
              }}
            >
              {sortedActive.length}
            </span>
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedActive.map((sub, i) => (
              <SubscriptionCard key={sub.id} sub={sub} index={i} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
