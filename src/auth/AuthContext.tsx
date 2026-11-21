import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, loginRequest, logoutRequest } from './authApi';
import { ensurePushSubscription } from './pushApi';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const VALIDATE_WHILE_ACTIVE_MS = 45_000;
const ACTIVITY_THROTTLE_MS = 5_000;

/** Simple result shape — avoids discriminated-union assignability issues */
export type LoginResult = {
  ok: boolean;
  error?: string;
};

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthState = {
  status: AuthStatus;
  username: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
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

// Browser timer handles are numeric, even when Node timer declarations are
// also present in the dependency type graph.
type TimerId = number;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const idleTimerRef = useRef<TimerId | null>(null);
  const validateTimerRef = useRef<TimerId | null>(null);
  const lastActivityRef = useRef(Date.now());
  const statusRef = useRef<AuthStatus>(status);
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

  const logout = useCallback(async (): Promise<void> => {
    clearTimers();
    await logoutRequest();
    setStatus('anonymous');
    setUsername(null);
  }, [clearTimers]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const data = await fetchSession();
    if (data.ok === true) {
      setStatus('authenticated');
      setUsername(typeof data.username === 'string' ? data.username : null);
      return true;
    }
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

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const ok = await refresh();
      if (cancelled) return;
      if (ok) {
        lastActivityRef.current = Date.now();
        resetIdleTimer();
        validateTimerRef.current = window.setInterval(() => {
          void refresh();
        }, VALIDATE_WHILE_ACTIVE_MS);
      }
    };
    void boot();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'authenticated') {
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

  useEffect(() => {
    if (status === 'authenticated') {
      lastActivityRef.current = Date.now();
      resetIdleTimer();
      if (validateTimerRef.current == null) {
        validateTimerRef.current = window.setInterval(() => {
          void refresh();
        }, VALIDATE_WHILE_ACTIVE_MS);
      }
    } else if (status !== 'loading') {
      clearTimers();
    }
  }, [status, resetIdleTimer, refresh, clearTimers]);

  const login = useCallback(async (user: string, password: string): Promise<LoginResult> => {
    try {
      const { data } = await loginRequest(user, password);
      if (data && data.ok) {
        setStatus('authenticated');
        setUsername(typeof data.username === 'string' ? data.username : user);
        // Request notification permission while still in the login user-gesture chain
        try {
          await ensurePushSubscription();
        } catch {
          /* non-fatal */
        }
        return { ok: true };
      }
      const message =
        data && typeof data.error === 'string' && data.error
          ? data.error
          : 'Login failed';
      return { ok: false, error: message };
    } catch {
      return { ok: false, error: 'Unable to reach authentication service' };
    }
  }, []);


  // Register push subscription when session becomes authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;
    void ensurePushSubscription();
  }, [status]);

  // Force AuthState so Provider value always type-checks
  const value = {
    status,
    username,
    login,
    logout,
    refresh,
  } as AuthState;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
