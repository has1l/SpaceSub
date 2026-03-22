import { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Starfield } from './Starfield';
import { SatelliteIcon } from './SatelliteIcon';
import api from '../services/api';

/* ── Icons ── */

function DashboardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function SubscriptionsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="2" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function AnalyticsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12 L4 8 L7 10 L10 5 L13 7 L15 3" />
      <path d="M1 14 L15 14" />
    </svg>
  );
}

function ForecastIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 1.5L10 11l-2.7-6L1 7.5" />
      <path d="M14.5 1.5L7.3 8.5" opacity="0.5" />
    </svg>
  );
}

function ConnectIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M6.67 8.67a3.33 3.33 0 005.03.36l2-2a3.33 3.33 0 00-4.71-4.71L8.14 3.17" />
      <path d="M9.33 7.33a3.33 3.33 0 00-5.03-.36l-2 2a3.33 3.33 0 004.71 4.71l.84-.84" />
    </svg>
  );
}

function BellNavIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.33A4 4 0 0 0 4 5.33c0 4.67-2 6-2 6h12s-2-1.33-2-6" />
      <path d="M9.15 14a1.33 1.33 0 0 1-2.3 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

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
      <BellNavIcon size={16} />
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
                <NavLink to="/dashboard" icon={<DashboardIcon />}>Панель</NavLink>
                <NavLink to="/subscriptions" icon={<SubscriptionsIcon />}>Подписки</NavLink>
                <NavLink to="/analytics" icon={<AnalyticsIcon />}>Аналитика</NavLink>
                <NavLink to="/forecast" icon={<ForecastIcon />}>Прогноз</NavLink>
                <NavLink to="/connect-flex" icon={<ConnectIcon />}>Подключение</NavLink>
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
                <LogoutIcon />
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
                <BellNavIcon size={16} />
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
                <LogoutIcon />
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
            <BottomNavItem to="/dashboard" label="Панель" icon={<DashboardIcon size={20} />} />
            <BottomNavItem to="/subscriptions" label="Подписки" icon={<SubscriptionsIcon size={20} />} />
            <BottomNavItem to="/analytics" label="Аналитика" icon={<AnalyticsIcon size={20} />} />
            <BottomNavItem to="/forecast" label="Прогноз" icon={<ForecastIcon size={20} />} />
            <BottomNavItem to="/notifications" label="Сигналы" icon={<BellNavIcon size={20} />} badge={unreadCount} />
          </nav>
        )}
      </div>
    </>
  );
}
