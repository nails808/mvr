import { useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import type { UserData } from '../data/UserData';
import './EditDataModal.css';

interface EditDataModalProps {
  userData: UserData;
  photoUri: string | null;
  onSave: (data: UserData, photo: string | null) => void;
  onClose: () => void;
}

type FieldKey = keyof UserData;

const LICENCE_FIELDS: { key: FieldKey; label: string; multiline?: boolean }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'address', label: 'Address', multiline: true },
  { key: 'licenceNumber', label: 'Licence number' },
  { key: 'licenceType', label: 'Licence type' },
  { key: 'issueDate', label: 'Issue date' },
  { key: 'licenceExpiry', label: 'Licence expiry' },
  { key: 'proficiency', label: 'Proficiency' },
  { key: 'licenceStatus', label: 'Licence status' },
  { key: 'conditions', label: 'Conditions', multiline: true },
  { key: 'cardNumber', label: 'Card number' },
  { key: 'demeritPoints', label: 'Demerit points' },
  { key: 'demeritMax', label: 'Demerit max' },
];

const VEHICLE_FIELDS: { key: FieldKey; label: string; multiline?: boolean }[] = [
  { key: 'vehicleRego', label: 'Registration number' },
  { key: 'vehicleStatus', label: 'Status' },
  { key: 'vehicleDescription', label: 'Description' },
  { key: 'vehicleMake', label: 'Make' },
  { key: 'vehicleModel', label: 'Model' },
  { key: 'vehicleYear', label: 'Year' },
  { key: 'vehicleColour', label: 'Colour' },
  { key: 'vehicleVin', label: 'VIN/Chassis' },
  { key: 'vehicleEngineNumber', label: 'Engine number' },
  { key: 'vehicleRegSerial', label: 'Reg serial number' },
  { key: 'vehicleCompliancePlate', label: 'Compliance plate date' },
  { key: 'vehicleExpiry', label: 'Expiry' },
  { key: 'vehicleStolenStatus', label: 'Stolen status' },
  { key: 'vehicleSanctions', label: 'Sanctions' },
  { key: 'vehicleGoodsCarrying', label: 'Goods carrying' },
  { key: 'vehicleTransferInDispute', label: 'Transfer in dispute' },
];

export function EditDataModal({ userData, photoUri, onSave, onClose }: EditDataModalProps) {
  const [draft, setDraft] = useState<UserData>({ ...userData });
  const [photo, setPhoto] = useState<string | null>(photoUri);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (key: FieldKey, value: string) => {
    if (key === 'demeritPoints' || key === 'demeritMax') {
      const n = Number(value);
      setDraft((d) => ({ ...d, [key]: Number.isFinite(n) ? n : 0 }));
      return;
    }
    if (key === 'isUnlocked') return;
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    onSave({ ...draft, isUnlocked: false }, photo);
    onClose();
  };

  const renderFields = (fields: typeof LICENCE_FIELDS) =>
    fields.map(({ key, label, multiline }) => {
      const raw = draft[key];
      const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
      return (
        <label key={key} className="edm-field">
          <span className="edm-field__label">{label}</span>
          {multiline ? (
            <textarea
              className="edm-field__input edm-field__textarea"
              value={value}
              rows={3}
              onChange={(e) => setField(key, e.target.value)}
            />
          ) : (
            <input
              className="edm-field__input"
              value={value}
              onChange={(e) => setField(key, e.target.value)}
            />
          )}
        </label>
      );
    });

  return createPortal(
    <div className="edm" role="dialog" aria-modal aria-labelledby="edm-title">
      <header className="edm-header">
        <button type="button" className="edm-header__close" onClick={onClose}>
          Cancel
        </button>
        <h1 id="edm-title" className="edm-header__title">
          Edit details
        </h1>
        <button type="button" className="edm-header__save" onClick={handleSave}>
          Save
        </button>
      </header>

      <div className="edm-body">
        <section className="edm-section">
          <h2 className="edm-section__title">Photo</h2>
          <div className="edm-photo-row">
            {photo ? (
              <img src={photo} alt="Licence photo" className="edm-photo" />
            ) : (
              <div className="edm-photo edm-photo--empty">No photo</div>
            )}
            <div className="edm-photo-actions">
              <button
                type="button"
                className="edm-btn"
                onClick={() => fileRef.current?.click()}
              >
                Upload new photo
              </button>
              {photo && (
                <button type="button" className="edm-btn edm-btn--ghost" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPhotoFile}
              />
            </div>
          </div>
        </section>

        <section className="edm-section">
          <h2 className="edm-section__title">Licence details</h2>
          {renderFields(LICENCE_FIELDS)}
        </section>

        <section className="edm-section">
          <h2 className="edm-section__title">Vehicle details</h2>
          {renderFields(VEHICLE_FIELDS)}
        </section>
      </div>
    </div>,
    document.body
  );
}
