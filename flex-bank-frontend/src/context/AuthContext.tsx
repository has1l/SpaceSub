import { createContext, useState, useEffect, type ReactNode } from 'react';

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
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem('flexbank_token'),
  );

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('flexbank_token', newToken);
    } else {
      localStorage.removeItem('flexbank_token');
    }
  };

  const logout = () => {
    setToken(null);
    window.location.href = '/';
  };

  useEffect(() => {
    const stored = localStorage.getItem('flexbank_token');
    if (stored !== token) {
      setTokenState(stored);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, setToken, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}
