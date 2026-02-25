import { useState } from "react";
import api from "../services/api";

export function ConnectFlex() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth error in URL
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get("error");

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ url: string }>(
        "/bank-integration/flex/oauth",
      );
      window.location.href = data.url;
    } catch {
      setError("Не удалось инициировать подключение банка.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
        Подключить Flex Bank
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Авторизуйтесь через Яндекс, чтобы связать банковский аккаунт со
        SpaceSub. Токен банка будет зашифрован и сохранён на сервере.
      </p>

      {(error || oauthError) && (
        <div className="glass rounded-xl p-4 mb-6 border border-red-500/30 text-red-400 text-sm">
          {error || "Не удалось подключить банк. Попробуйте снова."}
        </div>
      )}

      <div className="glass rounded-2xl p-8 glow-purple text-center">
        <div className="text-5xl mb-4">🏦</div>
        <p className="text-gray-400 text-sm mb-6">
          После нажатия вы будете перенаправлены на Яндекс для авторизации в Flex
          Bank. Затем вернётесь на панель управления.
        </p>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-purple-600 to-blue-600
                     hover:from-purple-500 hover:to-blue-500
                     transition-all duration-300 glow-purple-strong
                     hover:scale-[1.02]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:scale-100
                     cursor-pointer"
        >
          {loading ? "Перенаправление..." : "Подключить через Яндекс"}
        </button>
      </div>
    </div>
  );
}
