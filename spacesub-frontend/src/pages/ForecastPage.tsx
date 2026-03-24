import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import api from '../services/api';

/* ── Types ── */

interface TimelineEntry {
  merchant: string;
  amount: number;
  chargeDate: string;
  periodType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

interface ForecastResponse {
  next7DaysTotal: number;
  next30DaysTotal: number;
  next12MonthsTotal: number;
  upcomingTimeline: TimelineEntry[];
}

/* ── Helpers ── */

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  YEARLY: 'Ежегодно',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

import {
  PaperAirplaneIcon,
  CalendarDaysIcon,
  RocketLaunchIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

/* ── Animations ── */

const stagger = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

/* ── HUD Components ── */

function HudCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const transforms: Record<string, string> = {
    tl: '', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1)',
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{
        position: 'absolute',
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

function HudPanel({ children, accent = '#00d4aa', glowing = false }: {
  children: React.ReactNode; accent?: string; glowing?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 14,
        background: 'rgba(6,16,30,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid rgba(${accent === '#F59E0B' ? '245,158,11' : accent === '#0EA5E9' ? '14,165,233' : '0,212,170'},0.15)`,
        padding: '20px',
        boxShadow: glowing ? `0 0 30px rgba(${accent === '#F59E0B' ? '245,158,11' : accent === '#0EA5E9' ? '14,165,233' : '0,212,170'},0.06)` : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 10%, ${accent}50 50%, transparent 90%)`,
      }} />
      <HudCorner position="tl" />
      <HudCorner position="tr" />
      <HudCorner position="bl" />
      <HudCorner position="br" />
      <ScanLine />
      {children}
    </div>
  );
}

/* ── Skeleton ── */

function Skeleton({ width = '100%', height = 20 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width, height, borderRadius: 8,
        background: 'linear-gradient(90deg, rgba(200,214,229,0.03) 25%, rgba(200,214,229,0.08) 50%, rgba(200,214,229,0.03) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

function ForecastSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
      <Skeleton width={180} height={32} />
      <div style={{ height: 8 }} />
      <Skeleton width={140} height={16} />
      <div style={{ height: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <Skeleton height={110} />
        <Skeleton height={110} />
        <Skeleton height={110} />
      </div>
      <div style={{ height: 32 }} />
      <Skeleton width={200} height={20} />
      <div style={{ height: 16 }} />
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ marginBottom: 12 }}>
          <Skeleton height={72} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

/* ── Metric Card ── */

function MetricCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <HudPanel accent={color} glowing={value > 0}>
        <div className="flex items-center gap-2 mb-3">
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color,
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              color: `${color}99`, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700,
            color: '#E8EDF2',
            textShadow: `0 0 20px ${color}30`,
          }}
        >
          <CountUp end={value} duration={1.4} separator=" " decimals={0} /> ₽
        </div>
      </HudPanel>
    </motion.div>
  );
}

/* ── Timeline Node ── */

function TimelineNode({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const days = daysUntil(entry.chargeDate);
  const isUrgent = days <= 3;
  const nodeColor = isUrgent ? '#EF4444' : '#00D4AA';

  return (
    <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16 }}>
      {/* Vertical line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: `${nodeColor}25`,
          border: `2px solid ${nodeColor}`,
          boxShadow: `0 0 10px ${nodeColor}40`,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            position: 'absolute', top: 3, left: 3, width: 4, height: 4,
            borderRadius: '50%', background: nodeColor,
          }} />
        </div>
        {!isLast && (
          <div style={{
            width: 1, flex: 1, minHeight: 40,
            background: `linear-gradient(to bottom, ${nodeColor}40, rgba(0,212,170,0.05))`,
          }} />
        )}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1, marginBottom: isLast ? 0 : 8,
          borderRadius: 12,
          background: 'rgba(6,16,30,0.5)',
          border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(0,212,170,0.08)'}`,
          padding: '14px 16px',
          transition: 'border-color 0.3s',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{
                fontSize: 14, fontWeight: 600, color: '#E8EDF2',
              }}>
                {entry.merchant}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: isUrgent ? 'rgba(239,68,68,0.7)' : 'rgba(0,212,170,0.5)',
                background: isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(0,212,170,0.06)',
                padding: '2px 7px', borderRadius: 6,
                textTransform: 'uppercase', letterSpacing: '0.03em',
              }}>
                {PERIOD_LABELS[entry.periodType] || entry.periodType}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <CalendarDaysIcon className="w-[11px] h-[11px]" />
              <span style={{
                fontSize: 12, fontFamily: 'var(--font-mono)',
                color: 'rgba(200,214,229,0.4)',
              }}>
                {formatDate(entry.chargeDate)}
              </span>
              {days >= 0 && (
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: isUrgent ? 'rgba(239,68,68,0.6)' : 'rgba(200,214,229,0.25)',
                  marginLeft: 4,
                }}>
                  {days === 0 ? 'сегодня' : days === 1 ? 'завтра' : `через ${days} дн`}
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
            color: '#E8EDF2', whiteSpace: 'nowrap',
            textShadow: isUrgent ? '0 0 12px rgba(239,68,68,0.3)' : '0 0 12px rgba(0,212,170,0.15)',
          }}>
            {formatAmount(entry.amount)} ₽
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <motion.div
      variants={fadeUp}
      style={{
        borderRadius: 16,
        background: 'rgba(6,16,30,0.5)',
        border: '1px solid rgba(200,214,229,0.06)',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(200,214,229,0.03)',
        margin: '0 auto 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PaperAirplaneIcon className="w-7 h-7" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(200,214,229,0.4)', fontFamily: 'var(--font-display)' }}>
        Нет данных для прогноза
      </p>
      <p style={{ fontSize: 12, color: 'rgba(200,214,229,0.2)', marginTop: 8 }}>
        Подключите банк и дождитесь обнаружения подписок, чтобы увидеть прогноз расходов
      </p>
    </motion.div>
  );
}

/* ── Page ── */

export function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    try {
      const { data } = await api.get<ForecastResponse>('/forecast');
      setForecast(data);
    } catch {
      setError('Не удалось загрузить прогноз');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading) return <ForecastSkeleton />;

  const hasData = forecast && (forecast.next7DaysTotal > 0 || forecast.next30DaysTotal > 0 || forecast.upcomingTimeline.length > 0);

  return (
    <motion.div
      className="max-w-3xl mx-auto px-4 py-6 sm:px-6"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(14,165,233,0.12))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#00D4AA',
          }}>
            <PaperAirplaneIcon className="w-[22px] h-[22px]" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-gradient-signal"
              style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}
            >
              Прогноз
            </h1>
            <p style={{
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: 'rgba(200,214,229,0.35)', marginTop: 2,
              letterSpacing: '0.02em',
            }}>
              Траектория расходов
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          variants={fadeUp}
          style={{
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            color: 'rgba(239,68,68,0.7)',
            fontSize: 13, fontWeight: 500,
          }}
        >
          {error}
        </motion.div>
      )}

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}>
            <MetricCard
              label="7 дней"
              value={forecast!.next7DaysTotal}
              icon={<ClockIcon className="w-4 h-4" />}
              color="#00D4AA"
            />
            <MetricCard
              label="30 дней"
              value={forecast!.next30DaysTotal}
              icon={<RocketLaunchIcon className="w-4 h-4" />}
              color="#0EA5E9"
            />
            <MetricCard
              label="12 месяцев"
              value={forecast!.next12MonthsTotal}
              icon={<CalendarDaysIcon className="w-4 h-4" />}
              color="#F59E0B"
            />
          </div>

          {/* Timeline Section */}
          {forecast!.upcomingTimeline.length > 0 && (
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(0,212,170,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#00D4AA',
                }}>
                  <ClockIcon className="w-3.5 h-3.5" />
                </div>
                <span style={{
                  fontSize: 15, fontWeight: 600,
                  color: '#E8EDF2',
                  fontFamily: 'var(--font-display)',
                }}>
                  Хронология списаний
                </span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'rgba(200,214,229,0.25)',
                  marginLeft: 4,
                }}>
                  ближайшие 30 дней
                </span>
              </div>

              <motion.div variants={stagger} initial="initial" animate="animate">
                {forecast!.upcomingTimeline.map((entry, i) => (
                  <TimelineNode
                    key={`${entry.merchant}-${entry.chargeDate}`}
                    entry={entry}
                    isLast={i === forecast!.upcomingTimeline.length - 1}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
