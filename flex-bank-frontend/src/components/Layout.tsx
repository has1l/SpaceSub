import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCursorGlow } from '../hooks/useCursorGlow';
import CosmicBackground from './CosmicBackground';

const navItems = [
  { to: '/dashboard', label: 'Главная', icon: IconDashboard },
  { to: '/transactions', label: 'Операции', icon: IconTransactions },
  { to: '/analytics', label: 'Аналитика', icon: IconAnalytics },
  { to: '/connect', label: 'Код', icon: IconConnect },
];

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  useCursorGlow();

  return (
    <div className="min-h-svh">
      <CosmicBackground />

      {/* Desktop Sidebar */}
      <nav className="sidebar-nav fixed left-0 top-0 bottom-0 w-[72px] flex-col items-center py-6 z-50 border-r"
           style={{ background: 'var(--color-surface-primary)', borderColor: 'var(--color-border-subtle)' }}>
        <NavLink to="/dashboard" className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-display"
               style={{ background: 'rgba(212, 168, 83, 0.1)', color: 'var(--color-accent-gold)' }}>
            F
          </div>
        </NavLink>

        <div className="flex flex-col items-center gap-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive ? 'text-accent-blue' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-interactive'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(59, 111, 232, 0.1)' } : {}
              }
              title={item.label}
            >
              <item.icon size={18} />
            </NavLink>
          ))}
        </div>

        <button
          onClick={logout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-tertiary hover:text-accent-red transition-colors duration-200 cursor-pointer"
          title="Выйти"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </nav>

      {/* Mobile Header */}
      <div className="mobile-header items-center justify-between px-4 pt-3 pb-2 relative z-10">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-display"
               style={{ background: 'rgba(212, 168, 83, 0.1)', color: 'var(--color-accent-gold)' }}>
            F
          </div>
          <span className="text-sm font-bold font-display gradient-text-gold">
            Flex Банк
          </span>
        </NavLink>
        <button onClick={logout} className="p-2 rounded-lg cursor-pointer text-text-tertiary hover:text-accent-red transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <main className="main-content max-w-5xl mx-auto px-4 py-4 relative z-10 lg:px-8">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* --- Nav Icons --- */
function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconTransactions({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconAnalytics({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function IconConnect({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
