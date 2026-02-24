import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export function ConnectFlex() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.post("/bank-integration/flex/connect", {
        accessToken: accessToken.trim(),
      });
      navigate("/dashboard");
    } catch {
      setError("Не удалось подключить банк. Проверьте токен.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
        Подключить Flex Bank
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Введите токен доступа, чтобы вывести спутник на орбиту
      </p>

      <div className="glass rounded-xl p-4 mb-6 text-sm text-gray-400 border border-white/5">
        <p className="mb-2">
          Токен Flex Bank — это JWT из Flex Bank (mock-bank).
          Войдите в Flex Bank, затем скопируйте значение{" "}
          <code className="text-purple-300 bg-white/5 px-1 rounded">
            flexbank_token
          </code>{" "}
          из localStorage браузера.
        </p>
        <div className="flex gap-3 mt-3">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline text-xs"
          >
            Flex Bank UI
          </a>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            Flex Bank API Docs
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 glow-purple">
        <label className="block text-sm text-gray-400 mb-2" htmlFor="token">
          Access Token
        </label>
        <input
          id="token"
          type="text"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Вставьте токен Flex Bank"
          className="w-full rounded-xl px-4 py-3 text-sm mb-5"
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !accessToken.trim()}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-purple-600 to-blue-600
                     hover:from-purple-500 hover:to-blue-500
                     transition-all duration-300 glow-purple-strong
                     hover:scale-[1.02]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:scale-100
                     cursor-pointer"
        >
          {loading ? "Запуск..." : "Запустить в орбиту"}
        </button>
      </form>
    </div>
  );
}
