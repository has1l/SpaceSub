import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import api from '../services/api';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface Overview {
  mrr: number;
  arr: number;
  activeCount: number;
  upcomingCount: number;
  periodTotal: number;
  trend: { currentMonth: number; prevMonth: number; changePct: number };
}

interface CategoryItem {
  category: string;
  color: string;
  total: number;
  count: number;
  percent: number;
}

interface ServiceItem {
  merchant: string;
  monthlyAmount: number;
  yearlyAmount: number;
  category: string;
  color: string;
}

interface PeriodItem {
  period: string;
  total: number;
  count: number;
  momGrowthPct: number | null;
}

interface RecommendationItem {
  type: 'CANCEL' | 'REVIEW' | 'DOWNGRADE' | 'CONSOLIDATE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  merchant: string;
  currentCost: number;
  potentialSavings: number;
  reason: string;
}

interface ScoreItem {
  subscriptionId: string;
  merchant: string;
  valueScore: number;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  monthlyAmount: number;
}

// ─────────────────────────────────────────────────────────
// Period presets
// ─────────────────────────────────────────────────────────

type PeriodKey = '7d' | '1m' | '3m' | '12m';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d',  label: '7 дн',  days: 7   },
  { key: '1m',  label: '1 мес', days: 30  },
  { key: '3m',  label: '3 мес', days: 90  },
  { key: '12m', label: '12 мес', days: 365 },
];

function getPeriodDates(key: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - PERIODS.find((p) => p.key === key)!.days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ─────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.05, staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
};

// ─────────────────────────────────────────────────────────
// Glass Tooltip
// ─────────────────────────────────────────────────────────

function GlassTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,16,30,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(0,212,170,0.15)',
      borderRadius: 12,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.45)', marginBottom: 4 }}>
          {label}
        </p>
      )}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#00d4aa' }}>
        ₽{payload[0].value.toLocaleString('ru-RU')}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function fmtMonth(key: string) {
  const parts = key.split('-');
  const month = parts[1];
  if (!month) return key;
  return ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][parseInt(month,10)-1] ?? key;
}

const RECO_ICONS = { CANCEL: '⛔', REVIEW: '⚠️', DOWNGRADE: '💡', CONSOLIDATE: '🔗' };
const RECO_LABELS = { CANCEL: 'Отменить', REVIEW: 'Проверить', DOWNGRADE: 'Сменить план', CONSOLIDATE: 'Дубликат' };
const RECO_COLORS = {
  CANCEL: { text: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  REVIEW: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  DOWNGRADE: { text: '#00d4aa', bg: 'rgba(0,212,170,0.08)', border: 'rgba(0,212,170,0.2)' },
  CONSOLIDATE: { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
};
const RISK_COLOR = { LOW: '#00d4aa', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const RISK_LABEL = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' };

// ─────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────

function Skeleton({ h = 20, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

// ─────────────────────────────────────────────────────────
// Period Tabs
// ─────────────────────────────────────────────────────────

function PeriodTabs({ active, onChange }: { active: PeriodKey; onChange: (k: PeriodKey) => void }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 4, padding: '4px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
    }}>
      {PERIODS.map((p) => {
        const isActive = p.key === active;
        return (
          <motion.button
            key={p.key}
            onClick={() => onChange(p.key)}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#06101e' : 'rgba(200,214,229,0.5)',
              background: isActive
                ? 'linear-gradient(135deg, #00d4aa, #0ea5e9)'
                : 'transparent',
              boxShadow: isActive ? '0 2px 12px rgba(0,212,170,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {p.label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Interactive Donut with center label
// ─────────────────────────────────────────────────────────

function InteractiveDonut({ data }: { data: CategoryItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(200,214,229,0.3)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
        Нет данных
      </div>
    );
  }

  const shown = active !== null ? data[active] : null;
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={95}
            paddingAngle={3}
            animationBegin={200}
            animationDuration={1000}
            onMouseEnter={(_, idx) => setActive(idx)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={active === null || active === i ? 1 : 0.3}
                stroke="transparent"
                style={{ cursor: 'pointer', filter: active === i ? `drop-shadow(0 0 8px ${entry.color}80)` : 'none' }}
              />
            ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <AnimatePresence mode="wait">
          {shown ? (
            <motion.div key={shown.category}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: shown.color, lineHeight: 1 }}>
                {shown.percent}%
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(200,214,229,0.5)', marginTop: 3, maxWidth: 80 }}>
                {shown.category}
              </p>
            </motion.div>
          ) : (
            <motion.div key="total"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                ₽{Math.round(total).toLocaleString('ru-RU')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(200,214,229,0.4)', marginTop: 3 }}>
                всего/мес
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Category Progress List
// ─────────────────────────────────────────────────────────

function CategoryList({ data }: { data: CategoryItem[] }) {
  if (data.length === 0) return null;
  const max = data[0].total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.slice(0, 6).map((item, i) => (
        <motion.div key={item.category}
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: item.color, flexShrink: 0,
                boxShadow: `0 0 6px ${item.color}80`,
              }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.8)' }}>
                {item.category}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(200,214,229,0.45)' }}>
                {item.percent}%
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#e2e8f0', minWidth: 70, textAlign: 'right' }}>
                ₽{Math.round(item.total).toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.total / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                boxShadow: `0 0 8px ${item.color}40`,
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Health Score Gauge Card
// ─────────────────────────────────────────────────────────

function ScoreGauge({ valueScore, churnRisk, merchant, label }: ScoreItem) {
  const color = RISK_COLOR[churnRisk];
  const pct = valueScore;

  return (
    <motion.div
      className="station-panel"
      style={{ padding: '14px 16px', borderRadius: 14 }}
      whileHover={{ scale: 1.01, boxShadow: `0 6px 24px ${color}20` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {merchant}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.35)', marginTop: 2 }}>
            {label}
          </p>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          padding: '3px 8px', borderRadius: 20,
          background: `${color}18`, color,
          border: `1px solid ${color}30`,
          flexShrink: 0, marginLeft: 8,
        }}>
          {RISK_LABEL[churnRisk]}
        </span>
      </div>

      {/* Score bar */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 6,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              boxShadow: `0 0 10px ${color}40`,
            }}
          />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color, minWidth: 30 }}>
          {valueScore}
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const load = useCallback(async (p: PeriodKey, initial = false) => {
    if (initial) setLoading(true); else setChartLoading(true);
    const { from, to } = getPeriodDates(p);
    const q = `from=${from}&to=${to}`;

    try {
      const [ov, cat, svc, per, rec, scr] = await Promise.all([
        api.get<Overview>(`/analytics/overview?${q}`),
        api.get<CategoryItem[]>(`/analytics/by-category?${q}`),
        api.get<ServiceItem[]>(`/analytics/by-service?limit=8&${q}`),
        api.get<PeriodItem[]>(`/analytics/by-period?${q}`),
        api.get<RecommendationItem[]>('/analytics/recommendations'),
        api.get<ScoreItem[]>('/analytics/scores'),
      ]);
      setOverview(ov.data);
      setCategories(cat.data);
      setServices(svc.data);
      setPeriods(per.data);
      setRecommendations(rec.data);
      setScores(scr.data);
    } catch { /* errors shown via empty states */ }
    finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  useEffect(() => { load(period, true); }, []);

  const handlePeriod = (p: PeriodKey) => {
    setPeriod(p);
    load(p);
  };

  const trendUp = (overview?.trend.changePct ?? 0) >= 0;
  const trendAbs = Math.abs(overview?.trend.changePct ?? 0);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton h={40} w="30%" />
          <Skeleton h={28} w="50%" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} h={100} r={16} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Skeleton h={280} r={16} />
            <Skeleton h={280} r={16} />
          </div>
          <Skeleton h={220} r={16} />
        </div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-10">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '5%', left: '-5%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,212,170,0.05) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '-5%', width: 450, height: 450,
          background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 65%)',
          filter: 'blur(80px)', transform: 'translate(-50%,-50%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">

          {/* ── Header + Period Tabs ── */}
          <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: 0 }}
                className="text-gradient-signal">
                Аналитика
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginTop: 4 }}>
                Расходы, здоровье подписок и рекомендации
              </p>
            </div>
            <PeriodTabs active={period} onChange={handlePeriod} />
          </motion.div>

          {/* ── Hero Card ── */}
          <motion.div variants={fadeUp} className="station-panel station-panel-glow"
            style={{
              padding: '20px 24px', marginBottom: 16, borderRadius: 20,
              background: 'rgba(17,25,40,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,212,170,0.15)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.4)', marginBottom: 4 }}>
                Потрачено за период
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                  ₽<CountUp end={overview?.periodTotal ?? 0} duration={1.4} separator=" " useEasing />
                </span>
                {overview && overview.trend.changePct !== 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                      color: trendUp ? '#ef4444' : '#00d4aa',
                      background: trendUp ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,170,0.1)',
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                    {trendUp ? '↑' : '↓'}{trendAbs}%
                  </motion.span>
                )}
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Подписок', value: overview?.activeCount ?? 0, color: '#00d4aa', icon: '🛰' },
                { label: 'MRR', value: overview?.mrr ?? 0, color: '#0ea5e9', icon: '💰', prefix: '₽' },
                { label: 'ARR', value: overview?.arr ?? 0, color: '#a855f7', icon: '📅', prefix: '₽' },
                { label: 'Скоро', value: overview?.upcomingCount ?? 0, color: '#f59e0b', icon: '⚡' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                    {stat.prefix ?? ''}<CountUp end={stat.value} duration={1.4} separator=" " useEasing />
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(200,214,229,0.35)', marginTop: 4 }}>
                    {stat.icon} {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Donut + Category List ── */}
          <motion.div variants={fadeUp}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            className="analytics-grid-2">
            <div className="station-panel" style={{
              padding: '20px', borderRadius: 20,
              background: 'rgba(17,25,40,0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)', marginBottom: 4 }}>
                Категории
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(200,214,229,0.3)', marginBottom: 12 }}>
                Наведите на сектор
              </p>
              {chartLoading ? <Skeleton h={220} r={110} /> : <InteractiveDonut data={categories} />}
            </div>

            <div className="station-panel" style={{
              padding: '20px', borderRadius: 20,
              background: 'rgba(17,25,40,0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)', marginBottom: 16 }}>
                Распределение
              </p>
              {chartLoading
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[...Array(5)].map((_, i) => <Skeleton key={i} h={32} r={6} />)}</div>
                : <CategoryList data={categories} />
              }
            </div>
          </motion.div>

          {/* ── Area Chart ── */}
          <motion.div variants={fadeUp} className="station-panel" style={{
            padding: '20px', borderRadius: 20, marginBottom: 16,
            background: 'rgba(17,25,40,0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)' }}>
                Динамика расходов
              </p>
              {!chartLoading && periods.some((p) => p.total > 0) && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.3)' }}>
                  {periods.length} периодов
                </span>
              )}
            </div>

            {chartLoading ? <Skeleton h={200} r={8} /> : periods.every((p) => p.total === 0) ? (
              <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(200,214,229,0.25)' }}>
                  Нет транзакций за этот период
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.15)' }}>
                  Синхронизируйте банк для отображения данных
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={periods} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="period" tickFormatter={fmtMonth}
                    tick={{ fill: 'rgba(200,214,229,0.3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'rgba(200,214,229,0.3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip content={<GlassTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#00d4aa" strokeWidth={2.5}
                    fill="url(#areaGradMain)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* ── Bar Chart ── */}
          {services.length > 0 && (
            <motion.div variants={fadeUp} className="station-panel" style={{
              padding: '20px', borderRadius: 20, marginBottom: 16,
              background: 'rgba(17,25,40,0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)', marginBottom: 16 }}>
                Топ сервисов по стоимости
              </p>
              {chartLoading ? <Skeleton h={services.length * 40} r={8} /> : (
                <ResponsiveContainer width="100%" height={Math.max(180, services.length * 42)}>
                  <BarChart data={services} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                    <defs>
                      {services.map((s) => (
                        <linearGradient key={s.merchant} id={`bg-${s.merchant.replace(/\s/g,'')}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={s.color} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={s.color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" horizontal={false} />
                    <XAxis type="number"
                      tick={{ fill: 'rgba(200,214,229,0.3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => `₽${v.toLocaleString('ru-RU')}`} />
                    <YAxis type="category" dataKey="merchant" width={90}
                      tick={{ fill: 'rgba(200,214,229,0.6)', fontSize: 12, fontFamily: 'var(--font-body)' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip content={<GlassTooltip />} />
                    <Bar dataKey="monthlyAmount" radius={[0, 6, 6, 0]} animationDuration={1000}
                      fill="url(#barGradFallback)">
                      {services.map((s) => (
                        <Cell key={s.merchant} fill={`url(#bg-${s.merchant.replace(/\s/g,'')})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          )}

          {/* ── Recommendations + Scores ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="analytics-grid-2">

            {/* Recommendations */}
            <motion.div variants={fadeUp}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)', marginBottom: 12 }}>
                Рекомендации
              </p>
              {recommendations.length === 0 ? (
                <div className="station-panel" style={{
                  padding: '24px', borderRadius: 16, textAlign: 'center',
                  border: '1px dashed rgba(0,212,170,0.15)',
                }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>✨</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)' }}>
                    Всё отлично — замечаний нет
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations.slice(0, 4).map((rec, i) => {
                    const cfg = RECO_COLORS[rec.type];
                    return (
                      <motion.div key={i} className="station-panel"
                        style={{
                          padding: '14px 16px', borderRadius: 14,
                          background: cfg.bg, borderColor: cfg.border,
                        }}
                        whileHover={{ scale: 1.01 }}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{RECO_ICONS[rec.type]}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: cfg.text }}>
                                  {rec.merchant}
                                </p>
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10,
                                  background: `${cfg.text}18`, color: cfg.text, flexShrink: 0,
                                }}>
                                  {RECO_LABELS[rec.type]}
                                </span>
                              </div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(200,214,229,0.45)' }}>
                                {rec.reason}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#00d4aa' }}>
                              −₽{Math.round(rec.potentialSavings).toLocaleString('ru-RU')}
                            </p>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(200,214,229,0.3)' }}>
                              в год
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Scores */}
            <motion.div variants={fadeUp}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'rgba(200,214,229,0.7)', marginBottom: 12 }}>
                Здоровье подписок
              </p>
              {scores.length === 0 ? (
                <div className="station-panel" style={{
                  padding: '24px', borderRadius: 16, textAlign: 'center',
                  border: '1px dashed rgba(0,212,170,0.15)',
                }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)' }}>
                    Нет активных подписок
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scores.slice(0, 5).map((sc, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}>
                      <ScoreGauge {...sc} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 640px) {
          .analytics-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
