import { useState } from 'react';
import type { UserData } from '../data/UserData';
import { EditDataModal } from '../components/EditDataModal';
import './ProfileScreen.css';

interface ProfileScreenProps {
  userData: UserData;
  photoUri: string | null;
  onUserDataChange: (data: UserData) => void;
  onPhotoChange: (uri: string | null) => void;
}

export function ProfileScreen({
  userData,
  photoUri,
  onUserDataChange,
  onPhotoChange,
}: ProfileScreenProps) {
  const [showEditor, setShowEditor] = useState(false);

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
          <button
            type="button"
            className="profile-row profile-row--btn profile-row--last"
            onClick={() => setShowEditor(true)}
          >
            <span className="profile-row-label">About myVicRoads</span>
            <span className="profile-row-value profile-row-value--link">Version 1.3.3</span>
          </button>
        </div>
      </section>

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
