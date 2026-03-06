import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Starfield } from './Starfield';
import { SatelliteIcon } from './SatelliteIcon';

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

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function SubscriptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="2" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function Layout() {
  const { token, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      <Starfield />

      <div className="relative z-10 min-h-screen flex flex-col">
        {token && (
          <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
            className="station-panel mx-4 mt-3 px-5 py-2.5 flex items-center justify-between"
            style={{ borderRadius: 14, background: 'rgba(6,16,30,0.85)' }}
          >
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <SatelliteIcon size={20} color="var(--signal-primary)" />
                <span
                  className="text-base font-bold tracking-wide text-gradient-signal"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  SpaceSub
                </span>
              </Link>

              {/* Nav links */}
              <div className="flex items-center gap-1">
                <NavLink to="/dashboard" icon={<DashboardIcon />}>
                  Панель
                </NavLink>
                <NavLink to="/subscriptions" icon={<SubscriptionsIcon />}>
                  Подписки
                </NavLink>
              </div>
            </div>

            {/* Right side */}
            <button
              onClick={logout}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer"
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
              Выйти
            </button>
          </motion.nav>
        )}

        <main className="flex-1">
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
      </div>
    </>
  );
}
