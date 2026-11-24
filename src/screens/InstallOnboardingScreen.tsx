import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getMobilePlatform, type MobilePlatform } from '../utils/deviceGate';
import './InstallOnboardingScreen.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function StepPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="ob-phone" aria-hidden>
      <div className="ob-phone__notch" />
      <div className="ob-phone__screen">{children}</div>
    </div>
  );
}

function AndroidSteps() {
  return (
    <ol className="ob-steps">
      <li className="ob-step">
        <div className="ob-step__num">1</div>
        <div className="ob-step__body">
          <h3>Tap Install</h3>
          <p>Use the blue <strong>Install app</strong> button above when it appears. Chrome will show the install prompt.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--chrome">
              <div className="ob-mock__bar">myvicroads</div>
              <div className="ob-mock__banner">
                <span className="ob-mock__icon">M</span>
                <div>
                  <strong>Install app?</strong>
                  <small>myVicRoads</small>
                </div>
                <button type="button" className="ob-mock__mini">Install</button>
              </div>
              <div className="ob-mock__page">Home screen shortcut</div>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
      <li className="ob-step">
        <div className="ob-step__num">2</div>
        <div className="ob-step__body">
          <h3>Or use the browser menu</h3>
          <p>Tap the <strong>⋮</strong> menu (top right) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--menu">
              <div className="ob-mock__menu-sheet">
                <div>New tab</div>
                <div className="ob-mock__menu-hi">Install app</div>
                <div>Add to Home screen</div>
                <div>Settings</div>
              </div>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
      <li className="ob-step">
        <div className="ob-step__num">3</div>
        <div className="ob-step__body">
          <h3>Open from your home screen</h3>
          <p>Find the <strong>myVicRoads</strong> icon and open it. The app runs full screen without the browser bar.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--home">
              <div className="ob-mock__app-icon">M</div>
              <span>myVicRoads</span>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
    </ol>
  );
}

function IosSteps() {
  return (
    <ol className="ob-steps">
      <li className="ob-step">
        <div className="ob-step__num">1</div>
        <div className="ob-step__body">
          <h3>Open in Safari</h3>
          <p>Install only works reliably in <strong>Safari</strong>. If you opened this in Chrome or another browser, copy the link and open it in Safari.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--safari">
              <div className="ob-mock__safari-bar">aA &nbsp; myvicroads …</div>
              <div className="ob-mock__page">Safari browser</div>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
      <li className="ob-step">
        <div className="ob-step__num">2</div>
        <div className="ob-step__body">
          <h3>Tap the Share button</h3>
          <p>At the bottom of Safari, tap the <strong>Share</strong> icon (square with an arrow pointing up).</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--safari">
              <div className="ob-mock__page">Page content</div>
              <div className="ob-mock__toolbar">
                <span>◁</span>
                <span className="ob-mock__share-hi" title="Share">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0b5fff" strokeWidth="2">
                    <path d="M12 16V4" />
                    <path d="M8 8l4-4 4 4" />
                    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                  </svg>
                </span>
                <span>□</span>
              </div>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
      <li className="ob-step">
        <div className="ob-step__num">3</div>
        <div className="ob-step__body">
          <h3>Add to Home Screen</h3>
          <p>Scroll the share sheet and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--sheet">
              <div className="ob-mock__sheet-row">Favourite</div>
              <div className="ob-mock__sheet-row ob-mock__menu-hi">Add to Home Screen</div>
              <div className="ob-mock__sheet-row">Find on Page</div>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
      <li className="ob-step">
        <div className="ob-step__num">4</div>
        <div className="ob-step__body">
          <h3>Open the app</h3>
          <p>On your Home Screen, tap <strong>myVicRoads</strong> to launch it in full-screen mode.</p>
          <StepPhoneFrame>
            <div className="ob-mock ob-mock--home">
              <div className="ob-mock__app-icon">M</div>
              <span>myVicRoads</span>
            </div>
          </StepPhoneFrame>
        </div>
      </li>
    </ol>
  );
}

export function InstallOnboardingScreen() {
  const [platform, setPlatform] = useState<MobilePlatform>(() => getMobilePlatform());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(getMobilePlatform());
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) {
      setHint('Use the browser menu → Install app / Add to Home screen.');
      return;
    }
    setInstalling(true);
    setHint(null);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setHint('Installing… Open the app from your home screen when ready.');
      } else {
        setHint('Install dismissed. You can try again or use the menu steps below.');
      }
    } catch {
      setHint('Could not open install prompt. Follow the steps below.');
    } finally {
      setDeferred(null);
      setInstalling(false);
    }
  }, [deferred]);

  const isIos = platform === 'ios';
  const isAndroid = platform === 'android' || platform === 'other';

  return (
    <div className="ob">
      <header className="ob-hero">
        <div className="ob-hero__badge">myVicRoads</div>
        <h1>Install to continue</h1>
        <p>
          For security and the best experience, this app must be installed on your phone and opened
          from the home screen.
        </p>
      </header>

      {isAndroid && (
        <div className="ob-install-wrap">
          <button
            type="button"
            className="ob-install-btn"
            onClick={() => void onInstall()}
            disabled={installing}
          >
            {installing ? 'Opening…' : 'Install app'}
          </button>
          {!deferred && (
            <p className="ob-install-note">
              If the button does nothing, use Chrome menu → <strong>Install app</strong>.
            </p>
          )}
          {hint && <p className="ob-hint">{hint}</p>}
        </div>
      )}

      {isIos && (
        <div className="ob-install-wrap">
          <p className="ob-ios-callout">
            On iPhone and iPad, use <strong>Safari</strong> and <strong>Add to Home Screen</strong>{' '}
            (there is no install button).
          </p>
          {hint && <p className="ob-hint">{hint}</p>}
        </div>
      )}

      <section className="ob-guide">
        <h2>{isIos ? 'How to install on iOS' : 'How to install on Android'}</h2>
        {isIos ? <IosSteps /> : <AndroidSteps />}
      </section>
    </div>
  );
}
