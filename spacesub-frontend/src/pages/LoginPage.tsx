import { API_BASE } from "../services/api";

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/yandex`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="starfield" />

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Logo */}
        <div className="mb-2">
          <span className="text-6xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
            SpaceSub
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg mb-12 tracking-wide">
          Орбита ваших подписок
        </p>

        {/* Login card */}
        <div className="glass rounded-2xl p-8 glow-purple">
          <p className="text-gray-300 text-sm mb-6">
            Войдите, чтобы управлять подписками из единого центра
          </p>

          <button
            onClick={handleLogin}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-purple-600 to-blue-600
                       hover:from-purple-500 hover:to-blue-500
                       transition-all duration-300
                       glow-purple-strong hover:scale-[1.02]
                       cursor-pointer"
          >
            Войти через Яндекс
          </button>
        </div>

        {/* Footer accent */}
        <div className="mt-16 flex items-center justify-center gap-2 text-gray-600 text-xs">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-purple-800" />
          <span>Subscription Aggregator</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-blue-800" />
        </div>
      </div>
    </div>
  );
}
