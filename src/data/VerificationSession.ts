/**
 * Payload written to Firebase RTDB /sessions/{id}.json
 * Matches original VerificationSession data class fields used in createSession.
 */
export interface VerificationSession {
  name: string;
  address: string;
  licenceNumber: string;
  licenceStatus: string;
  proficiency: string;
  licenceExpiry: string;
  dob: string;
  licenceType: string;
  createdAt: number;
  expiresAt: number;
  photoBase64: string | null;
  scannedAt: number | null;
}
