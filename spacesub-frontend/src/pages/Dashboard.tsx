import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Spinner } from "../components/Spinner";

interface BankConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CONNECTED: { label: "На орбите", color: "text-green-400" },
  EXPIRED: { label: "Сигнал потерян", color: "text-yellow-400" },
  ERROR: { label: "Авария", color: "text-red-400" },
  DISCONNECTED: { label: "Отключён", color: "text-gray-500" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Dashboard() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const { data } = await api.get<BankConnection[]>(
        "/bank-integration/connections",
      );
      setConnections(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    setSyncResult(null);
    try {
      await api.post("/bank-integration/flex/sync", {});
      setSyncResult("Синхронизация завершена");
      await fetchConnections();
    } catch {
      setSyncResult("Ошибка синхронизации");
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <Spinner className="min-h-[60vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            Галактика подключений
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Управляйте банковскими спутниками
          </p>
        </div>

        <Link
          to="/connect-flex"
          className="py-2.5 px-5 rounded-xl font-medium text-white text-sm
                     bg-gradient-to-r from-purple-600 to-blue-600
                     hover:from-purple-500 hover:to-blue-500
                     transition-all duration-300 glow-purple
                     hover:scale-[1.02]"
        >
          Подключить орбиту (Flex&nbsp;Bank)
        </Link>
      </div>

      {/* Sync feedback */}
      {syncResult && (
        <div className="glass rounded-xl px-4 py-3 mb-6 text-sm text-purple-300 border border-purple-500/20">
          {syncResult}
        </div>
      )}

      {/* Empty state */}
      {connections.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center glow-blue">
          <div className="text-5xl mb-4 opacity-60">&#x1F6F0;&#xFE0F;</div>
          <p className="text-gray-400 mb-2">Нет подключённых спутников</p>
          <p className="text-gray-600 text-sm">
            Подключите банк, чтобы начать отслеживать подписки
          </p>
        </div>
      )}

      {/* Connection cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {connections.map((conn) => {
          const status = STATUS_MAP[conn.status] ?? {
            label: conn.status,
            color: "text-gray-400",
          };

          return (
            <div
              key={conn.id}
              className="glass rounded-2xl p-6 glow-purple hover:glow-purple-strong
                         transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Provider + status */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-white tracking-wide">
                  {conn.provider}
                </span>
                <span className={`text-xs font-medium flex items-center gap-1.5 ${status.color}`}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse-glow" />
                  {status.label}
                </span>
              </div>

              {/* Meta */}
              <div className="space-y-1 text-sm text-gray-400 mb-5">
                <p>
                  Последняя синхронизация:{" "}
                  <span className="text-gray-300">
                    {formatDate(conn.lastSyncAt)}
                  </span>
                </p>
                <p>
                  Подключён:{" "}
                  <span className="text-gray-300">
                    {formatDate(conn.createdAt)}
                  </span>
                </p>
              </div>

              {/* Sync button */}
              <button
                onClick={() => handleSync(conn.id)}
                disabled={syncing === conn.id}
                className="w-full py-2 px-4 rounded-xl text-sm font-medium
                           border border-purple-500/30 text-purple-300
                           hover:bg-purple-500/10 hover:border-purple-500/50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 cursor-pointer"
              >
                {syncing === conn.id
                  ? "Синхронизация..."
                  : "Синхронизировать спутник"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
