import { useState } from 'react';
import type { UserData } from '../data/UserData';
import './VehiclesScreen.css';

interface VehiclesScreenProps {
  userData: UserData;
  onUserDataChange: (data: UserData) => void;
  /** Hide the page title row (used when embedded in a stack with its own header) */
  hideHeader?: boolean;
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
  vehicleRego: 'Registration',
  vehicleStatus: 'Status',
  vehicleDescription: 'Description',
  vehicleMake: 'Make',
  vehicleModel: 'Model',
  vehicleYear: 'Year',
  vehicleColour: 'Colour',
  vehicleVin: 'VIN',
  vehicleEngineNumber: 'Engine number',
  vehicleRegSerial: 'Rego serial',
  vehicleCompliancePlate: 'Compliance plate',
  vehicleStolenStatus: 'Stolen status',
  vehicleSanctions: 'Sanctions',
  vehicleGoodsCarrying: 'Goods carrying',
  vehicleTransferInDispute: 'Transfer in dispute',
  vehicleExpiry: 'Registration expiry',
};

const DETAIL_FIELDS: VehicleField[] = [
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

const EDITABLE_ALL: VehicleField[] = [
  'vehicleRego',
  'vehicleStatus',
  'vehicleDescription',
  ...DETAIL_FIELDS,
];

export function VehiclesScreen({ userData, onUserDataChange, hideHeader }: VehiclesScreenProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState<Partial<UserData>>({});

  const openEdit = () => {
    const initial: Partial<UserData> = {};
    for (const key of EDITABLE_ALL) {
      initial[key] = userData[key];
    }
    setDraft(initial);
    setShowEdit(true);
  };

  const saveEdit = () => {
    onUserDataChange({ ...userData, ...draft });
    setShowEdit(false);
  };

  const statusIsCurrent =
    userData.vehicleStatus.toLowerCase() === 'current' ||
    userData.vehicleStatus.toLowerCase() === 'registered';

  return (
    <div className="vehicles-screen">
      {!hideHeader ? (
        <header className="vehicles-header">
          <h1>Vehicles</h1>
          <button type="button" className="vehicles-edit-btn" onClick={openEdit}>
            Edit
          </button>
        </header>
      ) : (
        <div className="vehicles-header vehicles-header--compact">
          <button type="button" className="vehicles-edit-btn" onClick={openEdit}>
            Edit
          </button>
        </div>
      )}

      {/* Primary rego card */}
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

      {/* Detail rows */}
      <section className="vehicles-section">
        <h2 className="vehicles-section-title">Vehicle details</h2>
        <div className="vehicles-card">
          {DETAIL_FIELDS.map((key) => (
            <div key={key} className="vehicles-row">
              <span className="vehicles-row-label">{FIELD_LABELS[key]}</span>
              <span className="vehicles-row-value">{userData[key] || '—'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Edit dialog */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal modal--sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <h3 className="modal-title">Edit vehicle</h3>
              <button type="button" className="modal-close" onClick={() => setShowEdit(false)}>
                ✕
              </button>
            </div>
            <div className="modal-sheet-body">
              {EDITABLE_ALL.map((key) => (
                <label key={key} className="edit-field">
                  <span className="edit-field-label">{FIELD_LABELS[key]}</span>
                  <input
                    className="modal-input"
                    value={String(draft[key] ?? '')}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions modal-actions--sticky">
              <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>
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
