import type { UserData } from './UserData';
import { VerificationConfig } from './VerificationConfig';
import type { VerificationSession } from './VerificationSession';

function randomSessionId(): string {
  // UUID without dashes, first 20 chars — same approach as original
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  return uuid.replace(/-/g, '').slice(0, 20);
}

/**
 * Resize image data-URL / blob-URL to 100×125 JPEG @ 75% and return Base64
 * (no data: prefix), matching the original Bitmap pipeline.
 */
async function photoToBase64(photoUri: string | null): Promise<string | null> {
  if (!photoUri) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 125;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        // cover-style crop into 100×125
        const scale = Math.max(100 / img.width, 125 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (100 - w) / 2;
        const y = (125 - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        resolve(base64);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = photoUri;
  });
}

export type CreateSessionResult = {
  sessionId: string;
  verifyUrl: string;
  expiresAt: number;
};

/**
 * Creates a verification session on Firebase RTDB and returns the public
 * verify URL to encode in the QR code.
 */
export async function createSession(
  userData: UserData,
  photoUri: string | null
): Promise<CreateSessionResult> {
  const sessionId = randomSessionId();
  const now = Date.now();
  const expiresAt = now + VerificationConfig.SESSION_TTL_MS;
  const photoBase64 = await photoToBase64(photoUri);

  const session: VerificationSession = {
    name: `${userData.firstName} ${userData.lastName}`.toUpperCase(),
    address: userData.address,
    licenceNumber: userData.licenceNumber,
    licenceStatus: userData.licenceStatus,
    proficiency: userData.proficiency,
    licenceExpiry: userData.licenceExpiry,
    dob: userData.dob,
    licenceType: userData.licenceType,
    createdAt: now,
    expiresAt,
    photoBase64,
    scannedAt: null,
  };

  const url = `${VerificationConfig.dbBaseUrl}/sessions/${sessionId}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });

  if (!res.ok) {
    throw new Error(`Failed to create session (${res.status})`);
  }

  // Original decompile referenced ?data= on the verify page
  const verifyUrl = `${VerificationConfig.verifyPage}?data=${sessionId}`;

  return { sessionId, verifyUrl, expiresAt };
}

/**
 * Polls whether a scanner has opened the verify page
 * (writes scannedAt on the session).
 */
export async function isScanned(sessionId: string): Promise<boolean> {
  try {
    const url = `${VerificationConfig.dbBaseUrl}/sessions/${sessionId}/scannedAt.json`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return false;
    const body = await res.text();
    const trimmed = body.trim();
    return trimmed !== 'null' && trimmed !== '' && trimmed !== 'undefined';
  } catch {
    return false;
  }
}
