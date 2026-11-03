/**
 * UserData model — 1:1 mapping of the original Kotlin data class
 * stored in DataStore as JSON under key "user_data".
 */
export interface UserData {
  firstName: string;
  lastName: string;
  licenceNumber: string;
  licenceExpiry: string;
  licenceType: string;
  dob: string;
  address: string;
  issueDate: string;
  proficiency: string;
  licenceStatus: string;
  conditions: string;
  cardNumber: string;
  demeritPoints: number;
  demeritMax: number;
  vehicleRego: string;
  vehicleStatus: string;
  vehicleDescription: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColour: string;
  vehicleVin: string;
  vehicleEngineNumber: string;
  vehicleRegSerial: string;
  vehicleCompliancePlate: string;
  vehicleStolenStatus: string;
  vehicleSanctions: string;
  vehicleGoodsCarrying: string;
  vehicleTransferInDispute: string;
  vehicleExpiry: string;
  isUnlocked: boolean;
}

/** Default sample data matching the original APK constructor defaults */
export const DEFAULT_USER_DATA: UserData = {
  firstName: 'Alex',
  lastName: 'Sample',
  licenceNumber: '012345678',
  licenceExpiry: '01 Jan 2028',
  licenceType: 'Car',
  dob: '01 Jan 1990',
  address: 'U 1 / 1 EXAMPLE ST\nMELBOURNE VIC 3000',
  issueDate: '01 Jan 2025',
  proficiency: 'Full',
  licenceStatus: 'Licenced',
  conditions: 'No conditions',
  cardNumber: '0000001',
  demeritPoints: 0,
  demeritMax: 12,
  vehicleRego: '1XYZ123',
  vehicleStatus: 'Current',
  vehicleDescription: '2020 WHITE TOYOTA CAMRY',
  vehicleMake: 'TOYOTA',
  vehicleModel: 'CAMRY',
  vehicleYear: '2020',
  vehicleColour: 'WHITE',
  vehicleVin: 'JT2BF22K000000001',
  vehicleEngineNumber: '00000000000001',
  vehicleRegSerial: '0000001',
  vehicleCompliancePlate: '01/2020',
  vehicleStolenStatus: 'No',
  vehicleSanctions: 'None',
  vehicleGoodsCarrying: 'No',
  vehicleTransferInDispute: 'No',
  vehicleExpiry: '01/01/2027',
  isUnlocked: false,
};

export const STORAGE_KEYS = {
  USER_DATA: 'myvicroads_user_data',
  PHOTO_URI: 'myvicroads_photo_uri',
} as const;
