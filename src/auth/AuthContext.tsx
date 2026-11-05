import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, loginRequest, logoutRequest } from './authApi';

type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous';
  username: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchSession();
    if (data && 'ok' in data && data.ok) {
      setStatus('authenticated');
      setUsername(data.username);
    } else {
      setStatus('anonymous');
      setUsername(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const login = useCallback(async (user: string, password: string) => {
    const { data } = await loginRequest(user, password);
    if (data?.ok) {
      setStatus('authenticated');
      setUsername(data.username ?? user);
      return { ok: true as const };
    }
    return {
      ok: false as const,
      error: (data?.error as string) || 'Login failed',
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setStatus('anonymous');
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ status, username, login, logout, refresh }),
    [status, username, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
