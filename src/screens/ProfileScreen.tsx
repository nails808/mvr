import { useState } from 'react';
import type { UserData } from '../data/UserData';
import { EditDataModal } from '../components/EditDataModal';
import { openVicRoads, VicRoadsPaths } from '../data/vicroadsLinks';
import { useAuth } from '../auth/AuthContext';
import './ProfileScreen.css';

interface ProfileScreenProps {
  userData: UserData;
  photoUri: string | null;
  onUserDataChange: (data: UserData) => void;
  onPhotoChange: (uri: string | null) => void;
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="#1A2A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4h6v6M10 14L20 4M14 20H5a1 1 0 0 1-1-1V8"
        stroke="#1A2A3A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="#1A2A3A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileScreen({
  userData,
  photoUri,
  onUserDataChange,
  onPhotoChange,
}: ProfileScreenProps) {
  const { logout } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <div className="profile-screen">
      <header className="profile-header">
        <h1>Profile</h1>
      </header>

      {/* Profile and settings */}
      <section className="profile-card">
        <h2 className="profile-card__heading">Profile and settings</h2>
        <button
          type="button"
          className="profile-item"
          onClick={() => openVicRoads(VicRoadsPaths.personalInformation)}
        >
          <span className="profile-item__label">Personal information</span>
        </button>
        <button
          type="button"
          className="profile-item"
          onClick={() => openVicRoads(VicRoadsPaths.addresses)}
        >
          <span className="profile-item__label">Addresses</span>
        </button>
        <button
          type="button"
          className="profile-item"
          onClick={() => openVicRoads(VicRoadsPaths.securitySettings)}
        >
          <span className="profile-item__label">Security settings</span>
        </button>
        <button type="button" className="profile-item profile-item--last">
          <span className="profile-item__label">Passkey settings</span>
          <Chevron />
        </button>
      </section>

      {/* App controls */}
      <section className="profile-card">
        <h2 className="profile-card__heading">App controls</h2>
        <button type="button" className="profile-item profile-item--multi">
          <span className="profile-item__text">
            <span className="profile-item__label">Biometrics and settings</span>
            <span className="profile-item__hint">
              Enable biometrics and deactivate card or account
            </span>
          </span>
          <Chevron />
        </button>
        <button type="button" className="profile-item">
          <span className="profile-item__label">Help and info</span>
          <Chevron />
        </button>
        <button type="button" className="profile-item profile-item--last">
          <span className="profile-item__label">Provide app feedback</span>
          <ExternalIcon />
        </button>
      </section>

      {/* Log out */}
      <section className="profile-card profile-card--logout">
        <button
          type="button"
          className="profile-item profile-item--logout profile-item--last"
          disabled={loggingOut}
          onClick={() => {
            setLoggingOut(true);
            void logout().finally(() => setLoggingOut(false));
          }}
        >
          <LogoutIcon />
          <span className="profile-item__label">{loggingOut ? 'Logging out…' : 'Log out'}</span>
        </button>
      </section>

      {/* App version → opens full edit modal */}
      <button
        type="button"
        className="profile-version"
        onClick={() => setShowEditor(true)}
        aria-label="App version 1.3.7 — edit details"
      >
        App version 1.3.7
      </button>

      {showEditor && (
        <EditDataModal
          userData={userData}
          photoUri={photoUri}
          onClose={() => setShowEditor(false)}
          onSave={(data, photo) => {
            onUserDataChange(data);
            onPhotoChange(photo);
          }}
        />
      )}
    </div>
  );
}
