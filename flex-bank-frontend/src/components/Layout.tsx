import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCursorGlow } from '../hooks/useCursorGlow';
import CosmicBackground from './CosmicBackground';

const navItems = [
  { to: '/dashboard', label: 'Главная', icon: NavIconDashboard },
  { to: '/transactions', label: 'Операции', icon: NavIconTransactions },
  { to: '/analytics', label: 'Аналитика', icon: NavIconAnalytics },
  { to: '/connect', label: 'Код', icon: NavIconConnect },
];

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  useCursorGlow();

  return (
    <div className="min-h-svh">
      <CosmicBackground />

      {/* Desktop Navigation — hidden on mobile via CSS */}
      <nav className="top-nav sticky top-0 z-50 border-b"
           style={{
             background: 'rgba(5, 5, 16, 0.75)',
             backdropFilter: 'blur(24px) saturate(1.2)',
             borderColor: 'rgba(79, 124, 255, 0.06)',
           }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                   style={{ background: 'linear-gradient(135deg, #4F7CFF, #7B61FF)', fontFamily: 'var(--font-display)' }}>
                F
              </div>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{ boxShadow: '0 0 20px rgba(79, 124, 255, 0.4)' }} />
            </div>
            <span className="text-lg font-display font-bold gradient-text-cosmic tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}>
              Flex Банк
            </span>
          </NavLink>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    isActive
                      ? 'text-text-stellar'
                      : 'text-text-void hover:text-text-nebula'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'rgba(79, 124, 255, 0.1)',
                        boxShadow: 'inset 0 1px 0 rgba(79, 124, 255, 0.1)',
                      }
                    : {}
                }
              >
                <item.icon />
                <span style={{ fontFamily: 'var(--font-body)' }}>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <button
            onClick={logout}
            className="text-text-void hover:text-aurora-red transition-colors duration-300 text-sm cursor-pointer flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Выйти
          </button>
        </div>
      </nav>

      {/* Mobile header — visible on mobile via CSS */}
      <div className="mobile-header items-center justify-between px-4 pt-3 pb-2 relative z-10">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
               style={{ background: 'linear-gradient(135deg, #4F7CFF, #7B61FF)', fontFamily: 'var(--font-display)' }}>
            F
          </div>
          <span className="text-sm font-bold gradient-text-cosmic"
                style={{ fontFamily: 'var(--font-display)' }}>
            Flex Банк
          </span>
        </NavLink>
        <button
          onClick={logout}
          className="p-2 rounded-lg cursor-pointer text-text-void"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Content — bottom padding for mobile nav via CSS */}
      <main className="main-content max-w-[1200px] mx-auto px-4 py-4 relative z-10">
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

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
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
function NavIconDashboard({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function NavIconTransactions({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function NavIconAnalytics({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function NavIconConnect({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
