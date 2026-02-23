import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/Spinner";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      navigate("/dashboard", { replace: true });
    } else {
      setError("Токен не получен. Попробуйте войти снова.");
    }
  }, [searchParams, setToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a
            href="/"
            className="text-purple-400 hover:text-purple-300 underline text-sm"
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    );
  }

  return <Spinner className="min-h-screen" />;
}
