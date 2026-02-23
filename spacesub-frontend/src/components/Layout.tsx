import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const { token, logout } = useAuth();

  return (
    <>
      <div className="starfield" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {token && (
          <nav className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between">
            <Link
              to="/dashboard"
              className="text-lg font-bold tracking-wide bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
            >
              SpaceSub
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Выйти
            </button>
          </nav>
        )}

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </>
  );
}
