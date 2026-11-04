import type { UserData } from '../data/UserData';
import './VehiclesScreen.css';

interface MyVehiclesScreenProps {
  userData: UserData;
  onUserDataChange?: (data: UserData) => void;
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

export function MyVehiclesScreen({ userData }: MyVehiclesScreenProps) {
  const statusIsCurrent =
    userData.vehicleStatus.toLowerCase() === 'current' ||
    userData.vehicleStatus.toLowerCase() === 'registered';

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
          {ALL_FIELDS.map((key) => (
            <div key={key} className="vehicles-row">
              <span className="vehicles-row-label">{FIELD_LABELS[key]}</span>
              <span className="vehicles-row-value">{userData[key] || '—'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
