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
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    userRepository.saveUserData(userData);
  }, [userData]);

  useEffect(() => {
    userRepository.savePhotoUri(photoUri);
  }, [photoUri]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleNavigate = useCallback((dest: StackDest) => {
    setStack(dest);
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

  /** Selecting a bottom-nav tab always leaves stack screens */
  const handleTabSelect = useCallback((next: NavTab) => {
    setStack(null);
    setTab(next);
  }, []);

  // Demerit keeps a simple back header (not requested to change)
  if (stack === 'demerit') {
    return (
      <div className="app">
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

  let content: ReactNode;

  // View licence + My vehicles: no back bar; bottom nav stays visible
  if (stack === 'viewlicence') {
    content = (
      <ViewLicenceScreen
        userData={userData}
        photoUri={photoUri}
        embedded
        onUserDataChange={handleUserDataChange}
        onPhotoChange={handlePhotoChange}
      />
    );
  } else if (stack === 'myVehicles') {
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
    }
  }

  // Highlight Licence / Vehicles tab while viewing those stack screens
  const navActive: NavTab =
    stack === 'viewlicence' ? 'Licence' : stack === 'myVehicles' ? 'Vehicles' : tab;

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
