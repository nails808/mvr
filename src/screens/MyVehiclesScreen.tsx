import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserData } from '../data/UserData';
import './VehiclesScreen.css';

interface MyVehiclesScreenProps {
  userData: UserData;
  onUserDataChange: (data: UserData) => void;
}

type VehicleField =
  | 'vehicleRego'
  | 'vehicleStatus'
  | 'vehicleDescription'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'vehicleYear'
  | 'vehicleColour'
  | 'vehicleVin'
  | 'vehicleEngineNumber'
  | 'vehicleRegSerial'
  | 'vehicleCompliancePlate'
  | 'vehicleStolenStatus'
  | 'vehicleSanctions'
  | 'vehicleGoodsCarrying'
  | 'vehicleTransferInDispute'
  | 'vehicleExpiry';

const FIELD_LABELS: Record<VehicleField, string> = {
  vehicleRego: 'Registration number',
  vehicleStatus: 'Status',
  vehicleDescription: 'Description',
  vehicleMake: 'Make',
  vehicleModel: 'Model',
  vehicleYear: 'Year',
  vehicleColour: 'Colour',
  vehicleVin: 'VIN/Chassis',
  vehicleEngineNumber: 'Engine number',
  vehicleRegSerial: 'Reg serial number',
  vehicleCompliancePlate: 'Compliance plate date',
  vehicleStolenStatus: 'Stolen status',
  vehicleSanctions: 'Sanctions',
  vehicleGoodsCarrying: 'Goods carrying',
  vehicleTransferInDispute: 'Transfer in dispute',
  vehicleExpiry: 'Expiry',
};

const ALL_FIELDS: VehicleField[] = [
  'vehicleRego',
  'vehicleStatus',
  'vehicleDescription',
  'vehicleMake',
  'vehicleModel',
  'vehicleYear',
  'vehicleColour',
  'vehicleVin',
  'vehicleEngineNumber',
  'vehicleRegSerial',
  'vehicleCompliancePlate',
  'vehicleExpiry',
  'vehicleStolenStatus',
  'vehicleSanctions',
  'vehicleGoodsCarrying',
  'vehicleTransferInDispute',
];

export function MyVehiclesScreen({ userData, onUserDataChange }: MyVehiclesScreenProps) {
  const unlocked = Boolean(userData.isUnlocked);
  const [editingField, setEditingField] = useState<VehicleField | null>(null);
  const [draft, setDraft] = useState('');

  const openEdit = (key: VehicleField) => {
    if (!unlocked) return;
    setDraft(String(userData[key] ?? ''));
    setEditingField(key);
  };

  const saveEdit = () => {
    if (!editingField) return;
    onUserDataChange({
      ...userData,
      [editingField]: draft,
    });
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const statusIsCurrent =
    userData.vehicleStatus.toLowerCase() === 'current' ||
    userData.vehicleStatus.toLowerCase() === 'registered';

  const editModal =
    editingField &&
    createPortal(
      <div
        className="modal-backdrop"
        role="presentation"
        onClick={cancelEdit}
      >
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-edit-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title" id="vehicle-edit-title">
            {FIELD_LABELS[editingField]}
          </h3>
          <input
            className="modal-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={saveEdit}>
              Save
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="vehicles-screen vehicles-screen--detail">
      <section className="vehicle-hero">
        <div className="vehicle-hero__rego">{userData.vehicleRego}</div>
        <div className="vehicle-hero__desc">{userData.vehicleDescription}</div>
        <span
          className={`vehicle-hero__status ${
            statusIsCurrent ? 'vehicle-hero__status--ok' : 'vehicle-hero__status--warn'
          }`}
        >
          {userData.vehicleStatus}
        </span>
      </section>

      <section className="vehicles-section">
        <h2 className="vehicles-section-title">Vehicle details</h2>
        <div className="vehicles-card">
          {ALL_FIELDS.map((key) => {
            const canEdit = unlocked;
            return (
              <div
                key={key}
                role={canEdit ? 'button' : undefined}
                tabIndex={canEdit ? 0 : undefined}
                className={`vehicles-row ${canEdit ? 'vehicles-row--editable' : ''}`}
                onClick={() => openEdit(key)}
                onKeyDown={(e) => {
                  if (canEdit && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openEdit(key);
                  }
                }}
              >
                <span className="vehicles-row-label">{FIELD_LABELS[key]}</span>
                <span className="vehicles-row-value">{userData[key] || '—'}</span>
                {canEdit && <span className="vehicles-row-chevron">›</span>}
              </div>
            );
          })}
        </div>
        {!unlocked && (
          <p className="vehicles-lock-hint">Unlock editing on Profile to change vehicle details.</p>
        )}
      </section>

      {editModal}
    </div>
  );
}
