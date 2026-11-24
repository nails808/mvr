import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BottomNav } from './components/BottomNav';
import type { NavTab, StackDest } from './components/NavTab';
import { userRepository } from './data/UserRepository';
import type { UserData } from './data/UserData';
import { HomeScreen } from './screens/HomeScreen';
import { VehiclesScreen } from './screens/VehiclesScreen';
import { MyVehiclesScreen } from './screens/MyVehiclesScreen';
import { LicenceScreen } from './screens/LicenceScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ViewLicenceScreen } from './screens/ViewLicenceScreen';
import { DemeritScreen } from './screens/DemeritScreen';
import { LoginScreen } from './screens/LoginScreen';
import { QrScannerScreen } from './screens/QrScannerScreen';
import { CameraPermissionScreen } from './screens/CameraPermissionScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { HelpInfoScreen } from './screens/HelpInfoScreen';
import { useAuth } from './auth/AuthContext';
import './App.css';
import './screens/Placeholder.css';
import { resolveGateState, type GateState } from './utils/deviceGate';
import { DesktopBlockedScreen } from './screens/DesktopBlockedScreen';
import { InstallOnboardingScreen } from './screens/InstallOnboardingScreen';

function App() {
  const { status, username } = useAuth();

  const [tab, setTab] = useState<NavTab>('Home');
  const [stack, setStack] = useState<StackDest>(null);
  const [userData, setUserData] = useState<UserData>(() => userRepository.loadUserData());
  const [photoUri, setPhotoUri] = useState<string | null>(() => userRepository.loadPhotoUri());
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [cameraDenied, setCameraDenied] = useState(false);
  const [gate, setGate] = useState<GateState>(() =>
    typeof window !== 'undefined' ? resolveGateState() : 'app'
  );

  useEffect(() => {
    const recompute = () => setGate(resolveGateState());
    recompute();
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(display-mode: standalone)');
      mq.addEventListener?.('change', recompute);
    } catch {
      /* ignore */
    }
    window.addEventListener('resize', recompute);
    // Chrome fires this once it has accepted an install. Persisting the state
    // lets the current tab transition immediately rather than leaving the
    // user stranded on the onboarding screen while Android opens the WebAPK.
    const onInstalled = () => {
      try {
        localStorage.setItem('myvicroads-pwa-installed', 'true');
      } catch {
        /* ignore unavailable storage */
      }
      setGate('app');
    };
    window.addEventListener('appinstalled', onInstalled);
    const timer = window.setInterval(recompute, 2500);
    return () => {
      try {
        mq?.removeEventListener?.('change', recompute);
      } catch {
        /* ignore */
      }
      window.removeEventListener('resize', recompute);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    userRepository.saveUserData(userData);
  }, [userData]);

  useEffect(() => {
    userRepository.savePhotoUri(photoUri);
  }, [photoUri]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleNavigate = useCallback((dest: StackDest) => {
    if (dest) setStack(dest);
  }, []);

  const handleBack = useCallback(() => {
    setStack(null);
    setCameraDenied(false);
  }, []);

  const handleUserDataChange = useCallback((data: UserData) => {
    setUserData(data);
  }, []);

  const handlePhotoChange = useCallback((uri: string | null) => {
    setPhotoUri(uri);
  }, []);

  const handleTabSelect = useCallback((next: NavTab) => {
    setStack(null);
    setCameraDenied(false);
    setTab(next);
  }, []);

  const startQrFlow = useCallback(async () => {
    // Probe permission state when available (camera is not in all PermissionName unions)
    try {
      const perms = navigator.permissions;
      if (perms?.query) {
        const status = await perms.query({ name: 'camera' as PermissionName });
        if (status.state === 'denied') {
          setCameraDenied(true);
          setStack('cameraPermission');
          return;
        }
        if (status.state === 'granted') {
          setStack('qrScanner');
          return;
        }
      }
    } catch {
      /* fall through to education screen */
    }
    setCameraDenied(false);
    setStack('cameraPermission');
  }, []);


  if (gate === 'desktop') {
    return <DesktopBlockedScreen />;
  }
  if (gate === 'install') {
    return <InstallOnboardingScreen />;
  }

  if (status === 'loading') {
    return (
      <div className="app app--auth-loading">
        <div className="auth-loading">Loading…</div>
      </div>
    );
  }

  if (stack === 'qrScanner') {
    return (
      <QrScannerScreen
        onBack={handleBack}
        onNeedPermission={() => {
          setCameraDenied(true);
          setStack('cameraPermission');
        }}
      />
    );
  }

  if (stack === 'cameraPermission') {
    return (
      <CameraPermissionScreen
        denied={cameraDenied}
        onBack={handleBack}
        onAllow={() => {
          setCameraDenied(false);
          setStack('qrScanner');
        }}
        onOpenSettings={() => {
          // Best-effort: cannot open OS settings from web; show denied guidance
          setCameraDenied(true);
        }}
      />
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="app app--auth">
        <LoginScreen
          onScanQr={() => {
            setCameraDenied(false);
            setStack('cameraPermission');
          }}
        />
      </div>
    );
  }

  if (stack === 'viewlicence') {
    return (
      <div className="app app--stack-enter">
        {!online && (
          <div className="offline-banner" role="status">
            You&apos;re offline — licence and vehicle data still available
          </div>
        )}
        <main className="app-main app-main--full">
          <ViewLicenceScreen
            userData={userData}
            photoUri={photoUri}
            onBack={handleBack}
            onUserDataChange={handleUserDataChange}
            onPhotoChange={handlePhotoChange}
          />
        </main>
      </div>
    );
  }

  if (stack === 'help') {
    return (
      <div className="app app--stack-enter">
        <HelpInfoScreen onBack={handleBack} />
      </div>
    );
  }

  if (stack === 'feedback') {
    return (
      <div className="app app--stack-enter">
        <FeedbackScreen
          username={username || ''}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (stack === 'demerit') {
    return (
      <div className="app app--stack-enter">
        {!online && (
          <div className="offline-banner" role="status">
            You&apos;re offline — licence and vehicle data still available
          </div>
        )}
        <div className="stack-screen">
          <header className="stack-top">
            <button
              type="button"
              className="stack-top__back"
              onClick={handleBack}
              aria-label="Back"
            >
              ‹
            </button>
            <h1 className="stack-top__title">Demerit points</h1>
            <span className="stack-top__spacer" aria-hidden />
          </header>
          <div className="stack-scroll">
            <DemeritScreen userData={userData} onUserDataChange={handleUserDataChange} />
          </div>
        </div>
      </div>
    );
  }

  let content: ReactNode;

  if (stack === 'myVehicles') {
    content = (
      <MyVehiclesScreen
        userData={userData}
        onUserDataChange={handleUserDataChange}
        onBack={handleBack}
      />
    );
  } else {
    switch (tab) {
      case 'Home':
        content = <HomeScreen userData={userData} onNavigate={handleNavigate} />;
        break;
      case 'Vehicles':
        content = <VehiclesScreen onNavigate={handleNavigate} />;
        break;
      case 'Licence':
        content = <LicenceScreen onNavigate={handleNavigate} />;
        break;
      case 'Payments':
        content = <PaymentsScreen />;
        break;
      case 'Profile':
        content = (
          <ProfileScreen
            userData={userData}
            photoUri={photoUri}
            onUserDataChange={handleUserDataChange}
            onPhotoChange={handlePhotoChange}
            onScanQr={() => void startQrFlow()}
            onFeedback={() => setStack('feedback')}
            onHelp={() => setStack('help')}
          />
        );
        break;
      default:
        content = <HomeScreen userData={userData} onNavigate={handleNavigate} />;
        break;
    }
  }

  const navActive: NavTab =
    stack === 'myVehicles' ? 'Vehicles' : tab;

  return (
    <div className="app">
      {!online && (
        <div className="offline-banner" role="status">
          You&apos;re offline — licence and vehicle data still available
        </div>
      )}
      <main className="app-main app-main--fade" key={stack ?? tab}>
        {content}
      </main>
      <BottomNav active={navActive} onSelect={handleTabSelect} />
    </div>
  );
}

export default App;
