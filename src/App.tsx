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
import './App.css';
import './screens/Placeholder.css';

function App() {
  const [tab, setTab] = useState<NavTab>('Home');
  const [stack, setStack] = useState<StackDest>(null);
  const [userData, setUserData] = useState<UserData>(() => userRepository.loadUserData());
  const [photoUri, setPhotoUri] = useState<string | null>(() => userRepository.loadPhotoUri());
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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
  }, []);

  const handleUserDataChange = useCallback((data: UserData) => {
    setUserData(data);
  }, []);

  const handlePhotoChange = useCallback((uri: string | null) => {
    setPhotoUri(uri);
  }, []);

  const handleTabSelect = useCallback((next: NavTab) => {
    setStack(null);
    setTab(next);
  }, []);

  // —— Stack: digital licence (no bottom nav) ——
  if (stack === 'viewlicence') {
    return (
      <div className="app">
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

  // —— Stack: demerit (back header, no bottom nav) ——
  if (stack === 'demerit') {
    return (
      <div className="app">
        {!online && (
          <div className="offline-banner" role="status">
            You&apos;re offline — licence and vehicle data still available
          </div>
        )}
        <div className="stack-screen">
          <header className="stack-header">
            <button type="button" className="stack-back" onClick={handleBack}>
              ‹ Back
            </button>
            <h1>Demerit points</h1>
          </header>
          <div className="stack-scroll">
            <DemeritScreen userData={userData} onUserDataChange={handleUserDataChange} />
          </div>
        </div>
      </div>
    );
  }

  // —— Tab content (+ myVehicles stack keeps bottom nav) ——
  let content: ReactNode;

  if (stack === 'myVehicles') {
    content = (
      <MyVehiclesScreen userData={userData} onUserDataChange={handleUserDataChange} />
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
          />
        );
        break;
      default:
        content = <HomeScreen userData={userData} onNavigate={handleNavigate} />;
        break;
    }
  }

  const navActive: NavTab = stack === 'myVehicles' ? 'Vehicles' : tab;

  return (
    <div className="app">
      {!online && (
        <div className="offline-banner" role="status">
          You&apos;re offline — licence and vehicle data still available
        </div>
      )}
      <main className="app-main">{content}</main>
      <BottomNav active={navActive} onSelect={handleTabSelect} />
    </div>
  );
}

export default App;
