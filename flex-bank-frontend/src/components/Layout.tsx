import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
              F
            </div>
            <span className="text-lg font-semibold text-white">Flex Bank</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Счета
            </Link>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 transition-colors text-sm cursor-pointer"
            >
              Выйти
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
