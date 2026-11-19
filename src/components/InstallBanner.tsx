import { useCallback, useEffect, useState } from 'react';
import './InstallBanner.css';

const DISMISS_KEY = 'mvr_install_banner_dismissed_until';
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const mq = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const androidApp = document.referrer.startsWith('android-app://');
  return Boolean(mq || iosStandalone || androidApp);
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    /* ignore */
  }
}

/**
 * Top install banner for mobile browsers when the PWA is not installed.
 * - Chromium: uses beforeinstallprompt + Install button
 * - iOS Safari: short Add to Home Screen steps
 * - Dismiss remembered for 7 days
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || isDismissed()) {
      setVisible(false);
      return;
    }

    const ios = isIos();
    setIosMode(ios);

    // Show on mobile-ish widths; desktop can still install but we target phone UX
    const narrow =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 820px)').matches;

    if (ios) {
      if (narrow) setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // If event already missed this session, still show a soft banner on mobile
    if (narrow) {
      const t = window.setTimeout(() => setVisible(true), 400);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBip);
        window.clearTimeout(t);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, []);

  const dismiss = useCallback(() => {
    persistDismiss();
    setVisible(false);
    setShowIosSteps(false);
  }, []);

  const onInstall = useCallback(async () => {
    if (iosMode) {
      setShowIosSteps((v) => !v);
      return;
    }
    if (!deferred) {
      // Fallback: browser may still expose install via menu
      setShowIosSteps(true);
      return;
    }
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user closed prompt */
    }
    setDeferred(null);
    setVisible(false);
  }, [deferred, iosMode]);

  if (!visible) return null;

  return (
    <div className="install-banner" role="region" aria-label="Install app">
      <div className="install-banner__row">
        <div className="install-banner__text">
          <strong className="install-banner__title">Install myVicRoads</strong>
          <span className="install-banner__sub">
            {iosMode
              ? 'Add to your Home Screen for full-screen access'
              : 'Install for quicker access and a full-screen experience'}
          </span>
        </div>
        <div className="install-banner__actions">
          <button type="button" className="install-banner__btn" onClick={() => void onInstall()}>
            {iosMode ? (showIosSteps ? 'Hide steps' : 'How to install') : 'Install'}
          </button>
          <button
            type="button"
            className="install-banner__close"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            ×
          </button>
        </div>
      </div>

      {showIosSteps && (
        <ol className="install-banner__steps">
          {iosMode ? (
            <>
              <li>
                Tap the <strong>Share</strong> button in Safari
              </li>
              <li>
                Scroll and tap <strong>Add to Home Screen</strong>
              </li>
              <li>
                Tap <strong>Add</strong> to confirm
              </li>
            </>
          ) : (
            <>
              <li>Open the browser menu (⋮)</li>
              <li>
                Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
