import type { UserData } from '../data/UserData';
import './ProfileScreen.css';

interface ProfileScreenProps {
  userData: UserData;
  photoUri: string | null;
  onUserDataChange: (data: UserData) => void;
  onPhotoChange: (uri: string | null) => void;
}

function LockIcon({ unlocked }: { unlocked: boolean }) {
  if (unlocked) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-9h-1V6a5 5 0 0 0-9.9-1h2.02A3 3 0 0 1 12 3a3 3 0 0 1 3 3v2H6a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
  );
}

export function ProfileScreen({ userData, onUserDataChange }: ProfileScreenProps) {
  const unlocked = userData.isUnlocked;

  const toggleUnlock = () => {
    onUserDataChange({ ...userData, isUnlocked: !userData.isUnlocked });
  };

  return (
    <div className="profile-screen">
      <header className="profile-header">
        <h1>Profile</h1>
        <p className="profile-subtitle">myVicRoads account</p>
      </header>

      <section className="profile-section profile-section--first">
        <div className="profile-card">
          <div className="profile-row profile-row--static">
            <span className="profile-row-label">Notification settings</span>
            <span className="profile-row-chevron">›</span>
          </div>
          <div className="profile-row profile-row--static">
            <span className="profile-row-label">Privacy settings</span>
            <span className="profile-row-chevron">›</span>
          </div>
          <div className="profile-row profile-row--static">
            <span className="profile-row-label">Help & support</span>
            <span className="profile-row-chevron">›</span>
          </div>
          <div className="profile-row profile-row--static profile-row--last">
            <span className="profile-row-label">About myVicRoads</span>
            <span className="profile-row-value">Version 1.3.3</span>
          </div>
        </div>
      </section>

      <div className="profile-lock-row">
        <button
          type="button"
          className={`profile-lock-btn ${unlocked ? 'profile-lock-btn--open' : ''}`}
          onClick={toggleUnlock}
          aria-label={unlocked ? 'Lock editing' : 'Unlock editing'}
          aria-pressed={unlocked}
        >
          <LockIcon unlocked={unlocked} />
        </button>
      </div>
    </div>
  );
}
