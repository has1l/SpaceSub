import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import type { CatalogService, UserSubscription, Account, TransactionCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import ServiceLogo from '../components/ServiceLogo';

const stagger = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);

const periodLabel = (days: number) =>
  days >= 360 ? '/год' : days >= 80 ? '/кв' : days <= 8 ? '/нед' : '/мес';

export default function SubscriptionsPage() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [mySubs, setMySubs] = useState<UserSubscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CatalogService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, subsRes, accRes] = await Promise.all([
        api.get('/api/v1/services', {
          params: {
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(activeCategory !== 'ALL' && { category: activeCategory }),
          },
        }),
        api.get('/api/v1/my-subscriptions'),
        api.get('/api/v1/accounts'),
      ]);
      setServices(svcRes.data);
      setMySubs(subsRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error('Failed to load subscriptions data:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (serviceId: string) => {
    if (!accounts.length) return;
    setActionId(serviceId);
    try {
      await api.post(`/api/v1/services/${serviceId}/subscribe`, {
        accountId: accounts[0].id,
      });
      await fetchData();
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setActionId(null);
    }
  };

  const handleUnsubscribe = async (serviceId: string) => {
    setActionId(serviceId);
    setCancelTarget(null);
    try {
      await api.post(`/api/v1/services/${serviceId}/unsubscribe`);
      await fetchData();
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    } finally {
      setActionId(null);
    }
  };

  const activeSubs = mySubs.filter((s) => s.status === 'ACTIVE');

  const categories: { key: string; label: string; color: string }[] = [
    { key: 'ALL', label: 'Все', color: '#4F7CFF' },
    ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key,
      label,
      color: CATEGORY_COLORS[key as TransactionCategory],
    })),
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      {/* ── Hero: My Subscriptions ── */}
      <motion.div variants={fadeUp} className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-black tracking-tight mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="gradient-text-cosmic">Подписки</span>
        </h1>
        <p className="text-text-void text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          Управляйте подключёнными сервисами
        </p>
      </motion.div>

      {/* ── Active Subscriptions Scroll ── */}
      <motion.div variants={fadeUp} className="mb-6">
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer rounded-xl flex-shrink-0" style={{ width: 180, height: 72 }} />
            ))}
          </div>
        ) : activeSubs.length === 0 ? (
          <div
            className="cosmic-card px-5 py-4 flex items-center gap-3"
            style={{ borderColor: 'rgba(79, 124, 255, 0.06)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(79, 124, 255, 0.08)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F7CFF" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-text-nebula text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              У вас пока нет подписок. Выберите сервис из каталога ниже.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {activeSubs.map((sub) => (
              <motion.div
                key={sub.id}
                className="cosmic-card cosmic-card-hover px-4 py-3 flex items-center gap-3 flex-shrink-0 cursor-pointer"
                style={{ minWidth: 180 }}
                whileHover={{ y: -2 }}
                onClick={() => setCancelTarget(sub.service)}
              >
                <ServiceLogo logoUrl={sub.service.logoUrl} category={sub.service.category} size={36} />
                <div className="min-w-0">
                  <p className="text-text-stellar text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>
                    {sub.service.name}
                  </p>
                  <p className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                    {sub.recurringPayment
                      ? new Date(sub.recurringPayment.nextChargeDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                      : 'Активна'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Search ── */}
      <motion.div variants={fadeUp} className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-void)" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти сервис..."
            className="w-full input-cosmic pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </motion.div>

      {/* ── Category Chips ── */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: isActive ? `${cat.color}18` : 'rgba(15, 15, 36, 0.6)',
                  color: isActive ? cat.color : 'var(--color-text-void)',
                  border: `1px solid ${isActive ? `${cat.color}30` : 'rgba(79, 124, 255, 0.06)'}`,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Service Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cosmic-card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="shimmer rounded-xl w-12 h-12 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer rounded-md h-4 w-3/4" />
                  <div className="shimmer rounded-md h-3 w-full" />
                  <div className="shimmer rounded-md h-3 w-1/2" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="shimmer rounded-md h-5 w-20" />
                <div className="shimmer rounded-lg h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <motion.div variants={fadeUp} className="cosmic-card p-10 text-center">
          <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-void)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M8 11h6" />
          </svg>
          <p className="text-text-nebula text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
            Ничего не найдено
          </p>
          <p className="text-text-void text-xs mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Попробуйте другой запрос или сбросьте фильтры
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              isLoading={actionId === svc.id}
              onSubscribe={() => handleSubscribe(svc.id)}
              onUnsubscribe={() => setCancelTarget(svc)}
            />
          ))}
        </motion.div>
      )}

      {/* ── Cancel Modal ── */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(3, 3, 8, 0.8)', backdropFilter: 'blur(8px)' }}
              onClick={() => setCancelTarget(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="cosmic-card p-6 md:p-8 w-full max-w-sm relative z-10"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-5">
                <ServiceLogo logoUrl={cancelTarget.logoUrl} category={cancelTarget.category} size={48} />
                <div>
                  <p className="text-text-stellar font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    {cancelTarget.name}
                  </p>
                  <p className="text-text-void text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatPrice(cancelTarget.amount)} ₽{periodLabel(cancelTarget.periodDays)}
                  </p>
                </div>
              </div>

              <p className="text-text-nebula text-sm mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                Отменить подписку на <strong className="text-text-stellar">{cancelTarget.name}</strong>?
                Автоплатёж будет отключён.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-text-nebula transition-colors hover:text-text-stellar cursor-pointer"
                  style={{
                    border: '1px solid rgba(79, 124, 255, 0.1)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Назад
                </button>
                <button
                  onClick={() => handleUnsubscribe(cancelTarget.id)}
                  disabled={actionId === cancelTarget.id}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,92,122,0.15), rgba(255,92,122,0.08))',
                    border: '1px solid rgba(255, 92, 122, 0.2)',
                    color: '#FF5C7A',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {actionId === cancelTarget.id ? 'Отмена...' : 'Отменить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Service Card ── */
function ServiceCard({
  service,
  isLoading,
  onSubscribe,
  onUnsubscribe,
}: {
  service: CatalogService;
  isLoading: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}) {
  const catColor = CATEGORY_COLORS[service.category as TransactionCategory] || '#6B7280';
  const catLabel = CATEGORY_LABELS[service.category as TransactionCategory] || 'Другое';

  return (
    <motion.div variants={fadeUp} className="cosmic-card cosmic-card-hover p-4 flex flex-col">
      {/* Top row: logo + info + badge */}
      <div className="flex items-start gap-3 mb-3">
        <ServiceLogo logoUrl={service.logoUrl} category={service.category} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-text-stellar text-sm font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {service.name}
            </p>
            <span
              className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
              style={{
                background: `${catColor}14`,
                color: catColor,
                fontFamily: 'var(--font-body)',
              }}
            >
              {catLabel}
            </span>
          </div>
          <p
            className="text-text-void text-xs mt-0.5 line-clamp-2"
            style={{ fontFamily: 'var(--font-body)', lineHeight: '1.4' }}
          >
            {service.description}
          </p>
        </div>
      </div>

      {/* Bottom: price + action */}
      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid rgba(79,124,255,0.05)' }}>
        <p style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-accent-cyan text-sm font-bold">{formatPrice(service.amount)} ₽</span>
          <span className="text-text-void text-xs">{periodLabel(service.periodDays)}</span>
        </p>

        {service.isSubscribed ? (
          <button
            onClick={onUnsubscribe}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{
              background: 'rgba(0, 229, 160, 0.08)',
              border: '1px solid rgba(0, 229, 160, 0.2)',
              color: '#00E5A0',
              fontFamily: 'var(--font-body)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Dots />
              </span>
            ) : (
              'Активна ✓'
            )}
          </button>
        ) : (
          <button
            onClick={onSubscribe}
            disabled={isLoading}
            className="btn-stellar px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Dots />
              </span>
            ) : (
              'Подписаться'
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Loading Dots ── */
function Dots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
