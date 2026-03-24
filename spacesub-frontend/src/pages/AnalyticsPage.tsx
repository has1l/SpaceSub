import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Line,
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

interface PeriodItemWithAvg extends PeriodItem {
  movingAvg: number;
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

// ─── SVG Category Icons ───

function CategoryIcon({ category, size = 16, color = 'currentColor' }: { category: string; size?: number; color?: string }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (category) {
    case 'Развлечения':
      return <svg {...props}><rect x="2" y="4" width="20" height="14" rx="2" /><polygon points="10,8 10,14 15,11" fill={color} opacity={0.6} stroke="none" /></svg>;
    case 'Музыка':
      return <svg {...props}><rect x="6" y="10" width="3" height="8" rx="1" opacity={0.7} /><rect x="11" y="6" width="3" height="12" rx="1" /><rect x="16" y="8" width="3" height="10" rx="1" opacity={0.7} /></svg>;
    case 'Продуктивность':
      return <svg {...props}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" opacity={0.6} /><rect x="3" y="13" width="8" height="8" rx="1.5" opacity={0.6} /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>;
    case 'Облако и хостинг':
      return <svg {...props}><path d="M18 10a4 4 0 00-7.5-2A3.5 3.5 0 004 11.5 3 3 0 005 17h12a3 3 0 001-5.8z" /><polyline points="12 13 12 9" /><polyline points="10 11 12 9 14 11" /></svg>;
    case 'Безопасность':
      return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><rect x="10" y="10" width="4" height="5" rx="1" /><circle cx="12" cy="8" r="2" /></svg>;
    case 'Образование':
      return <svg {...props}><path d="M2 12l10-5 10 5-10 5z" /><path d="M6 14v4c0 1 3 3 6 3s6-2 6-3v-4" /><line x1="22" y1="12" x2="22" y2="18" /></svg>;
    case 'Игры':
      return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="4" /><circle cx="8" cy="12" r="1.5" fill={color} opacity={0.5} stroke="none" /><circle cx="16" cy="10" r="1" fill={color} opacity={0.5} stroke="none" /><circle cx="18" cy="12" r="1" fill={color} opacity={0.5} stroke="none" /><circle cx="16" cy="14" r="1" fill={color} opacity={0.5} stroke="none" /></svg>;
    case 'Фитнес':
      return <svg {...props}><polyline points="2 12 6 12 8 8 12 16 14 12 18 12 20 10 22 12" /></svg>;
    case 'Новости':
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="14" y2="12" opacity={0.6} /><line x1="7" y1="16" x2="12" y2="16" opacity={0.4} /></svg>;
    default:
      return <svg {...props}><circle cx="6" cy="12" r="1.5" fill={color} opacity={0.5} stroke="none" /><circle cx="12" cy="12" r="1.5" fill={color} opacity={0.5} stroke="none" /><circle cx="18" cy="12" r="1.5" fill={color} opacity={0.5} stroke="none" /></svg>;
  }
}

// ─── SVG HUD Icons ───

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

function ChevronIcon({ size = 12, rotated = false }: { size?: number; rotated?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.25s ease', transform: rotated ? 'rotate(90deg)' : 'rotate(0deg)' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function TargetIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <circle cx="12" cy="12" r="6" opacity="0.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
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
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 10%, ${accent}50 50%, transparent 90%)`,
      }} />
      <HudCorner position="tl" />
      <HudCorner position="tr" />
      <HudCorner position="bl" />
      <HudCorner position="br" />
      {children}
    </motion.div>
  );
}

// ─── Glass Tooltip ───

function GlassTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const main = payload.find(p => p.dataKey === 'total') ?? payload[0];
  const avg = payload.find(p => p.dataKey === 'movingAvg');
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
        ₽{main.value.toLocaleString('ru-RU')}
      </p>
      {avg && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(14,165,233,0.6)', marginTop: 2 }}>
          Среднее: ₽{Math.round(avg.value).toLocaleString('ru-RU')}
        </p>
      )}
    </div>
  );
}

// ─── Helpers ───

function fmtMonth(key: string) {
  const parts = key.split('-');
  if (parts.length < 2) return key;
  const second = parts[1];
  if (second.startsWith('W')) return `Н${second.slice(1)}`;
  const m = parseInt(second, 10);
  if (!m) return key;
  return ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][m - 1] ?? key;
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

function computeMovingAvg(data: PeriodItem[]): PeriodItemWithAvg[] {
  return data.map((item, i) => {
    const window = data.slice(Math.max(0, i - 2), i + 1);
    const avg = window.reduce((s, w) => s + w.total, 0) / window.length;
    return { ...item, movingAvg: Math.round(avg) };
  });
}

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

// ─── Period Tabs ───

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

// ─── Interactive Donut with Category Icons ───

const RADIAN = Math.PI / 180;

function InteractiveDonut({ data, selectedCategory, onSelectCategory }: {
  data: CategoryItem[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(200,214,229,0.3)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
        Нет данных
      </div>
    );
  }

  const selectedIdx = selectedCategory ? data.findIndex(d => d.category === selectedCategory) : null;
  const activeIdx = hovered ?? selectedIdx;
  const shown = activeIdx !== null && activeIdx >= 0 ? data[activeIdx] : null;
  const total = data.reduce((s, d) => s + d.total, 0);

  // Calculate mid-angles for icon placement
  let startAngle = 90;
  const iconPositions = data.map((item) => {
    const angle = (item.percent / 100) * 360;
    const midAngle = startAngle + angle / 2;
    startAngle += angle;
    const r = 122;
    const cx = 150;
    const cy = 130;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return { x, y, midAngle };
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Glow ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: 210, height: 210,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: shown
          ? `radial-gradient(circle, ${shown.color}18 0%, transparent 70%)`
          : 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        transition: 'background 0.3s ease',
        pointerEvents: 'none',
      }} />

      {/* Orbit ring */}
      <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        width="260" height="260" viewBox="0 0 260 260">
        <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(0,212,170,0.06)"
          strokeWidth="0.5" strokeDasharray="3 8"
          style={{ animation: 'spin-slow 60s linear infinite' }} />
      </svg>

      <ResponsiveContainer width="100%" height={260}>
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
            onMouseEnter={(_, idx) => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            onClick={(_, idx) => {
              const cat = data[idx]?.category;
              onSelectCategory(selectedCategory === cat ? null : cat);
            }}
          >
            {data.map((entry, i) => {
              const isSelected = selectedCategory === entry.category;
              const isHovered = hovered === i;
              const dimmed = (selectedCategory && !isSelected && hovered === null) || (hovered !== null && hovered !== i);
              return (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={dimmed ? 0.2 : 1}
                  stroke="transparent"
                  style={{
                    cursor: 'pointer',
                    filter: (isSelected || isHovered) ? `drop-shadow(0 0 14px ${entry.color}90)` : 'none',
                    transition: 'all 0.25s ease-out',
                  }}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Category icons on sectors */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 300 260">
        {data.map((item, i) => {
          if (item.percent < 5) return null;
          const pos = iconPositions[i];
          const isActive = activeIdx === i;
          return (
            <g key={item.category} transform={`translate(${pos.x - 8}, ${pos.y - 8})`}
              style={{ opacity: isActive ? 1 : 0.5, transition: 'opacity 0.2s', filter: isActive ? `drop-shadow(0 0 4px ${item.color})` : 'none' }}>
              <CategoryIcon category={item.category} size={16} color={item.color} />
            </g>
          );
        })}
      </svg>

      {/* Center text */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
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

// ─── Donut Expansion Panel ───

function DonutExpansionPanel({ category, services, color, onClose }: {
  category: string;
  services: ServiceItem[];
  color: string;
  onClose: () => void;
}) {
  const catServices = services.filter(s => s.category === category);
  const catTotal = catServices.reduce((s, sv) => s + sv.monthlyAmount, 0);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ overflow: 'hidden' }}
    >
      <HudPanel accent={color} className="mt-3">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CategoryIcon category={category} size={18} color={color} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'rgba(200,214,229,0.85)' }}>
                {category}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.35)' }}>
                {catServices.length} подписок · ₽{Math.round(catTotal).toLocaleString('ru-RU')}/мес
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,214,229,0.3)',
              padding: 4, lineHeight: 1, fontSize: 16,
            }}>
              ✕
            </button>
          </div>

          {catServices.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.3)' }}>
              Нет подписок в этой категории
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catServices.map((svc, i) => {
                const share = catTotal > 0 ? (svc.monthlyAmount / catTotal) * 100 : 0;
                return (
                  <motion.div key={svc.merchant}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.7)' }}>
                        {svc.merchant}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'rgba(200,214,229,0.8)' }}>
                        ₽{Math.round(svc.monthlyAmount).toLocaleString('ru-RU')}/мес
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${share}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        style={{
                          height: '100%', borderRadius: 2,
                          background: `linear-gradient(90deg, ${color}80, ${color})`,
                          boxShadow: `0 0 6px ${color}30`,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </HudPanel>
    </motion.div>
  );
}

// ─── Category Accordion List ───

function CategoryAccordion({ data, services, selectedCategory, onSelectCategory }: {
  data: CategoryItem[];
  services: ServiceItem[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}) {
  if (data.length === 0) return null;
  const max = data[0].total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.slice(0, 8).map((item, i) => {
        const isOpen = selectedCategory === item.category;
        const catServices = services.filter(s => s.category === item.category);

        return (
          <motion.div key={item.category}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div
              onClick={() => onSelectCategory(isOpen ? null : item.category)}
              style={{ cursor: 'pointer', padding: '6px 0' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.color, flexShrink: 0,
                    boxShadow: `0 0 8px ${item.color}80, 0 0 2px ${item.color}`,
                  }} />
                  <CategoryIcon category={item.category} size={14} color={item.color} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.85)' }}>
                    {item.category}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(200,214,229,0.4)', letterSpacing: '0.02em' }}>
                    {item.percent}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#e2e8f0', minWidth: 72, textAlign: 'right' }}>
                    ₽{Math.round(item.total).toLocaleString('ru-RU')}
                  </span>
                  <span style={{ color: 'rgba(200,214,229,0.3)' }}>
                    <ChevronIcon size={12} rotated={isOpen} />
                  </span>
                </div>
              </div>
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
            </div>

            <AnimatePresence>
              {isOpen && catServices.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    marginLeft: 18, paddingLeft: 12, marginTop: 4, marginBottom: 8,
                    borderLeft: `2px solid ${item.color}40`,
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: `${item.color}60`,
                      letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                    }}>
                      СКАНИРОВАНИЕ · {catServices.length} ОБЪЕКТОВ
                    </p>
                    {catServices.map((svc, si) => (
                      <motion.div key={svc.merchant}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: si * 0.04 }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '5px 0',
                          borderBottom: si < catServices.length - 1 ? `1px solid ${item.color}08` : 'none',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(200,214,229,0.6)' }}>
                          {svc.merchant}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'rgba(200,214,229,0.7)' }}>
                          ₽{Math.round(svc.monthlyAmount).toLocaleString('ru-RU')}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Budget Radar Cards ───

function BudgetRadarSection({ overview, categories, recommendations }: {
  overview: Overview;
  categories: CategoryItem[];
  recommendations: RecommendationItem[];
}) {
  const totalSavings = recommendations.reduce((s, r) => s + r.potentialSavings, 0);
  const highCount = recommendations.filter(r => r.priority === 'HIGH').length;
  const medCount = recommendations.filter(r => r.priority === 'MEDIUM').length;
  const healthScore = Math.max(0, Math.min(100, 100 - highCount * 20 - medCount * 10));
  const optimizationPct = overview.periodTotal > 0 ? Math.min(100, Math.round((totalSavings / 12) / overview.periodTotal * 100)) : 0;
  const catCount = categories.length || 1;
  const density = Math.round((overview.activeCount / catCount) * 10) / 10;

  const healthColor = healthScore > 70 ? '#00d4aa' : healthScore > 40 ? '#f59e0b' : '#ef4444';

  const cards = [
    {
      label: 'Здоровье бюджета',
      value: healthScore,
      suffix: '/100',
      color: healthColor,
      icon: <ShieldCheckIcon size={16} />,
      gauge: healthScore,
    },
    {
      label: 'Потенциал оптимизации',
      value: optimizationPct,
      suffix: '%',
      color: '#0ea5e9',
      icon: <TargetIcon size={16} />,
      gauge: optimizationPct,
    },
    {
      label: 'Плотность подписок',
      value: density,
      suffix: '/кат',
      color: '#a78bfa',
      icon: <OrbitIcon size={16} />,
      gauge: Math.min(100, density * 20),
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="analytics-grid-3">
      {cards.map((card, i) => (
        <motion.div key={card.label}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
        >
          <HudPanel accent={card.color}>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Circular gauge */}
              <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  <circle cx="24" cy="24" r="20" fill="none"
                    stroke={card.color} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(card.gauge / 100) * 125.6} 125.6`}
                    transform="rotate(-90 24 24)"
                    style={{ filter: `drop-shadow(0 0 4px ${card.color}60)`, transition: 'stroke-dasharray 1s ease-out' }}
                  />
                </svg>
                <span style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  color: card.color, opacity: 0.7,
                }}>
                  {card.icon}
                </span>
              </div>
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1,
                  textShadow: `0 0 8px ${card.color}30`,
                }}>
                  <CountUp end={card.value} duration={1.2} decimals={card.value % 1 !== 0 ? 1 : 0} useEasing />
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.5, marginLeft: 2 }}>{card.suffix}</span>
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
                  {card.label}
                </p>
              </div>
            </div>
          </HudPanel>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Trend Sparkline ───

function TrendSparkline({ data, color }: { data: PeriodItem[]; color: string }) {
  if (data.length < 2) return null;
  const vals = data.slice(-6).map(d => d.total);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 22;
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}50)` }} />
      <circle cx={parseFloat(points.split(' ').pop()!.split(',')[0])} cy={parseFloat(points.split(' ').pop()!.split(',')[1])} r="2.5"
        fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ─── Score Circular Gauge ───

function ScoreGauge({ valueScore, churnRisk, merchant, label, monthlyAmount }: ScoreItem) {
  const color = RISK_COLOR[churnRisk];
  const isHigh = churnRisk === 'HIGH';

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

      {/* Priority left border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, ${color}80, ${color}10)`,
        animation: isHigh ? 'alarm-pulse 1.5s ease-in-out infinite' : 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'rgba(200,214,229,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {merchant}
            </p>
            {/* Alarm dot for HIGH risk */}
            {isHigh && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                animation: 'alarm-pulse 1.5s ease-in-out infinite',
                flexShrink: 0,
              }} />
            )}
            {churnRisk === 'MEDIUM' && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)', marginTop: 2, letterSpacing: '0.03em' }}>
            {label} · ₽{monthlyAmount.toLocaleString('ru-RU')}/мес
          </p>
        </div>

        {/* Circular gauge */}
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <path d="M 6 34 A 16 16 0 1 1 38 34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 6 34 A 16 16 0 1 1 38 34" fill="none"
              stroke={color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(valueScore / 100) * 82} 82`}
              style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: 'stroke-dasharray 0.8s ease-out' }}
            />
          </svg>
          <span style={{
            position: 'absolute', top: '62%', left: '50%', transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color,
            textShadow: `0 0 6px ${color}40`,
          }}>
            {valueScore}
          </span>
        </div>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 6,
          background: `${color}15`, color, border: `1px solid ${color}30`,
          flexShrink: 0,
        }}>
          {RISK_LABEL[churnRisk]}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Section Header ───

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

// ─── Score Filter Tabs ───

type ScoreFilter = 'all' | 'risky' | 'healthy';

function ScoreFilterTabs({ active, onChange }: { active: ScoreFilter; onChange: (f: ScoreFilter) => void }) {
  const tabs: { key: ScoreFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'risky', label: 'Проблемные' },
    { key: 'healthy', label: 'Здоровые' },
  ];
  return (
    <div style={{ display: 'inline-flex', gap: 2, marginBottom: 10 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: active === t.key ? '#06101e' : 'rgba(200,214,229,0.4)',
          background: active === t.key ? 'linear-gradient(135deg, #00d4aa, #0ea5e9)' : 'rgba(0,212,170,0.05)',
          transition: 'all 0.2s',
        }}>
          {t.label}
        </button>
      ))}
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');

  const load = useCallback(async (p: PeriodKey, initial = false) => {
    if (initial) setLoading(true); else setChartLoading(true);
    const { from, to } = getPeriodDates(p);
    const q = `from=${from}&to=${to}`;
    const granularity = (p === '7d' || p === '1m') ? 'week' : 'month';

    try {
      const [ov, cat, svc, per, rec, scr] = await Promise.all([
        api.get<Overview>(`/analytics/overview?${q}`),
        api.get<CategoryItem[]>(`/analytics/by-category?${q}`),
        api.get<ServiceItem[]>(`/analytics/by-service?limit=15&${q}`),
        api.get<PeriodItem[]>(`/analytics/by-period?${q}&granularity=${granularity}`),
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
    setSelectedCategory(null);
    load(p);
  };

  const periodsWithAvg = useMemo(() => computeMovingAvg(periods), [periods]);

  const filteredScores = useMemo(() => {
    if (scoreFilter === 'risky') return scores.filter(s => s.churnRisk === 'HIGH' || s.churnRisk === 'MEDIUM');
    if (scoreFilter === 'healthy') return scores.filter(s => s.churnRisk === 'LOW');
    return scores;
  }, [scores, scoreFilter]);

  const totalSavings = useMemo(() => recommendations.reduce((s, r) => s + r.potentialSavings, 0), [recommendations]);

  const trendUp = (overview?.trend.changePct ?? 0) >= 0;
  const trendAbs = Math.abs(overview?.trend.changePct ?? 0);

  // Ranked services for bar chart with medals
  const rankedServices = useMemo(() => {
    const all = [...services].sort((a, b) => b.monthlyAmount - a.monthlyAmount);
    return all.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [services]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton h={40} w="30%" />
          <Skeleton h={28} w="50%" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} h={80} r={16} />)}
          </div>
          <Skeleton h={180} r={16} />
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
          <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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
                ТЕЛЕМЕТРИЯ РАСХОДОВ · ДИАГНОСТИКА · РЕКОМЕНДАЦИИ
              </p>
            </div>
            <PeriodTabs active={period} onChange={handlePeriod} />
          </motion.div>

          {/* ── Hero Card ── */}
          <motion.div variants={fadeUp}>
            <HudPanel glowing accent="#00d4aa">
              <ScanLine />

              {/* Particle stars */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: i % 2 === 0 ? 1.5 : 1,
                    height: i % 2 === 0 ? 1.5 : 1,
                    borderRadius: '50%',
                    background: 'rgba(200,214,229,0.15)',
                    top: `${15 + (i * 13) % 70}%`,
                    left: `${5 + (i * 17) % 90}%`,
                    animation: `drift ${18 + i * 4}s ease-in-out infinite alternate`,
                    animationDelay: `${i * -3}s`,
                  }} />
                ))}
              </div>

              <div style={{ padding: '24px 28px', position: 'relative', zIndex: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(200,214,229,0.3)', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Потрачено за период
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 800, color: '#e2e8f0', lineHeight: 1,
                        textShadow: '0 0 20px rgba(226,232,240,0.1)',
                      }}>
                        ₽<CountUp end={overview?.periodTotal ?? 0} duration={1.4} separator=" " useEasing />
                      </span>
                      {overview && overview.trend.changePct !== 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                          <TrendSparkline data={periods} color={trendUp ? '#ef4444' : '#00d4aa'} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                    {heroStats.map((stat, i) => (
                      <motion.div key={stat.label}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.15 }}
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

          <div style={{ height: 16 }} />

          {/* ── Budget Radar ── */}
          {overview && (
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <BudgetRadarSection overview={overview} categories={categories} recommendations={recommendations} />
            </motion.div>
          )}

          {/* ── Donut + Category Accordion ── */}
          <motion.div variants={fadeUp}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            className="analytics-grid-2">
            <div>
              <HudPanel accent="#0ea5e9">
                <div style={{ padding: '20px 22px' }}>
                  <SectionLabel icon={<OrbitIcon size={14} />}>Категории</SectionLabel>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.2)', marginBottom: 8, letterSpacing: '0.08em' }}>
                    НАЖМИТЕ НА СЕКТОР ДЛЯ ДЕТАЛИЗАЦИИ
                  </p>
                  {chartLoading ? <Skeleton h={260} r={110} /> : (
                    <InteractiveDonut
                      data={categories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                    />
                  )}
                </div>
              </HudPanel>

              {/* Donut expansion panel */}
              <AnimatePresence>
                {selectedCategory && (
                  <DonutExpansionPanel
                    category={selectedCategory}
                    services={services}
                    color={categories.find(c => c.category === selectedCategory)?.color ?? '#00d4aa'}
                    onClose={() => setSelectedCategory(null)}
                  />
                )}
              </AnimatePresence>
            </div>

            <HudPanel accent="#a78bfa">
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
                <SectionLabel icon={<TelemetryIcon size={14} />}>Распределение</SectionLabel>
                {chartLoading
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{[...Array(5)].map((_, i) => <Skeleton key={i} h={34} r={6} />)}</div>
                  : <CategoryAccordion
                      data={categories}
                      services={services}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                    />
                }
              </div>
            </HudPanel>
          </motion.div>

          {/* ── Area Chart with dual trace ── */}
          <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
            <HudPanel accent="#00d4aa">
              <div style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SectionLabel icon={<DataFlowIcon size={14} />}>Динамика расходов</SectionLabel>
                  {!chartLoading && periods.some((p) => p.total > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 16, height: 2, background: '#00d4aa', borderRadius: 1 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.3)' }}>Расходы</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 16, height: 2, background: '#0ea5e9', borderRadius: 1, opacity: 0.5 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.3)' }}>Среднее</span>
                      </div>
                    </div>
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
                    <AreaChart data={periodsWithAvg} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
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
                      <Line type="monotone" dataKey="movingAvg" stroke="#0ea5e9" strokeWidth={1.5}
                        strokeDasharray="6 4" dot={false} strokeOpacity={0.4}
                        animationDuration={1400} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </HudPanel>
          </motion.div>

          {/* ── Bar Chart with rankings ── */}
          {rankedServices.length > 0 && (
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <HudPanel accent="#0ea5e9">
                <div style={{ padding: '20px 22px' }}>
                  <SectionLabel icon={<SignalTowerIcon size={14} />}>Топ сервисов по стоимости</SectionLabel>
                  {chartLoading ? <Skeleton h={rankedServices.length * 42} r={8} /> : (
                    <ResponsiveContainer width="100%" height={Math.max(200, Math.min(rankedServices.length, 10) * 44)}>
                      <BarChart data={rankedServices.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                        <defs>
                          {rankedServices.slice(0, 10).map((s) => (
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
                        <YAxis type="category" dataKey="merchant" width={110}
                          tick={(props: Record<string, unknown>) => {
                            const x = Number(props.x ?? 0);
                            const y = Number(props.y ?? 0);
                            const payload = props.payload as { value: string } | undefined;
                            if (!payload) return <g />;
                            const svc = rankedServices.find(s => s.merchant === payload.value);
                            const rank = svc?.rank ?? 0;
                            const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '';
                            return (
                              <g transform={`translate(${x},${y})`}>
                                {rank <= 3 && (
                                  <circle cx={-105} cy={0} r={8} fill={`${medalColor}20`} stroke={medalColor} strokeWidth={1} />
                                )}
                                {rank <= 3 && (
                                  <text x={-105} y={1} textAnchor="middle" dominantBaseline="central"
                                    fill={medalColor} fontSize={8} fontFamily="var(--font-mono)" fontWeight={700}>
                                    #{rank}
                                  </text>
                                )}
                                <text x={rank <= 3 ? -92 : -105} y={0} textAnchor="start" dominantBaseline="central"
                                  fill="rgba(200,214,229,0.6)" fontSize={12} fontFamily="var(--font-body)">
                                  {payload.value.length > 12 ? payload.value.slice(0, 12) + '...' : payload.value}
                                </text>
                              </g>
                            );
                          }}
                          axisLine={false} tickLine={false} />
                        <Tooltip content={<GlassTooltip />} />
                        <Bar dataKey="monthlyAmount" radius={[0, 6, 6, 0]} animationDuration={1000}
                          filter="url(#barGlow)">
                          {rankedServices.slice(0, 10).map((s) => (
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

              {/* Total savings counter */}
              {recommendations.length > 0 && (
                <HudPanel accent="#00d4aa" className="mb-3">
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: '#00d4aa', lineHeight: 1,
                        textShadow: '0 0 12px rgba(0,212,170,0.3)',
                      }}>
                        −₽<CountUp end={Math.round(totalSavings)} duration={1.4} separator=" " useEasing />
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(200,214,229,0.3)', marginTop: 4, letterSpacing: '0.05em' }}>
                        ПОТЕНЦИАЛЬНАЯ ЭКОНОМИЯ В ГОД
                      </p>
                    </div>
                    <span style={{ color: '#00d4aa', opacity: 0.4 }}><SparkleIcon size={24} /></span>
                  </div>
                </HudPanel>
              )}

              {recommendations.length === 0 ? (
                <HudPanel accent="#00d4aa">
                  <div style={{ padding: '28px', textAlign: 'center' }}>
                    <span style={{ color: '#00d4aa', opacity: 0.6 }}><SparkleIcon size={28} /></span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.4)', marginTop: 10 }}>
                      Все отлично — замечаний нет
                    </p>
                  </div>
                </HudPanel>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations.slice(0, 5).map((rec, i) => {
                    const cfg = RECO_COLORS[rec.type];
                    const Icon = RECO_ICONS[rec.type];
                    const isHighPriority = rec.priority === 'HIGH';
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
                        {/* Top accent */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                          background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)`,
                        }} />

                        {/* Priority left border */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
                          background: `linear-gradient(180deg, ${cfg.text}80, ${cfg.text}10)`,
                          animation: isHighPriority ? 'alarm-pulse 1.5s ease-in-out infinite' : 'none',
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

              {scores.length > 0 && (
                <ScoreFilterTabs active={scoreFilter} onChange={setScoreFilter} />
              )}

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
                  <AnimatePresence mode="popLayout">
                    {filteredScores.slice(0, 6).map((sc, i) => (
                      <motion.div key={sc.subscriptionId}
                        layout
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}>
                        <ScoreGauge {...sc} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {filteredScores.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(200,214,229,0.3)', textAlign: 'center', padding: 20 }}>
                      Нет подписок в этой категории
                    </p>
                  )}
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
        @keyframes spin-slow {
          from { transform-origin: center; transform: rotate(0deg); }
          to { transform-origin: center; transform: rotate(360deg); }
        }
        @keyframes drift {
          0% { transform: translate(0, 0); opacity: 0.08; }
          50% { opacity: 0.18; }
          100% { transform: translate(20px, -15px); opacity: 0.05; }
        }
        @keyframes alarm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes live-pulse {
          0%, 100% { r: 4; opacity: 0.8; }
          50% { r: 7; opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .analytics-grid-2 { grid-template-columns: 1fr !important; }
          .analytics-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .analytics-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .analytics-grid-2 { grid-template-columns: 1fr !important; }
          .analytics-grid-3 { grid-template-columns: 1fr !important; }
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
