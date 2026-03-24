import { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Squares2X2Icon,
  SignalIcon,
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
  LinkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { Starfield } from './Starfield';
import { SatelliteIcon } from './SatelliteIcon';
import api from '../services/api';

/* ── Desktop NavLink ── */

function NavLink({ to, children, icon }: { to: string; children: React.ReactNode; icon: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300"
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--signal-primary)' : 'rgba(200,214,229,0.5)',
        background: active ? 'rgba(0,212,170,0.06)' : 'transparent',
      }}
    >
      {icon}
      {children}
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute bottom-0 left-3 right-3 h-px"
          style={{ background: 'var(--signal-primary)', boxShadow: '0 0 8px rgba(0,212,170,0.4)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  );
}

/* ── Bottom Nav Item (mobile) ── */

function BottomNavItem({ to, label, icon, badge }: { to: string; label: string; icon: React.ReactNode; badge?: number }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link to={to} className={`bottom-nav-item ${active ? 'active' : ''}`} style={{ position: 'relative' }}>
      <span style={{ position: 'relative' }}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 14,
              height: 14,
              borderRadius: 999,
              background: 'var(--signal-danger)',
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}

/* ── Notification Bell (desktop) ── */

function NotificationBell({ count }: { count: number }) {
  const { pathname } = useLocation();
  const active = pathname === '/notifications';

  return (
    <Link
      to="/notifications"
      className="relative flex items-center justify-center rounded-lg transition-all duration-300"
      style={{
        width: 34,
        height: 34,
        color: active ? 'var(--signal-primary)' : count > 0 ? 'var(--signal-primary)' : 'rgba(200,214,229,0.35)',
        background: active ? 'rgba(0,212,170,0.06)' : 'transparent',
      }}
    >
      <BellIcon className="w-4 h-4" />
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            background: 'var(--signal-danger)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/* ── Layout ── */

export function Layout() {
  const { token, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Refresh count when navigating away from notifications page
  useEffect(() => {
    if (location.pathname !== '/notifications') {
      fetchUnreadCount();
    }
  }, [location.pathname, fetchUnreadCount]);

  return (
    <>
      <Starfield />

      <div className="relative z-10 min-h-dvh flex flex-col">
        {/* Desktop top nav — hidden on mobile */}
        {token && (
          <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
            className="top-nav station-panel mx-4 mt-3 px-5 py-2.5 items-center justify-between"
            style={{ borderRadius: 14, background: 'rgba(6,16,30,0.85)' }}
          >
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <SatelliteIcon size={20} color="var(--signal-primary)" />
                <span
                  className="text-base font-bold tracking-wide text-gradient-signal"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  SpaceSub
                </span>
              </Link>

              <div className="flex items-center gap-1">
                <NavLink to="/dashboard" icon={<Squares2X2Icon className="w-4 h-4" />}>Панель</NavLink>
                <NavLink to="/subscriptions" icon={<SignalIcon className="w-4 h-4" />}>Подписки</NavLink>
                <NavLink to="/analytics" icon={<PresentationChartLineIcon className="w-4 h-4" />}>Аналитика</NavLink>
                <NavLink to="/forecast" icon={<ArrowTrendingUpIcon className="w-4 h-4" />}>Прогноз</NavLink>
                <NavLink to="/connect-flex" icon={<LinkIcon className="w-4 h-4" />}>Подключение</NavLink>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell count={unreadCount} />
              <button
                onClick={logout}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'rgba(200,214,229,0.35)',
                  border: '1px solid rgba(200,214,229,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(239,68,68,0.7)';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(200,214,229,0.35)';
                  e.currentTarget.style.borderColor = 'rgba(200,214,229,0.06)';
                }}
              >
                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
                Выйти
              </button>
            </div>
          </motion.nav>
        )}

        {/* Mobile header — visible on mobile only */}
        {token && (
          <div className="mobile-header items-center justify-between px-4 pt-3 pb-2">
            <Link to="/dashboard" className="flex items-center gap-2">
              <SatelliteIcon size={18} color="var(--signal-primary)" />
              <span
                className="text-sm font-bold text-gradient-signal"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SpaceSub
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/notifications"
                className="p-2 rounded-lg"
                style={{
                  position: 'relative',
                  color: unreadCount > 0 ? 'var(--signal-primary)' : 'rgba(200,214,229,0.35)',
                }}
              >
                <BellIcon className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 14,
                      height: 14,
                      borderRadius: 999,
                      background: 'var(--signal-danger)',
                      color: '#fff',
                      fontSize: 8,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-lg cursor-pointer"
                style={{ color: 'rgba(200,214,229,0.35)' }}
              >
                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <main className={`flex-1 ${token ? 'main-with-nav' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom nav */}
        {token && (
          <nav className="bottom-nav">
            <BottomNavItem to="/dashboard" label="Панель" icon={<Squares2X2Icon className="w-5 h-5" />} />
            <BottomNavItem to="/subscriptions" label="Подписки" icon={<SignalIcon className="w-5 h-5" />} />
            <BottomNavItem to="/analytics" label="Аналитика" icon={<PresentationChartLineIcon className="w-5 h-5" />} />
            <BottomNavItem to="/forecast" label="Прогноз" icon={<ArrowTrendingUpIcon className="w-5 h-5" />} />
            <BottomNavItem to="/notifications" label="Сигналы" icon={<BellIcon className="w-5 h-5" />} badge={unreadCount} />
          </nav>
        )}
      </div>
    </>
  );
}
