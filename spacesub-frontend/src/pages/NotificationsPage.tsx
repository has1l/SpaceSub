import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { Spinner } from '../components/Spinner';

/* ── Types ── */

interface AppNotification {
  id: string;
  type: 'BILLING_REMINDER' | 'PRICE_CHANGE' | 'NEW_TRANSACTION' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/* ── Helpers ── */

const TYPE_CONFIG: Record<string, { icon: JSX.Element; color: string }> = {
  BILLING_REMINDER: {
    icon: <BellIcon />,
    color: 'var(--signal-primary)',
  },
  PRICE_CHANGE: {
    icon: <AlertIcon />,
    color: 'var(--signal-warn)',
  },
  NEW_TRANSACTION: {
    icon: <SparklesIcon />,
    color: 'var(--signal-secondary)',
  },
  SYSTEM: {
    icon: <GearIcon />,
    color: 'rgba(200,214,229,0.5)',
  },
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function parseMessage(message: string): string {
  const parts = message.split('|');
  if (parts.length === 3) {
    return `Ожидается списание ${parts[1]} ${parts[2]}`;
  }
  return message;
}

/* ── Icons ── */

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CheckAllIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 7l-8 8-4-4" />
      <path d="M22 7l-8 8" />
    </svg>
  );
}

/* ── Animation ── */

const stagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ── Page ── */

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 py-6 sm:px-6"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-gradient-signal"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Уведомления
          </h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(200,214,229,0.45)' }}>
            {unreadCount > 0
              ? `${unreadCount} непрочитанных`
              : 'Все прочитано'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer"
            style={{
              color: 'var(--signal-primary)',
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.12)',
            }}
          >
            <CheckAllIcon />
            Прочитать все
          </button>
        )}
      </motion.div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <motion.div
          variants={fadeUp}
          className="station-panel p-8 text-center"
          style={{ borderRadius: 16, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(200,214,229,0.04)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(200,214,229,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(200,214,229,0.4)' }}>
            Нет уведомлений
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(200,214,229,0.2)' }}>
            Когда появятся списания по подпискам, вы увидите уведомления здесь
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.SYSTEM;
            return (
              <motion.div
                key={notif.id}
                variants={fadeUp}
                onClick={() => !notif.isRead && markAsRead(notif.id)}
                className="relative transition-all duration-300"
                style={{
                  borderRadius: 14,
                  background: 'var(--glass-bg)',
                  border: `1px solid ${notif.isRead ? 'var(--glass-border)' : 'rgba(0,212,170,0.2)'}`,
                  padding: '16px',
                  cursor: notif.isRead ? 'default' : 'pointer',
                  boxShadow: notif.isRead ? 'none' : '0 0 20px rgba(0,212,170,0.06)',
                }}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: `${config.color}15`,
                      color: config.color,
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm leading-snug"
                        style={{
                          fontWeight: notif.isRead ? 400 : 600,
                          color: notif.isRead ? 'rgba(200,214,229,0.6)' : '#e8edf2',
                        }}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span
                          className="flex-shrink-0 mt-1.5"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--signal-primary)',
                            boxShadow: '0 0 8px rgba(0,212,170,0.5)',
                          }}
                        />
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'rgba(200,214,229,0.4)' }}>
                      {parseMessage(notif.message)}
                    </p>
                    <p
                      className="text-[10px] mt-1.5"
                      style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.25)' }}
                    >
                      {formatRelativeTime(notif.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
