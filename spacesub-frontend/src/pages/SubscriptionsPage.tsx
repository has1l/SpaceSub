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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          variants={fadeUp}
          className="station-panel p-4 md:p-5 group relative overflow-hidden"
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

/* ── Subscription Card ── */

function SubscriptionCard({ sub, index, onDelete }: { sub: DetectedSubscription; index: number; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await subscriptionsApi.remove(sub.id);
      onDelete(sub.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
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

      {/* Delete button */}
      <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(239,68,68,0.06)' }}>
        <motion.button
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
          disabled={deleting}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            fontFamily: 'var(--font-mono)',
            color: confirmDelete ? '#fff' : 'rgba(239,68,68,0.7)',
            background: confirmDelete
              ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(239,68,68,0.6))'
              : 'rgba(239,68,68,0.06)',
            border: `1px solid rgba(239,68,68,${confirmDelete ? '0.4' : '0.1'})`,
            cursor: deleting ? 'wait' : 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? 'Удаление...' : confirmDelete ? 'Подтвердить удаление' : 'Удалить подписку'}
        </motion.button>
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(0,212,170,0.12)',
    background: 'rgba(6,16,30,0.8)',
    color: '#e2e8f0',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(200,214,229,0.4)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,8,16,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 420, padding: 24, borderRadius: 20,
          background: 'rgba(17,25,40,0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,170,0.15)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
          color: '#e2e8f0', marginBottom: 20,
        }}>
          {isEdit ? 'Редактировать подписку' : 'Добавить подписку'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Название *</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix, Spotify..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Сумма (₽) *</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="799"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Период</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
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
              <label style={labelStyle}>Следующее списание</label>
              <input
                style={inputStyle}
                type="date"
                value={nextBilling}
                onChange={(e) => setNextBilling(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Категория</label>
              <input
                style={inputStyle}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Развлечения"
              />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 12 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: '1px solid rgba(200,214,229,0.1)', background: 'transparent',
              color: 'rgba(200,214,229,0.5)', fontFamily: 'var(--font-body)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !amount}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: 'none',
              background: saving ? 'rgba(0,212,170,0.3)' : 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
              color: '#06101e', fontFamily: 'var(--font-display)',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              opacity: (!name.trim() || !amount) ? 0.4 : 1,
            }}
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ── Manual Subscription Card ── */

function ManualSubCard({
  sub,
  onEdit,
  onDeleted,
}: {
  sub: ManualSubscription;
  onEdit: (s: ManualSubscription) => void;
  onDeleted: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      className="station-panel station-panel-glow p-5 relative overflow-hidden"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 14 }}>✋</span>
            <h3
              className="font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
            >
              {sub.name}
            </h3>
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.35)' }}>
            {PERIOD_LABELS[sub.periodType] ?? sub.periodType}
            {sub.category && ` · ${sub.category}`}
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
          color: 'rgba(14,165,233,0.7)', background: 'rgba(14,165,233,0.08)',
          border: '1px solid rgba(14,165,233,0.15)', borderRadius: 20,
          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 8px',
        }}>
          РУЧНАЯ
        </span>
      </div>

      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(0,212,170,0.05)' }}>
        <div className="flex items-center justify-between text-xs">
          <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.3)' }}>Следующее списание</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.55)' }}>
            {formatDate(sub.nextBilling)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: '1px solid rgba(0,212,170,0.05)' }}>
        <button
          onClick={() => onEdit(sub)}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'rgba(14,165,233,0.7)',
            background: 'rgba(14,165,233,0.06)',
            border: '1px solid rgba(14,165,233,0.1)',
            cursor: 'pointer',
          }}
        >
          Редактировать
        </button>
        <button
          onClick={handleDelete}
          onBlur={() => setConfirmDel(false)}
          disabled={deleting}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            fontFamily: 'var(--font-mono)',
            color: confirmDel ? '#fff' : 'rgba(239,68,68,0.7)',
            background: confirmDel
              ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(239,68,68,0.6))'
              : 'rgba(239,68,68,0.06)',
            border: `1px solid rgba(239,68,68,${confirmDel ? '0.4' : '0.1'})`,
            cursor: deleting ? 'wait' : 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? '...' : confirmDel ? 'Подтвердить' : 'Удалить'}
        </button>
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback((id: string) => {
    setActive((prev) => prev.filter((s) => s.id !== id));
    setUpcoming((prev) => prev.filter((s) => s.id !== id));
    subscriptionsApi.getSummary().then(setSummary).catch(() => {});
  }, []);

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
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAddModal}
          style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
            color: '#06101e', fontFamily: 'var(--font-display)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,212,170,0.3)',
          }}
        >
          + Добавить подписку
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

      {/* Active subscriptions */}
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
          <span style={{ fontSize: 16 }}>✋</span>
          Ручные подписки
          <span
            className="text-xs ml-1.5 px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              color: '#0ea5e9',
              background: 'rgba(14,165,233,0.08)',
            }}
          >
            {manualSubs.length}
          </span>
        </motion.h2>

        {manualSubs.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="station-panel p-8 text-center"
            style={{ border: '1px dashed rgba(14,165,233,0.15)' }}
          >
            <p style={{ fontSize: 24, marginBottom: 8 }}>📝</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginBottom: 12 }}>
              Нет ручных подписок
            </p>
            <button
              onClick={openAddModal}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(14,165,233,0.1)', color: '#0ea5e9',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Добавить вручную
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {manualSubs.map((sub) => (
              <ManualSubCard
                key={sub.id}
                sub={sub}
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
