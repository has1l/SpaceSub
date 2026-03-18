import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import api from '../services/api';
import { Spinner } from '../components/Spinner';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface Overview {
  mrr: number;
  arr: number;
  activeCount: number;
  upcomingCount: number;
  trend: { currentMonth: number; prevMonth: number; changePct: number };
}

interface CategoryItem {
  category: string;
  total: number;
  count: number;
  percent: number;
}

interface ServiceItem {
  merchant: string;
  monthlyAmount: number;
  yearlyAmount: number;
  periodType: string;
  category: string;
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
// Palette
// ─────────────────────────────────────────────────────────

const COLORS = ['#00d4aa', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];

// ─────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

// ─────────────────────────────────────────────────────────
// Glass tooltip for Recharts
// ─────────────────────────────────────────────────────────

function GlassTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17,25,40,0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      {label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.45)', marginBottom: 4 }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#00d4aa' }}>
          ₽{p.value.toLocaleString('ru-RU')}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function fmtPeriod(key: string): string {
  const parts = key.split('-');
  const month = parts[1];
  if (!month) return key;
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return months[parseInt(month, 10) - 1] ?? key;
}

const RECO_CONFIG = {
  CANCEL: { icon: '🔴', label: 'Отменить', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  REVIEW: { icon: '🟡', label: 'Проверить', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  DOWNGRADE: { icon: '🟢', label: 'Сменить план', color: '#00d4aa', bg: 'rgba(0,212,170,0.08)' },
  CONSOLIDATE: { icon: '🟠', label: 'Объединить', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
};

const RISK_COLOR = { LOW: '#00d4aa', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const RISK_LABEL = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' };

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, cat, svc, per, rec, scr] = await Promise.all([
          api.get<Overview>('/analytics/overview'),
          api.get<CategoryItem[]>('/analytics/by-category'),
          api.get<ServiceItem[]>('/analytics/by-service?limit=10'),
          api.get<PeriodItem[]>('/analytics/by-period'),
          api.get<RecommendationItem[]>('/analytics/recommendations'),
          api.get<ScoreItem[]>('/analytics/scores'),
        ]);
        setOverview(ov.data);
        setCategories(cat.data);
        setServices(svc.data);
        setPeriods(per.data);
        setRecommendations(rec.data);
        setScores(scr.data);
      } catch {
        setError('Не удалось загрузить аналитику');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner className="min-h-[60vh]" text="Анализ орбиты..." />;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-center" style={{ color: 'rgba(200,214,229,0.4)' }}>
        {error}
      </div>
    );
  }

  const trendUp = (overview?.trend.changePct ?? 0) >= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-10">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{
          position: 'absolute', top: '10%', left: '5%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%', width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-extrabold text-gradient-signal mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Аналитика
          </h1>
          <p className="text-sm" style={{ color: 'rgba(200,214,229,0.4)', fontFamily: 'var(--font-body)' }}>
            Расходы, тренды и рекомендации по подпискам
          </p>
        </motion.div>

        {/* ── Section 1: Overview Cards ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              icon: '🛰',
              label: 'Подписок',
              value: overview?.activeCount ?? 0,
              decimals: 0,
              suffix: '',
            },
            {
              icon: '💰',
              label: 'В месяц',
              value: overview?.mrr ?? 0,
              decimals: 0,
              suffix: ' ₽',
              badge: overview ? (
                <span style={{ color: trendUp ? '#ef4444' : '#00d4aa', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {trendUp ? '↑' : '↓'}{Math.abs(overview.trend.changePct)}%
                </span>
              ) : null,
            },
            {
              icon: '📅',
              label: 'В год',
              value: overview?.arr ?? 0,
              decimals: 0,
              suffix: ' ₽',
            },
            {
              icon: '⚡',
              label: 'Скоро',
              value: overview?.upcomingCount ?? 0,
              decimals: 0,
              suffix: '',
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              className="station-panel p-4 relative overflow-hidden"
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,212,170,0.15)' }}
            >
              <div className="text-lg mb-1">{card.icon}</div>
              <div
                className="text-xl md:text-2xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}
              >
                <CountUp
                  end={card.value}
                  duration={1.8}
                  separator=" "
                  decimals={card.decimals}
                  suffix={card.suffix}
                  useEasing
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs" style={{ color: 'rgba(200,214,229,0.4)', fontFamily: 'var(--font-body)' }}>
                  {card.label}
                </p>
                {card.badge}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Section 2 + 3: Charts row ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">

          {/* Donut — by category */}
          <motion.div
            variants={fadeUp}
            className="station-panel p-5"
            style={{
              background: 'rgba(17,25,40,0.75)',
              backdropFilter: 'blur(12px) saturate(125%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
            }}
          >
            <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              Расходы по категориям
            </p>

            {categories.length === 0 ? (
              <EmptyChart text="Нет данных по категориям" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="total"
                    nameKey="category"
                    cx="40%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    animationBegin={300}
                    animationDuration={1200}
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.7)' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Area — by period */}
          <motion.div
            variants={fadeUp}
            className="station-panel p-5"
            style={{
              background: 'rgba(17,25,40,0.75)',
              backdropFilter: 'blur(12px) saturate(125%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
            }}
          >
            <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              Динамика расходов
            </p>

            {periods.every((p) => p.total === 0) ? (
              <EmptyChart text="Нет транзакций за период" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={periods} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickFormatter={fmtPeriod}
                    tick={{ fill: '#7F9BB3', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#7F9BB3', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* ── Section 4: Bar Chart — Top Services ── */}
        <motion.div
          variants={fadeUp}
          className="station-panel p-5 mb-6"
          style={{
            background: 'rgba(17,25,40,0.75)',
            backdropFilter: 'blur(12px) saturate(125%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
          }}
        >
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
            Топ сервисов по стоимости
          </p>

          {services.length === 0 ? (
            <EmptyChart text="Нет активных подписок" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, services.length * 36)}>
              <BarChart
                data={services}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#7F9BB3', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₽${v.toLocaleString('ru-RU')}`}
                />
                <YAxis
                  type="category"
                  dataKey="merchant"
                  width={100}
                  tick={{ fill: 'rgba(200,214,229,0.7)', fontSize: 12, fontFamily: 'var(--font-body)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="monthlyAmount" fill="url(#barGrad)" radius={[0, 4, 4, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* ── Section 5: Recommendations + Scores ── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Recommendations */}
          <motion.div variants={fadeUp}>
            <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              Рекомендации
            </p>
            {recommendations.length === 0 ? (
              <div
                className="station-panel p-5 text-center text-sm"
                style={{ color: 'rgba(200,214,229,0.35)', borderRadius: 16 }}
              >
                Отличная работа — нет замечаний 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 5).map((rec, i) => {
                  const cfg = RECO_CONFIG[rec.type];
                  return (
                    <motion.div
                      key={i}
                      className="station-panel p-4"
                      style={{
                        borderRadius: 14,
                        background: cfg.bg,
                        borderColor: `${cfg.color}22`,
                      }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base mt-0.5">{cfg.icon}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}>
                              {rec.merchant}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(200,214,229,0.5)', fontFamily: 'var(--font-body)' }}>
                              {rec.reason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: '#00d4aa', fontFamily: 'var(--font-mono)' }}>
                            −₽{rec.potentialSavings.toLocaleString('ru-RU')}
                          </p>
                          <p className="text-xs" style={{ color: 'rgba(200,214,229,0.35)', fontFamily: 'var(--font-body)' }}>
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
            <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}>
              Оценка подписок
            </p>
            {scores.length === 0 ? (
              <div
                className="station-panel p-5 text-center text-sm"
                style={{ color: 'rgba(200,214,229,0.35)', borderRadius: 16 }}
              >
                Нет активных подписок для оценки
              </div>
            ) : (
              <div className="space-y-2.5">
                {scores.slice(0, 6).map((sc, i) => (
                  <motion.div
                    key={i}
                    className="station-panel p-3.5"
                    style={{ borderRadius: 12 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: RISK_COLOR[sc.churnRisk],
                          boxShadow: `0 0 6px ${RISK_COLOR[sc.churnRisk]}80`,
                        }} />
                        <p className="text-sm truncate" style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.85)' }}>
                          {sc.merchant}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: `${RISK_COLOR[sc.churnRisk]}14`,
                            color: RISK_COLOR[sc.churnRisk],
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {RISK_LABEL[sc.churnRisk]}
                        </span>
                        <ScoreBar score={sc.valueScore} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#e2e8f0', minWidth: 28 }}>
                          {sc.valueScore}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function EmptyChart({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: 180, color: 'rgba(200,214,229,0.3)', fontFamily: 'var(--font-body)', fontSize: 14 }}
    >
      {text}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#00d4aa' : score >= 50 ? '#0ea5e9' : score >= 25 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      width: 48, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden',
    }}>
      <div style={{
        width: `${score}%`, height: '100%', background: color, borderRadius: 2,
        boxShadow: `0 0 6px ${color}60`,
      }} />
    </div>
  );
}
