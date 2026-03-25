import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../components/Spinner';
import { SatelliteIcon } from '../components/SatelliteIcon';
import { OrbitDecoration } from '../components/OrbitDecoration';
import {
  subscriptionsApi,
  manualSubsApi,
  type DetectedSubscription,
  type SubscriptionSummary,
  type ManualSubscription,
  type BillingCycle,
  type CreateSubscriptionPayload,
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

import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon as TrashIconHero,
  SignalIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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
      icon: <SignalIcon className="w-[18px] h-[18px]" />,
    },
    {
      label: 'Скоро списание',
      value: String(summary.upcomingNext7Days.length),
      color: 'var(--signal-warn)',
      icon: <ExclamationTriangleIcon className="w-[18px] h-[18px]" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          variants={fadeUp}
          className="station-panel p-4 md:p-5 group relative overflow-hidden"
        >
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
            className="text-lg md:text-xl font-bold"
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

/* ── Subscription Card (Detected) ── */

function SubscriptionCard({ sub, index, onDelete }: { sub: DetectedSubscription; index: number; onDelete: (id: string) => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCancel = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    setCancelling(true);
    try {
      await subscriptionsApi.cancel(sub.id);
      onDelete(sub.id);
    } catch {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

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
      {/* Orbit decoration */}
      <div className="absolute -top-6 -right-6 pointer-events-none">
        <motion.div
          className="orbit-ring"
          style={{ width: 70, height: 70, opacity: sub.isActive ? 0.3 : 0.1 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20 + index * 5, repeat: Infinity, ease: 'linear' }}
        >
          <div style={{
            position: 'absolute', top: -1.5, left: '50%', marginLeft: -1.5,
            width: 3, height: 3, borderRadius: '50%',
            background: sub.isActive ? 'var(--signal-primary)' : 'rgba(200,214,229,0.3)',
            boxShadow: sub.isActive ? '0 0 6px rgba(0,212,170,0.4)' : 'none',
          }} />
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {sub.logoUrl ? (
              <img src={sub.logoUrl} alt="" className="w-5 h-5 rounded object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <SatelliteIcon size={16} color={sub.isActive ? 'var(--signal-primary)' : 'rgba(200,214,229,0.3)'} />
            )}
            <h3 className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              {sub.merchant}
            </h3>
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}>
            {PERIOD_LABELS[sub.periodType] ?? sub.periodType}
          </p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
            {formatCurrency(sub.amount, sub.currency)}
          </p>
          <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.3)' }}>
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
            extra: days >= 0 ? (days === 0 ? 'сегодня' : `через ${days} дн.`) : null,
            warn: days >= 0 && days <= 3,
          },
          { label: 'Транзакций', value: String(sub.transactionCount) },
          { label: 'Сила сигнала', value: `${Math.round(sub.confidence * 100)}%`, warn: lowConfidence },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.3)' }}>{item.label}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              color: 'warn' in item && item.warn ? 'var(--signal-warn)' : 'rgba(200,214,229,0.55)',
            }}>
              {item.value}
              {'extra' in item && item.extra && (
                <span className="ml-1.5" style={{ color: 'rgba(200,214,229,0.25)' }}>({item.extra})</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Cancel subscription */}
      {sub.isActive && (
        <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(0,212,170,0.05)' }}>
          <motion.button
            onClick={handleCancel}
            onBlur={() => setConfirmCancel(false)}
            disabled={cancelling}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
              color: confirmCancel ? '#fff' : 'rgba(239,68,68,0.6)',
              background: confirmCancel
                ? 'linear-gradient(135deg, rgba(239,68,68,0.75), rgba(239,68,68,0.55))'
                : 'rgba(239,68,68,0.04)',
              border: `1px solid rgba(239,68,68,${confirmCancel ? '0.35' : '0.08'})`,
              boxShadow: confirmCancel ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
              cursor: cancelling ? 'wait' : 'pointer',
              opacity: cancelling ? 0.5 : 1,
            }}
          >
            <TrashIconHero className="w-3 h-3" />
            {cancelling ? 'Отмена...' : confirmCancel ? 'Подтвердить отмену' : 'Отменить подписку'}
          </motion.button>
        </div>
      )}
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
        <ExclamationTriangleIcon className="w-[18px] h-[18px]" style={{ color: 'var(--signal-warn)' }} />
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
                <span className="font-medium truncate" style={{ fontFamily: 'var(--font-body)', color: '#e2e8f0' }}>
                  {sub.merchant}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--signal-warn)' }}>
                  {days === 0 ? 'Сегодня' : `Через ${days} дн.`}
                </span>
                <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}>
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

/* ── Add/Edit Subscription Modal ── */

const CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'WEEKLY', label: 'Еженедельно' },
  { value: 'MONTHLY', label: 'Ежемесячно' },
  { value: 'QUARTERLY', label: 'Ежеквартально' },
  { value: 'YEARLY', label: 'Ежегодно' },
];

function SubscriptionModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ManualSubscription;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [cycle, setCycle] = useState<BillingCycle>(initial?.periodType ?? 'MONTHLY');
  const [nextBilling, setNextBilling] = useState(
    initial?.nextBilling ? initial.nextBilling.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [category, setCategory] = useState(initial?.category ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await manualSubsApi.update(initial!.id, {
          name: name.trim(),
          amount: parseFloat(amount),
          billingCycle: cycle,
          nextBilling: new Date(nextBilling).toISOString(),
          category: category || undefined,
        });
      } else {
        const payload: CreateSubscriptionPayload = {
          name: name.trim(),
          amount: parseFloat(amount),
          billingCycle: cycle,
          nextBilling: new Date(nextBilling).toISOString(),
          category: category || undefined,
        };
        await manualSubsApi.create(payload);
      }
      onSaved();
    } catch {
      setError('Не удалось сохранить');
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,8,16,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="station-panel station-panel-glow"
        style={{
          width: '100%', maxWidth: 440, padding: 0, overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top accent */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3), rgba(14,165,233,0.2), transparent)',
        }} />

        {/* Orbit deco */}
        <div className="absolute -top-12 -right-12 pointer-events-none" style={{ opacity: 0.15 }}>
          <motion.div
            className="orbit-ring"
            style={{ width: 120, height: 120 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            <div style={{
              position: 'absolute', top: -2, left: '50%', marginLeft: -2,
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--signal-primary)',
              boxShadow: '0 0 8px rgba(0,212,170,0.5)',
            }} />
          </motion.div>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--signal-primary)',
            }}>
              {isEdit ? <PencilSquareIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                color: '#e2e8f0', margin: 0, lineHeight: 1,
              }}>
                {isEdit ? 'Редактировать подписку' : 'Новый спутник'}
              </h2>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)',
                marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {isEdit ? 'Изменение параметров' : 'Ручная регистрация'}
              </p>
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                color: 'rgba(200,214,229,0.35)', marginBottom: 6, display: 'block',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Название
              </label>
              <input
                className="input-station"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Netflix, Spotify, Figma..."
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: 'rgba(200,214,229,0.35)', marginBottom: 6, display: 'block',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Стоимость
                </label>
                <input
                  className="input-station"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="799 ₽"
                  required
                />
              </div>
              <div>
                <label style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: 'rgba(200,214,229,0.35)', marginBottom: 6, display: 'block',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Период
                </label>
                <select
                  className="input-station"
                  style={{ cursor: 'pointer' }}
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as BillingCycle)}
                >
                  {CYCLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: 'rgba(200,214,229,0.35)', marginBottom: 6, display: 'block',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Дата списания
                </label>
                <input
                  className="input-station"
                  type="date"
                  value={nextBilling}
                  onChange={(e) => setNextBilling(e.target.value)}
                />
              </div>
              <div>
                <label style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: 'rgba(200,214,229,0.35)', marginBottom: 6, display: 'block',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Категория
                </label>
                <input
                  className="input-station"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Развлечения"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
              }}
            >
              <p style={{ color: 'var(--signal-danger)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {error}
              </p>
            </motion.div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}>
              Отмена
            </button>
            <motion.button
              type="submit"
              disabled={saving || !name.trim() || !amount}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-signal"
              style={{
                flex: 1, padding: '10px 16px', fontSize: 13,
                opacity: (!name.trim() || !amount) ? 0.35 : 1,
                cursor: saving ? 'wait' : (!name.trim() || !amount) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Вывести на орбиту'}
            </motion.button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ── Manual Subscription Card ── */

function ManualSubCard({
  sub,
  index,
  onEdit,
  onDeleted,
}: {
  sub: ManualSubscription;
  index: number;
  onEdit: (s: ManualSubscription) => void;
  onDeleted: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const days = daysUntil(sub.nextBilling);

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      await manualSubsApi.remove(sub.id);
      onDeleted(sub.id);
    } catch {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      className={`station-panel p-5 relative overflow-hidden group transition-all duration-400 ${
        sub.isActive ? 'station-panel-glow' : 'opacity-50'
      }`}
      whileHover={{ y: -2 }}
    >
      {/* Orbit decoration */}
      <div className="absolute -top-6 -right-6 pointer-events-none">
        <motion.div
          className="orbit-ring"
          style={{ width: 70, height: 70, opacity: 0.2 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 25 + index * 4, repeat: Infinity, ease: 'linear' }}
        >
          <div style={{
            position: 'absolute', top: -1.5, left: '50%', marginLeft: -1.5,
            width: 3, height: 3, borderRadius: '50%',
            background: 'var(--signal-secondary)',
            boxShadow: '0 0 6px rgba(14,165,233,0.4)',
          }} />
        </motion.div>
      </div>

      {/* Top accent — secondary blue for manual */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.2), transparent)',
      }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div style={{ color: 'var(--signal-secondary)' }}>
              <PencilSquareIcon className="w-[15px] h-[15px]" />
            </div>
            <h3 className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              {sub.name}
            </h3>
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}>
            {PERIOD_LABELS[sub.periodType] ?? sub.periodType}
            {sub.category && (
              <span style={{ color: 'rgba(200,214,229,0.2)' }}> / {sub.category}</span>
            )}
          </p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
            {formatCurrency(sub.amount, sub.currency)}
          </p>
          <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.3)' }}>
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
        <span className="badge" style={{
          background: 'rgba(14,165,233,0.08)',
          color: 'var(--signal-secondary)',
          border: '1px solid rgba(14,165,233,0.15)',
        }}>
          Ручная
        </span>
        {days >= 0 && days <= 7 && (
          <span className="badge badge-warn">
            <span className="status-dot status-dot-warn" style={{ width: 4, height: 4 }} />
            Скоро
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(14,165,233,0.05)' }}>
        <div className="flex items-center justify-between text-xs">
          <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.3)' }}>Следующее списание</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            color: days >= 0 && days <= 3 ? 'var(--signal-warn)' : 'rgba(200,214,229,0.55)',
          }}>
            {formatDate(sub.nextBilling)}
            {days >= 0 && (
              <span className="ml-1.5" style={{ color: 'rgba(200,214,229,0.25)' }}>
                ({days === 0 ? 'сегодня' : `через ${days} дн.`})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: '1px solid rgba(14,165,233,0.05)' }}>
        <motion.button
          onClick={() => onEdit(sub)}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            color: 'rgba(14,165,233,0.7)',
            background: 'rgba(14,165,233,0.04)',
            border: '1px solid rgba(14,165,233,0.08)',
            cursor: 'pointer',
          }}
        >
          <PencilSquareIcon className="w-3 h-3" />
          Изменить
        </motion.button>
        <motion.button
          onClick={handleDelete}
          onBlur={() => setConfirmDel(false)}
          disabled={deleting}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            color: confirmDel ? '#fff' : 'rgba(239,68,68,0.6)',
            background: confirmDel
              ? 'linear-gradient(135deg, rgba(239,68,68,0.75), rgba(239,68,68,0.55))'
              : 'rgba(239,68,68,0.04)',
            border: `1px solid rgba(239,68,68,${confirmDel ? '0.35' : '0.08'})`,
            boxShadow: confirmDel ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
            cursor: deleting ? 'wait' : 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <TrashIconHero className="w-3 h-3" />
          {deleting ? '...' : confirmDel ? 'Подтвердить' : 'Удалить'}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main Page ── */

export function SubscriptionsPage() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [active, setActive] = useState<DetectedSubscription[]>([]);
  const [upcoming, setUpcoming] = useState<DetectedSubscription[]>([]);
  const [manualSubs, setManualSubs] = useState<ManualSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<ManualSubscription | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, activeData, upcomingData, manualData] = await Promise.all([
        subscriptionsApi.getSummary(),
        subscriptionsApi.getActive(),
        subscriptionsApi.getUpcoming(),
        manualSubsApi.getAll(),
      ]);
      setSummary(summaryData);
      setActive(activeData);
      setUpcoming(upcomingData);
      setManualSubs(manualData);
      setError(null);
    } catch {
      setError('Не удалось загрузить данные подписок');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = useCallback((id: string) => {
    setActive((prev) => prev.filter((s) => s.id !== id));
    setUpcoming((prev) => prev.filter((s) => s.id !== id));
    fetchData();
  }, [fetchData]);

  const handleManualDelete = useCallback((id: string) => {
    setManualSubs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const openAddModal = useCallback(() => {
    setEditingSub(undefined);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((sub: ManualSubscription) => {
    setEditingSub(sub);
    setShowModal(true);
  }, []);

  const handleModalSaved = useCallback(() => {
    setShowModal(false);
    setEditingSub(undefined);
    manualSubsApi.getAll().then(setManualSubs).catch(() => {});
  }, []);

  const sortedActive = useMemo(
    () => [...active].sort((a, b) =>
      new Date(a.nextExpectedCharge).getTime() - new Date(b.nextExpectedCharge).getTime(),
    ),
    [active],
  );

  if (loading) {
    return <Spinner className="min-h-[60vh]" text="Поиск спутников..." />;
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-4 md:py-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <SubscriptionModal
            initial={editingSub}
            onClose={() => { setShowModal(false); setEditingSub(undefined); }}
            onSaved={handleModalSaved}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-extrabold text-gradient-signal mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Подписки
          </h1>
          <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}>
            Автоматические и ручные подписки на вашей орбите
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAddModal}
          className="btn-signal flex items-center gap-2"
          style={{ padding: '9px 20px', fontSize: 13 }}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Добавить
        </motion.button>
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

      {/* Detected subscriptions */}
      {sortedActive.length === 0 ? (
        <motion.div
          variants={fadeUp}
          className="station-panel station-panel-glow p-8 md:p-16 text-center relative overflow-hidden"
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
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'rgba(200,214,229,0.7)' }}>
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
            Обнаруженные подписки
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
              <SubscriptionCard key={sub.id} sub={sub} index={i} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* Manual subscriptions */}
      <motion.div variants={fadeUp} className="mt-10">
        <motion.h2
          variants={fadeUp}
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
        >
          <div style={{ color: 'var(--signal-secondary)' }}>
            <PencilSquareIcon className="w-[18px] h-[18px]" />
          </div>
          Ручные подписки
          <span
            className="text-xs ml-1.5 px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--signal-secondary)',
              background: 'rgba(14,165,233,0.08)',
            }}
          >
            {manualSubs.length}
          </span>
        </motion.h2>

        {manualSubs.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="station-panel p-8 md:p-12 text-center relative overflow-hidden"
            style={{ borderColor: 'rgba(14,165,233,0.08)' }}
          >
            {/* Orbit deco */}
            <motion.svg
              width="64" height="64" viewBox="0 0 64 64" fill="none"
              className="mx-auto mb-5"
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            >
              <circle cx="32" cy="32" r="24" stroke="rgba(14,165,233,0.08)" strokeWidth="1" strokeDasharray="4 6" />
              <circle cx="32" cy="32" r="14" stroke="rgba(14,165,233,0.05)" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="32" cy="32" r="2.5" fill="rgba(14,165,233,0.3)">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
              </circle>
            </motion.svg>

            <p className="font-semibold mb-1.5" style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'rgba(200,214,229,0.6)' }}>
              Ручных подписок нет
            </p>
            <p className="text-sm max-w-xs mx-auto mb-5" style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.25)' }}>
              Добавьте подписки, которые не были обнаружены автоматически
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openAddModal}
              className="btn-ghost inline-flex items-center gap-2"
              style={{ padding: '8px 18px', fontSize: 12, borderColor: 'rgba(14,165,233,0.2)', color: 'var(--signal-secondary)' }}
            >
              <PlusIcon className="w-3 h-3" />
              Добавить вручную
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {manualSubs.map((sub, i) => (
              <ManualSubCard
                key={sub.id}
                sub={sub}
                index={i}
                onEdit={openEditModal}
                onDeleted={handleManualDelete}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
