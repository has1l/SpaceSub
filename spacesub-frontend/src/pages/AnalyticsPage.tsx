import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import api from '../services/api';

// ─── Types ───

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

// ─── Period presets ───

type PeriodKey = '7d' | '1m' | '3m' | '12m';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d',  label: '7д',  days: 7   },
  { key: '1m',  label: '1м', days: 30  },
  { key: '3m',  label: '3м', days: 90  },
  { key: '12m', label: '12м', days: 365 },
];

function getPeriodDates(key: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - PERIODS.find((p) => p.key === key)!.days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ─── SVG Icons (HUD style — thin strokes, technical feel) ───

function RadarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <circle cx="12" cy="12" r="6" opacity="0.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.8" />
      <line x1="12" y1="12" x2="18" y2="6" strokeWidth="1.5" />
      <path d="M17 7a8 8 0 01.5 4" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function SignalTowerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <line x1="12" y1="22" x2="12" y2="10" />
      <path d="M8 10l4-6 4 6" strokeWidth="1.5" fill="none" />
      <path d="M7 14a7 7 0 010-8" opacity="0.4" />
      <path d="M17 14a7 7 0 000-8" opacity="0.4" />
      <path d="M4 16a11 11 0 010-12" opacity="0.25" />
      <path d="M20 16a11 11 0 000-12" opacity="0.25" />
    </svg>
  );
}

function DataFlowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="2" y="3" width="8" height="6" rx="1" />
      <rect x="14" y="15" width="8" height="6" rx="1" />
      <path d="M6 9v3a3 3 0 003 3h6" />
      <polyline points="13 13 15 15 13 17" />
    </svg>
  );
}

function OrbitIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" opacity="0.4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" opacity="0.4" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="19" cy="16" r="1.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function TelemetryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function WarningTriangleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function DowngradeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function MergeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 009 9" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

// ─── Animations ───

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.08, staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
};

// ─── HUD Decorative Elements ───

function HudCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const transforms: Record<string, string> = {
    tl: '', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1)',
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ position: 'absolute',
        ...(position.includes('t') ? { top: 0 } : { bottom: 0 }),
        ...(position.includes('l') ? { left: 0 } : { right: 0 }),
        transform: transforms[position], opacity: 0.25, pointerEvents: 'none',
      }}>
      <path d="M0 16V4a4 4 0 014-4h12" stroke="#00d4aa" strokeWidth="1" fill="none" />
    </svg>
  );
}

function ScanLine() {
  return (
    <motion.div
      style={{
        position: 'absolute', left: 0, right: 0, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,170,0.15) 50%, transparent 100%)',
        pointerEvents: 'none',
      }}
      initial={{ top: '0%' }}
      animate={{ top: '100%' }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
    />
  );
}

function HudPanel({ children, className = '', glowing = false, accent = '#00d4aa' }: {
  children: React.ReactNode; className?: string; glowing?: boolean; accent?: string;
}) {
  return (
    <motion.div
      className={`station-panel ${glowing ? 'station-panel-glow' : ''} ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Top accent beam */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 10%, ${accent}50 50%, transparent 90%)`,
      }} />
      {/* HUD corners */}
      <HudCorner position="tl" />
      <HudCorner position="tr" />
      <HudCorner position="bl" />
      <HudCorner position="br" />
      {children}
    </motion.div>
  );
}

// ─── Glass Tooltip (HUD style) ───

function GlassTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,16,30,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,212,170,0.2)',
      borderRadius: 8,
      padding: '10px 16px',
      boxShadow: '0 0 20px rgba(0,212,170,0.1), 0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.4)', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </p>
      )}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#00d4aa', textShadow: '0 0 8px rgba(0,212,170,0.3)' }}>
        ₽{payload[0].value.toLocaleString('ru-RU')}
      </p>
    </div>
  );
}

// ─── Helpers ───

function fmtMonth(key: string) {
  const parts = key.split('-');
  const month = parts[1];
  if (!month) return key;
  return ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][parseInt(month,10)-1] ?? key;
}

const RECO_ICONS: Record<string, (props: { size?: number }) => React.ReactNode> = {
  CANCEL: WarningTriangleIcon,
  REVIEW: WarningTriangleIcon,
  DOWNGRADE: DowngradeIcon,
  CONSOLIDATE: MergeIcon,
};
const RECO_LABELS: Record<string, string> = { CANCEL: 'Отменить', REVIEW: 'Проверить', DOWNGRADE: 'Сменить план', CONSOLIDATE: 'Дубликат' };
const RECO_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  CANCEL: { text: '#ef4444', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.15)', glow: 'rgba(239,68,68,0.08)' },
  REVIEW: { text: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.15)', glow: 'rgba(245,158,11,0.08)' },
  DOWNGRADE: { text: '#00d4aa', bg: 'rgba(0,212,170,0.05)', border: 'rgba(0,212,170,0.15)', glow: 'rgba(0,212,170,0.08)' },
  CONSOLIDATE: { text: '#f97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.15)', glow: 'rgba(249,115,22,0.08)' },
};
const RISK_COLOR: Record<string, string> = { LOW: '#00d4aa', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const RISK_LABEL: Record<string, string> = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' };

// ─── Skeleton ───

function Skeleton({ h = 20, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, rgba(0,212,170,0.03) 25%, rgba(0,212,170,0.07) 50%, rgba(0,212,170,0.03) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

// ─── Period Tabs (HUD style segmented control) ───

function PeriodTabs({ active, onChange }: { active: PeriodKey; onChange: (k: PeriodKey) => void }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: '3px',
      background: 'rgba(0,212,170,0.04)',
      borderRadius: 10, border: '1px solid rgba(0,212,170,0.1)',
    }}>
      {PERIODS.map((p) => {
        const isActive = p.key === active;
        return (
          <motion.button
            key={p.key}
            onClick={() => onChange(p.key)}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              letterSpacing: '0.02em',
              color: isActive ? '#06101e' : 'rgba(200,214,229,0.45)',
              background: isActive
                ? 'linear-gradient(135deg, #00d4aa, #0ea5e9)'
                : 'transparent',
              boxShadow: isActive ? '0 0 16px rgba(0,212,170,0.35), 0 2px 8px rgba(0,212,170,0.2)' : 'none',
              textShadow: isActive ? 'none' : '0 0 4px rgba(200,214,229,0.1)',
              transition: 'all 0.25s ease-out',
            }}
          >
            {p.label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Interactive Donut (with neon glow effect) ───

function InteractiveDonut({ data }: { data: CategoryItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(200,214,229,0.3)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
        Нет данных
      </div>
    );
  }

  const shown = active !== null ? data[active] : null;
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div style={{ position: 'relative' }}>
      {/* Glow ring behind chart */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: 200, height: 200,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: shown
          ? `radial-gradient(circle, ${shown.color}15 0%, transparent 70%)`
          : 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        transition: 'background 0.3s ease',
        pointerEvents: 'none',
      }} />

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={4}
            cornerRadius={3}
            animationBegin={200}
            animationDuration={1000}
            onMouseEnter={(_, idx) => setActive(idx)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={active === null || active === i ? 1 : 0.25}
                stroke="transparent"
                style={{
                  cursor: 'pointer',
                  filter: active === i ? `drop-shadow(0 0 12px ${entry.color}90)` : 'none',
                  transition: 'all 0.2s ease-out',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text with HUD ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {/* Inner decorative ring */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 110, height: 110, borderRadius: '50%',
          border: '1px solid rgba(0,212,170,0.08)',
        }} />

        <AnimatePresence mode="wait">
          {shown ? (
            <motion.div key={shown.category}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800,
                color: shown.color, lineHeight: 1,
                textShadow: `0 0 12px ${shown.color}60`,
              }}>
                {shown.percent}%
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(200,214,229,0.5)', marginTop: 4, maxWidth: 90 }}>
                {shown.category}
              </p>
            </motion.div>
          ) : (
            <motion.div key="total"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800,
                color: '#e2e8f0', lineHeight: 1,
                textShadow: '0 0 8px rgba(226,232,240,0.15)',
              }}>
                ₽{Math.round(total).toLocaleString('ru-RU')}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.35)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                всего/мес
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Category Progress List (with HUD markers) ───

function CategoryList({ data }: { data: CategoryItem[] }) {
  if (data.length === 0) return null;
  const max = data[0].total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.slice(0, 6).map((item, i) => (
        <motion.div key={item.category}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Glowing dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: item.color, flexShrink: 0,
                boxShadow: `0 0 8px ${item.color}80, 0 0 2px ${item.color}`,
              }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.85)' }}>
                {item.category}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.4)', letterSpacing: '0.02em' }}>
                {item.percent}%
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#e2e8f0', minWidth: 72, textAlign: 'right' }}>
                ₽{Math.round(item.total).toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
          {/* Progress bar with neon glow */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.total / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                boxShadow: `0 0 12px ${item.color}40, 0 1px 4px ${item.color}30`,
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Health Score Gauge Card (HUD style) ───

function ScoreGauge({ valueScore, churnRisk, merchant, label, monthlyAmount }: ScoreItem) {
  const color = RISK_COLOR[churnRisk];

  return (
    <motion.div
      className="station-panel"
      style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}
      whileHover={{ y: -2, boxShadow: `0 4px 20px ${color}15` }}
      transition={{ duration: 0.2 }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'rgba(200,214,229,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {merchant}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)', marginTop: 2, letterSpacing: '0.03em' }}>
            {label} &middot; ₽{monthlyAmount.toLocaleString('ru-RU')}/мес
          </p>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 6,
          background: `${color}15`, color, border: `1px solid ${color}30`,
          flexShrink: 0, marginLeft: 8,
        }}>
          {RISK_LABEL[churnRisk]}
        </span>
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${valueScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 4,
              background: `linear-gradient(90deg, ${color}99, ${color})`,
              boxShadow: `0 0 10px ${color}40`,
            }}
          />
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color,
          textShadow: `0 0 8px ${color}40`,
          minWidth: 30, textAlign: 'right',
        }}>
          {valueScore}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Section Header (HUD tech label) ───

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
    }}>
      {icon && <span style={{ color: '#00d4aa', opacity: 0.7 }}>{icon}</span>}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
        color: 'rgba(200,214,229,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase',
        margin: 0,
      }}>
        {children}
      </p>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,212,170,0.15), transparent)', marginLeft: 4 }} />
    </div>
  );
}

// ─── Page ───

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
  const [aiInsight, setAiInsight] = useState<{ text: string; generatedAt: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
    setAiInsight(null);
    setAiError(null);
  };

  const fetchAiInsight = async () => {
    setAiLoading(true);
    setAiError(null);
    const { from, to } = getPeriodDates(period);
    try {
      const res = await api.get<{ text: string; generatedAt: string }>(
        `/analytics/ai-insight?from=${from}&to=${to}`,
      );
      setAiInsight(res.data);
    } catch {
      setAiError('Не удалось получить AI-анализ. Попробуйте позже.');
    } finally {
      setAiLoading(false);
    }
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
            {[...Array(4)].map((_, i) => <Skeleton key={i} h={110} r={16} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Skeleton h={300} r={16} />
            <Skeleton h={300} r={16} />
          </div>
          <Skeleton h={240} r={16} />
        </div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  const heroStats = [
    { label: 'ПОДПИСОК', value: overview?.activeCount ?? 0, color: '#00d4aa', icon: <OrbitIcon size={20} /> },
    { label: 'В МЕСЯЦ', value: overview?.mrr ?? 0, color: '#0ea5e9', icon: <DataFlowIcon size={20} />, prefix: '₽' },
    { label: 'В ГОД', value: overview?.arr ?? 0, color: '#a78bfa', icon: <SignalTowerIcon size={20} />, prefix: '₽' },
    { label: 'СКОРО', value: overview?.upcomingCount ?? 0, color: '#f59e0b', icon: <TelemetryIcon size={20} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-10">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '5%', left: '-5%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '-5%', width: 450, height: 450,
          background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%', width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">

          {/* ── Header + Period Tabs ── */}
          <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#00d4aa', opacity: 0.7 }}><RadarIcon size={28} /></span>
                <h1 style={{
                  fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, margin: 0,
                  background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Аналитика
                </h1>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                ТЕЛЕМЕТРИЯ РАСХОДОВ &middot; ДИАГНОСТИКА &middot; РЕКОМЕНДАЦИИ
              </p>
            </div>
            <PeriodTabs active={period} onChange={handlePeriod} />
          </motion.div>

          {/* ── Hero Card ── */}
          <motion.div variants={fadeUp}>
            <HudPanel glowing accent="#00d4aa">
              <ScanLine />
              <div style={{ padding: '24px 28px', position: 'relative', zIndex: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Потрачено за период
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 800, color: '#e2e8f0', lineHeight: 1,
                        textShadow: '0 0 20px rgba(226,232,240,0.1)',
                      }}>
                        ₽<CountUp end={overview?.periodTotal ?? 0} duration={1.4} separator=" " useEasing />
                      </span>
                      {overview && overview.trend.changePct !== 0 && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                            color: trendUp ? '#ef4444' : '#00d4aa',
                            background: trendUp ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,170,0.1)',
                            border: `1px solid ${trendUp ? 'rgba(239,68,68,0.2)' : 'rgba(0,212,170,0.2)'}`,
                            padding: '4px 12px', borderRadius: 6,
                            textShadow: `0 0 6px ${trendUp ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,170,0.3)'}`,
                          }}>
                          {trendUp ? '↑' : '↓'} {trendAbs}%
                        </motion.span>
                      )}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                    {heroStats.map((stat, i) => (
                      <motion.div key={stat.label}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        style={{ textAlign: 'center' }}>
                        <p style={{
                          fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: stat.color, lineHeight: 1,
                          textShadow: `0 0 10px ${stat.color}30`,
                        }}>
                          {stat.prefix ?? ''}<CountUp end={stat.value} duration={1.4} separator=" " useEasing />
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6, color: 'rgba(200,214,229,0.3)' }}>
                          {stat.icon}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em' }}>
                            {stat.label}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </HudPanel>
          </motion.div>

          <div style={{ height: 20 }} />

          {/* ── Donut + Category List ── */}
          <motion.div variants={fadeUp}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            className="analytics-grid-2">
            <HudPanel accent="#0ea5e9">
              <div style={{ padding: '20px 22px' }}>
                <SectionLabel icon={<OrbitIcon size={14} />}>Категории</SectionLabel>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.2)', marginBottom: 8, letterSpacing: '0.08em' }}>
                  НАВЕДИТЕ НА СЕКТОР
                </p>
                {chartLoading ? <Skeleton h={240} r={110} /> : <InteractiveDonut data={categories} />}
              </div>
            </HudPanel>

            <HudPanel accent="#a78bfa">
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
                <SectionLabel icon={<TelemetryIcon size={14} />}>Распределение</SectionLabel>
                {chartLoading
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{[...Array(5)].map((_, i) => <Skeleton key={i} h={34} r={6} />)}</div>
                  : <CategoryList data={categories} />
                }
              </div>
            </HudPanel>
          </motion.div>

          {/* ── Area Chart ── */}
          <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
            <HudPanel accent="#00d4aa">
              <div style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SectionLabel icon={<DataFlowIcon size={14} />}>Динамика расходов</SectionLabel>
                  {!chartLoading && periods.some((p) => p.total > 0) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.25)', letterSpacing: '0.05em' }}>
                      {periods.length} ПЕРИОДОВ
                    </span>
                  )}
                </div>

                {chartLoading ? <Skeleton h={220} r={8} /> : periods.every((p) => p.total === 0) ? (
                  <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(200,214,229,0.15)' }}><SignalTowerIcon size={32} /></span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(200,214,229,0.25)' }}>
                      Нет транзакций за этот период
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.15)', letterSpacing: '0.03em' }}>
                      Синхронизируйте банк для отображения данных
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={periods} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGradHud" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.25} />
                          <stop offset="50%" stopColor="#00d4aa" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                        </linearGradient>
                        <filter id="areaGlow">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid stroke="rgba(0,212,170,0.04)" strokeDasharray="4 8" vertical={false} />
                      <XAxis dataKey="period" tickFormatter={fmtMonth}
                        tick={{ fill: 'rgba(200,214,229,0.3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                        axisLine={{ stroke: 'rgba(0,212,170,0.08)' }} tickLine={false} />
                      <YAxis
                        tick={{ fill: 'rgba(200,214,229,0.25)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                      <Tooltip content={<GlassTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#00d4aa" strokeWidth={2.5}
                        fill="url(#areaGradHud)" animationDuration={1200}
                        filter="url(#areaGlow)"
                        dot={false}
                        activeDot={{
                          r: 5, fill: '#00d4aa', stroke: '#06101e', strokeWidth: 2,
                          style: { filter: 'drop-shadow(0 0 6px rgba(0,212,170,0.5))' } as React.CSSProperties,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </HudPanel>
          </motion.div>

          {/* ── Bar Chart ── */}
          {services.length > 0 && (
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <HudPanel accent="#0ea5e9">
                <div style={{ padding: '20px 22px' }}>
                  <SectionLabel icon={<SignalTowerIcon size={14} />}>Топ сервисов по стоимости</SectionLabel>
                  {chartLoading ? <Skeleton h={services.length * 42} r={8} /> : (
                    <ResponsiveContainer width="100%" height={Math.max(200, services.length * 44)}>
                      <BarChart data={services} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                        <defs>
                          {services.map((s) => (
                            <linearGradient key={s.merchant} id={`hud-bg-${s.merchant.replace(/\s/g,'')}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={s.color} stopOpacity={0.85} />
                              <stop offset="100%" stopColor={s.color} stopOpacity={0.35} />
                            </linearGradient>
                          ))}
                          <filter id="barGlow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid stroke="rgba(0,212,170,0.04)" strokeDasharray="4 8" horizontal={false} />
                        <XAxis type="number"
                          tick={{ fill: 'rgba(200,214,229,0.25)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                          axisLine={{ stroke: 'rgba(0,212,170,0.08)' }} tickLine={false}
                          tickFormatter={(v: number) => `₽${v.toLocaleString('ru-RU')}`} />
                        <YAxis type="category" dataKey="merchant" width={95}
                          tick={{ fill: 'rgba(200,214,229,0.6)', fontSize: 12, fontFamily: 'var(--font-body)' }}
                          axisLine={false} tickLine={false} />
                        <Tooltip content={<GlassTooltip />} />
                        <Bar dataKey="monthlyAmount" radius={[0, 6, 6, 0]} animationDuration={1000}
                          filter="url(#barGlow)">
                          {services.map((s) => (
                            <Cell key={s.merchant} fill={`url(#hud-bg-${s.merchant.replace(/\s/g,'')})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </HudPanel>
            </motion.div>
          )}

          {/* ── Recommendations + Scores ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="analytics-grid-2">

            {/* Recommendations */}
            <motion.div variants={fadeUp}>
              <SectionLabel icon={<WarningTriangleIcon size={14} />}>Рекомендации</SectionLabel>
              {recommendations.length === 0 ? (
                <HudPanel accent="#00d4aa">
                  <div style={{ padding: '28px', textAlign: 'center' }}>
                    <span style={{ color: '#00d4aa', opacity: 0.6 }}><SparkleIcon size={28} /></span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginTop: 10 }}>
                      Всё отлично — замечаний нет
                    </p>
                  </div>
                </HudPanel>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations.slice(0, 4).map((rec, i) => {
                    const cfg = RECO_COLORS[rec.type];
                    const Icon = RECO_ICONS[rec.type];
                    return (
                      <motion.div key={i} className="station-panel"
                        style={{
                          padding: '14px 16px', position: 'relative', overflow: 'hidden',
                          background: cfg.bg, borderColor: cfg.border,
                        }}
                        whileHover={{ y: -2, boxShadow: `0 4px 16px ${cfg.glow}` }}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                          background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)`,
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                            <span style={{ color: cfg.text, flexShrink: 0, marginTop: 2 }}>{Icon && <Icon size={16} />}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: cfg.text }}>
                                  {rec.merchant}
                                </p>
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 8px', borderRadius: 6,
                                  background: `${cfg.border}`, color: cfg.text, flexShrink: 0,
                                  letterSpacing: '0.03em',
                                }}>
                                  {RECO_LABELS[rec.type]}
                                </span>
                              </div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(200,214,229,0.4)', lineHeight: 1.4 }}>
                                {rec.reason}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{
                              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#00d4aa',
                              textShadow: '0 0 6px rgba(0,212,170,0.3)',
                            }}>
                              −₽{Math.round(rec.potentialSavings).toLocaleString('ru-RU')}
                            </p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.25)', letterSpacing: '0.05em' }}>
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
              <SectionLabel icon={<ShieldCheckIcon size={14} />}>Здоровье подписок</SectionLabel>
              {scores.length === 0 ? (
                <HudPanel accent="#00d4aa">
                  <div style={{ padding: '28px', textAlign: 'center' }}>
                    <span style={{ color: 'rgba(200,214,229,0.2)' }}><OrbitIcon size={28} /></span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginTop: 10 }}>
                      Нет активных подписок
                    </p>
                  </div>
                </HudPanel>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scores.slice(0, 5).map((sc, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}>
                      <ScoreGauge {...sc} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── AI Insight ── */}
          <motion.div variants={fadeUp} style={{ marginTop: 20 }}>
            <HudPanel accent="#a78bfa" glowing={!!aiInsight}>
              <div style={{ padding: '24px 26px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiInsight ? 16 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93" />
                      <path d="M8 6a4 4 0 018 0" opacity="0.4" />
                      <rect x="8" y="12" width="8" height="8" rx="2" />
                      <line x1="12" y1="10" x2="12" y2="12" />
                      <line x1="10" y1="20" x2="10" y2="22" />
                      <line x1="14" y1="20" x2="14" y2="22" />
                    </svg>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                      color: 'rgba(200,214,229,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      AI-анализ расходов
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
                      border: '1px solid rgba(167,139,250,0.25)',
                      letterSpacing: '0.08em',
                    }}>
                      BETA
                    </span>
                  </div>
                  {aiInsight && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: 'rgba(200,214,229,0.25)', letterSpacing: '0.03em',
                    }}>
                      {new Date(aiInsight.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {/* Idle state */}
                  {!aiInsight && !aiLoading && !aiError && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ textAlign: 'center', padding: '20px 0' }}
                    >
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginBottom: 16 }}>
                        Искусственный интеллект проанализирует ваши подписки и даст персональные рекомендации
                      </p>
                      <motion.button
                        onClick={fetchAiInsight}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-signal"
                        style={{
                          padding: '10px 28px', fontSize: 13,
                          fontFamily: 'var(--font-body)',
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                        </svg>
                        Получить анализ
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Loading state */}
                  {aiLoading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ padding: '20px 0' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            style={{ color: '#a78bfa' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                            </svg>
                          </motion.div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a78bfa' }}>
                            Анализируем ваши расходы...
                          </span>
                        </div>
                        <Skeleton h={14} w="90%" r={4} />
                        <Skeleton h={14} w="75%" r={4} />
                        <Skeleton h={14} w="85%" r={4} />
                        <Skeleton h={14} w="60%" r={4} />
                      </div>
                    </motion.div>
                  )}

                  {/* Error state */}
                  {aiError && !aiLoading && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ textAlign: 'center', padding: '20px 0' }}
                    >
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
                        {aiError}
                      </p>
                      <motion.button
                        onClick={fetchAiInsight}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-ghost"
                        style={{ padding: '8px 20px', fontSize: 12, fontFamily: 'var(--font-body)' }}
                      >
                        Попробовать снова
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Result state */}
                  {aiInsight && !aiLoading && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.7,
                        color: 'rgba(200,214,229,0.8)',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {aiInsight.text}
                      </div>
                      <div style={{
                        marginTop: 16, paddingTop: 12,
                        borderTop: '1px solid rgba(167,139,250,0.1)',
                        display: 'flex', justifyContent: 'center',
                      }}>
                        <motion.button
                          onClick={fetchAiInsight}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn-ghost"
                          style={{
                            padding: '8px 20px', fontSize: 12,
                            fontFamily: 'var(--font-body)',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                          </svg>
                          Обновить анализ
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </HudPanel>
          </motion.div>

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
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
