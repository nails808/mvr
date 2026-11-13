import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, loginRequest, logoutRequest } from './authApi';

/** Server and client share the same idle policy */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const VALIDATE_WHILE_ACTIVE_MS = 45_000; // re-validate while user is active
const ACTIVITY_THROTTLE_MS = 5_000; // don't spam activity resets

type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous';
  username: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const idleTimerRef = useRef<number | null>(null);
  const validateTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const statusRef = useRef(status);
  statusRef.current = status;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (validateTimerRef.current != null) {
      window.clearInterval(validateTimerRef.current);
      validateTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    clearTimers();
    await logoutRequest();
    setStatus('anonymous');
    setUsername(null);
  }, [clearTimers]);

  const refresh = useCallback(async () => {
    const data = await fetchSession();
    if (data && 'ok' in data && data.ok) {
      setStatus('authenticated');
      setUsername(data.username);
      return true;
    }
    // Session invalid / expired / replaced by another device
    clearTimers();
    setStatus('anonymous');
    setUsername(null);
    return false;
  }, [clearTimers]);

  const resetIdleTimer = useCallback(() => {
    if (statusRef.current !== 'authenticated') return;

    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      // No user activity for IDLE_TIMEOUT_MS → force logout
      void logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  const onUserActivity = useCallback(() => {
    if (statusRef.current !== 'authenticated') return;
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Initial session check + activity listeners + periodic validate while authenticated
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const ok = await refresh();
      if (cancelled) return;
      if (ok) {
        lastActivityRef.current = Date.now();
        resetIdleTimer();
        // Periodic server re-validation while the tab is open and authenticated
        validateTimerRef.current = window.setInterval(() => {
          void refresh();
        }, VALIDATE_WHILE_ACTIVE_MS);
      }
    };
    void boot();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'authenticated') {
        // Tab became visible again — immediately check whether the session is still valid
        void refresh().then((ok) => {
          if (ok) {
            lastActivityRef.current = Date.now();
            resetIdleTimer();
          }
        });
      }
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onUserActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearTimers();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onUserActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, resetIdleTimer, onUserActivity, clearTimers]);

  // When status becomes authenticated (e.g. after login), start the idle + validate timers
  useEffect(() => {
    if (status === 'authenticated') {
      lastActivityRef.current = Date.now();
      resetIdleTimer();
      if (validateTimerRef.current == null) {
        validateTimerRef.current = window.setInterval(() => {
          void refresh();
        }, VALIDATE_WHILE_ACTIVE_MS);
      }
    } else {
      clearTimers();
    }
  }, [status, resetIdleTimer, refresh, clearTimers]);

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
