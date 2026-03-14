import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = useCallback((newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('flexbank_token', newToken);
    } else {
      localStorage.removeItem('flexbank_token');
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    window.location.href = '/bank/';
  }, [setToken]);

  useEffect(() => {
    // Load token after mount (more reliable on mobile browsers after OAuth redirects)
    const stored = localStorage.getItem('flexbank_token');
    if (stored) {
      setTokenState(stored);
    }

    // Keep context synced if localStorage changes
    const handleStorage = () => {
      const updated = localStorage.getItem('flexbank_token');
      setTokenState(updated);
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, setToken, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}
