import { useRef, useState, type ChangeEvent } from 'react';
import type { UserData } from '../data/UserData';
import './ProfileScreen.css';

interface ProfileScreenProps {
  userData: UserData;
  photoUri: string | null;
  onUserDataChange: (data: UserData) => void;
  onPhotoChange: (uri: string | null) => void;
}

type EditableField =
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'address'
  | 'licenceNumber'
  | 'licenceExpiry'
  | 'licenceType'
  | 'proficiency'
  | 'licenceStatus'
  | 'conditions'
  | 'cardNumber'
  | 'issueDate';

const PERSONAL_FIELDS: { key: EditableField; label: string; multiline?: boolean }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'address', label: 'Address', multiline: true },
];

const LICENCE_FIELDS: { key: EditableField; label: string }[] = [
  { key: 'licenceNumber', label: 'Licence number' },
  { key: 'licenceType', label: 'Licence type' },
  { key: 'proficiency', label: 'Proficiency' },
  { key: 'licenceStatus', label: 'Status' },
  { key: 'licenceExpiry', label: 'Expiry' },
  { key: 'issueDate', label: 'Issue date' },
  { key: 'cardNumber', label: 'Card number' },
  { key: 'conditions', label: 'Conditions' },
];

export function ProfileScreen({
  userData,
  photoUri,
  onUserDataChange,
  onPhotoChange,
}: ProfileScreenProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const unlocked = userData.isUnlocked;

  const toggleUnlock = () => {
    onUserDataChange({ ...userData, isUnlocked: !userData.isUnlocked });
  };

  const openEdit = (key: EditableField) => {
    if (!unlocked) return;
    setDraft(String(userData[key] ?? ''));
    setEditingField(key);
  };

  const saveEdit = () => {
    if (!editingField) return;
    onUserDataChange({ ...userData, [editingField]: draft });
    setEditingField(null);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPhotoChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = () => {
    if (!unlocked) return;
    onPhotoChange(null);
  };

  return (
    <div className="profile-screen">
      <header className="profile-header">
        <h1>Profile</h1>
        <p className="profile-subtitle">myVicRoads account</p>
      </header>

      {/* Photo + unlock */}
      <section className="profile-card profile-photo-card">
        <div className="profile-photo-wrap">
          {photoUri ? (
            <img src={photoUri} alt="Licence photo" className="profile-photo" />
          ) : (
            <div className="profile-photo profile-photo--placeholder">
              <span>{userData.firstName.charAt(0)}{userData.lastName.charAt(0)}</span>
            </div>
          )}
          {unlocked && (
            <div className="profile-photo-actions">
              <button type="button" className="btn-sm" onClick={() => fileRef.current?.click()}>
                {photoUri ? 'Change photo' : 'Add photo'}
              </button>
              {photoUri && (
                <button type="button" className="btn-sm btn-sm--danger" onClick={removePhoto}>
                  Remove
                </button>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onFile}
          />
        </div>

        <div className="profile-name-block">
          <div className="profile-fullname">
            {userData.firstName} {userData.lastName}
          </div>
          <div className="profile-meta">{userData.licenceNumber} · {userData.licenceType}</div>
        </div>

        <button
          type="button"
          className={`unlock-btn ${unlocked ? 'unlock-btn--on' : ''}`}
          onClick={toggleUnlock}
        >
          {unlocked ? 'Tap to lock your details and photo' : 'Unlock editing'}
        </button>
        {unlocked && (
          <p className="unlock-hint">Editing unlocked — tap any field to change it</p>
        )}
      </section>

      {/* Personal details */}
      <section className="profile-section">
        <h2 className="profile-section-title">Personal details</h2>
        <p className="profile-section-desc">Name, DOB, contact info</p>
        <div className="profile-card">
          {PERSONAL_FIELDS.map(({ key, label, multiline }) => (
            <button
              key={key}
              type="button"
              className={`profile-row ${unlocked ? 'profile-row--editable' : ''}`}
              onClick={() => openEdit(key)}
              disabled={!unlocked}
            >
              <span className="profile-row-label">{label}</span>
              <span className={`profile-row-value ${multiline ? 'profile-row-value--multi' : ''}`}>
                {userData[key] || '—'}
              </span>
              {unlocked && <span className="profile-row-chevron">›</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Licence details (editable when unlocked) */}
      <section className="profile-section">
        <h2 className="profile-section-title">Licence details</h2>
        <div className="profile-card">
          {LICENCE_FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`profile-row ${unlocked ? 'profile-row--editable' : ''}`}
              onClick={() => openEdit(key)}
              disabled={!unlocked}
            >
              <span className="profile-row-label">{label}</span>
              <span className="profile-row-value">{userData[key] || '—'}</span>
              {unlocked && <span className="profile-row-chevron">›</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Settings-style links (static as in original) */}
      <section className="profile-section">
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
          <div className="profile-row profile-row--static">
            <span className="profile-row-label">About myVicRoads</span>
            <span className="profile-row-value">Version 1.3.3</span>
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {editingField && (
        <div className="modal-backdrop" onClick={() => setEditingField(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {[...PERSONAL_FIELDS, ...LICENCE_FIELDS].find((f) => f.key === editingField)?.label}
            </h3>
            {editingField === 'address' ? (
              <textarea
                className="modal-input modal-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                autoFocus
              />
            ) : (
              <input
                className="modal-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditingField(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
