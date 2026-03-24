import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { SatelliteIcon } from '../components/SatelliteIcon';
import { OrbitDecoration } from '../components/OrbitDecoration';

interface BankConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; dotClass: string; color: string }> = {
  CONNECTED: { label: 'На орбите', dotClass: 'status-dot-active', color: 'var(--signal-primary)' },
  EXPIRED: { label: 'Сигнал потерян', dotClass: 'status-dot-warn', color: 'var(--signal-warn)' },
  ERROR: { label: 'Авария', dotClass: 'status-dot-danger', color: 'var(--signal-danger)' },
  DISCONNECTED: { label: 'Отключён', dotClass: 'status-dot-dim', color: 'rgba(200,214,229,0.4)' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Dashboard() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [bankJustConnected, setBankJustConnected] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const { data } = await api.get<BankConnection[]>('/bank-integration/connections');
      setConnections(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bank_connected') === 'true') {
      setBankJustConnected(true);
      window.history.replaceState({}, '', '/dashboard');
    }
    fetchConnections();
  }, [fetchConnections]);

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    setSyncResult(null);
    try {
      const { data } = await api.post<{ ok: boolean; imported: number; accounts: number }>(
        '/bank-integration/flex/sync',
        {},
      );
      setSyncResult(
        `Синхронизация завершена: импортировано ${data.imported} транзакций из ${data.accounts} счетов`,
      );
      await fetchConnections();
    } catch {
      setSyncResult('Ошибка синхронизации');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <Spinner className="min-h-[60vh]" text="Сканирование орбиты..." />;
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-4 md:py-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 md:mb-10">
        <div>
          <h1
            className="text-2xl md:text-3xl font-extrabold text-gradient-signal mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Центр управления
          </h1>
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.4)' }}
          >
            Управляйте банковскими спутниками и синхронизацией
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link to="/connect-flex" className="btn-signal text-sm">
            <SatelliteIcon size={16} color="var(--void)" />
            Подключить спутник
          </Link>
        </motion.div>
      </motion.div>

      {/* Bank connected banner */}
      <AnimatePresence>
        {bankJustConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="station-panel px-5 py-3.5 mb-6 flex items-center gap-3"
            style={{ borderColor: 'rgba(0,212,170,0.2)' }}
          >
            <div className="status-dot status-dot-active" />
            <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--signal-primary)' }}>
              Flex Bank успешно подключён! Синхронизируйте транзакции для обнаружения подписок.
            </p>
            <button
              onClick={() => setBankJustConnected(false)}
              className="ml-auto text-xs cursor-pointer"
              style={{ color: 'rgba(200,214,229,0.3)' }}
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync result */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="station-panel px-5 py-3.5 mb-6 flex items-center gap-3"
            style={{
              borderColor: syncResult.includes('Ошибка')
                ? 'rgba(239,68,68,0.2)'
                : 'rgba(14,165,233,0.2)',
            }}
          >
            <p className="text-sm" style={{
              fontFamily: 'var(--font-body)',
              color: syncResult.includes('Ошибка') ? 'var(--signal-danger)' : 'var(--signal-secondary)',
            }}>
              {syncResult}
            </p>
            <button
              onClick={() => setSyncResult(null)}
              className="ml-auto text-xs cursor-pointer"
              style={{ color: 'rgba(200,214,229,0.3)' }}
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {connections.length === 0 && (
        <motion.div
          variants={fadeUp}
          className="station-panel station-panel-glow p-8 md:p-16 text-center relative overflow-hidden"
        >
          <OrbitDecoration className="opacity-40" />

          {/* Empty illustration */}
          <motion.svg
            width="80" height="80" viewBox="0 0 80 80" fill="none"
            className="mx-auto mb-6"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <circle cx="40" cy="40" r="30" stroke="rgba(0,212,170,0.1)" strokeWidth="1" />
            <circle cx="40" cy="40" r="20" stroke="rgba(0,212,170,0.07)" strokeWidth="1" />
            <circle cx="40" cy="40" r="10" stroke="rgba(0,212,170,0.05)" strokeWidth="1" />
            <circle cx="40" cy="40" r="3" fill="var(--signal-primary)" opacity="0.4">
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Satellite on orbit */}
            <circle cx="40" cy="10" r="2" fill="var(--signal-primary)" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="8s" repeatCount="indefinite" />
            </circle>
          </motion.svg>

          <p
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(200,214,229,0.7)' }}
          >
            Нет подключённых спутников
          </p>
          <p className="text-sm mb-6" style={{ color: 'rgba(200,214,229,0.3)' }}>
            Подключите банк, чтобы начать мониторинг подписок
          </p>
          <Link to="/connect-flex" className="btn-signal text-sm">
            Подключить Flex Bank
          </Link>
        </motion.div>
      )}

      {/* Connection cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        {connections.map((conn, i) => {
          const status = STATUS_MAP[conn.status] ?? {
            label: conn.status,
            dotClass: 'status-dot-dim',
            color: 'rgba(200,214,229,0.4)',
          };

          return (
            <motion.div
              key={conn.id}
              variants={fadeUp}
              className="station-panel station-panel-glow p-4 md:p-6 relative overflow-hidden group"
            >
              {/* Scan line on hover */}
              <div
                className="absolute left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.25), transparent)',
                  top: 0,
                }}
              />

              {/* Orbit decoration */}
              <div className="absolute -top-8 -right-8 pointer-events-none">
                <motion.div
                  className="orbit-ring"
                  style={{ width: 100, height: 100, opacity: 0.3 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
                >
                  <div style={{
                    position: 'absolute', top: -1.5, left: '50%', marginLeft: -1.5,
                    width: 3, height: 3, borderRadius: '50%',
                    background: status.color,
                    boxShadow: `0 0 6px ${status.color}`,
                  }} />
                </motion.div>
              </div>

              {/* Provider + Status */}
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,212,170,0.08)' }}
                  >
                    <SatelliteIcon size={18} color="var(--signal-primary)" />
                  </div>
                  <span
                    className="font-semibold tracking-wide"
                    style={{ fontFamily: 'var(--font-display)', color: '#e2e8f0' }}
                  >
                    {conn.provider}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`status-dot ${status.dotClass}`} />
                  <span
                    className="text-xs font-medium"
                    style={{ fontFamily: 'var(--font-mono)', color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-2 mb-5">
                {[
                  { label: 'Последняя синхронизация', value: formatDate(conn.lastSyncAt) },
                  { label: 'Подключён', value: formatDate(conn.createdAt) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(200,214,229,0.35)' }}>
                      {item.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.6)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sync button */}
              <motion.button
                onClick={() => handleSync(conn.id)}
                disabled={syncing === conn.id}
                className="btn-ghost w-full text-sm"
                whileTap={{ scale: 0.98 }}
              >
                {syncing === conn.id ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'inline-block', width: 14, height: 14 }}
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                    </motion.span>
                    Синхронизация...
                  </span>
                ) : (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Синхронизировать
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
