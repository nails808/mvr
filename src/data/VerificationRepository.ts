import type { UserData } from './UserData';
import { VerificationConfig } from './VerificationConfig';
import type { VerificationSession } from './VerificationSession';

/** UUID without dashes, first 20 chars — matches APK createSession */
function randomSessionId(): string {
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
 * Read JPEG EXIF Orientation (1..8). Matches Android ExifInterface.TAG_ORIENTATION.
 * Returns 1 if missing / non-JPEG.
 */
async function readExifOrientation(blob: Blob): Promise<number> {
  try {
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        const len = view.getUint16(offset, false);
        const start = offset + 2;
        if (
          len >= 8 &&
          view.getUint32(start, false) === 0x45786966 &&
          view.getUint16(start + 4, false) === 0x0000
        ) {
          const tiff = start + 6;
          const little = view.getUint16(tiff, false) === 0x4949;
          const magic = view.getUint16(tiff, !little);
          if (magic !== 0x002a) return 1;
          let ifd0 = tiff + view.getUint32(tiff + 4, little);
          if (ifd0 + 2 > view.byteLength) return 1;
          const entries = view.getUint16(ifd0, little);
          ifd0 += 2;
          for (let i = 0; i < entries; i++) {
            const entry = ifd0 + i * 12;
            if (entry + 12 > view.byteLength) break;
            const tag = view.getUint16(entry, little);
            if (tag === 0x0112) {
              return view.getUint16(entry + 8, little) || 1;
            }
          }
        }
        offset += len;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else if (marker === 0xffda) {
        break;
      } else {
        const len = view.getUint16(offset, false);
        offset += len;
      }
    }
  } catch {
    /* ignore */
  }
  return 1;
}

/**
 * APK createSession photo pipeline:
 *   EXIF-rotate (0/90/180/270) → Bitmap.createScaledBitmap(100, 125, true)
 *   → JPEG compress → Base64 NO_WRAP (flag 2), no data: prefix
 */
async function photoToBase64(photoUri: string | null): Promise<string | null> {
  if (!photoUri) return null;

  try {
    let blob: Blob;
    if (photoUri.startsWith('data:')) {
      const res = await fetch(photoUri);
      blob = await res.blob();
    } else {
      const res = await fetch(photoUri);
      if (!res.ok) return null;
      blob = await res.blob();
    }

    const orientation = await readExifOrientation(blob);
    const bitmapUrl = URL.createObjectURL(blob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('image load failed'));
        el.src = bitmapUrl;
      });

      let rotateDeg = 0;
      switch (orientation) {
        case 3:
          rotateDeg = 180;
          break;
        case 6:
          rotateDeg = 90;
          break;
        case 8:
          rotateDeg = 270;
          break;
        default:
          rotateDeg = 0;
      }

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const swap = rotateDeg === 90 || rotateDeg === 270;
      const rotW = swap ? srcH : srcW;
      const rotH = swap ? srcW : srcH;

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rotCtx = rotCanvas.getContext('2d');
      if (!rotCtx) return null;

      rotCtx.translate(rotW / 2, rotH / 2);
      rotCtx.rotate((rotateDeg * Math.PI) / 180);
      rotCtx.drawImage(img, -srcW / 2, -srcH / 2);

      const out = document.createElement('canvas');
      out.width = 100;
      out.height = 125;
      const ctx = out.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(rotCanvas, 0, 0, 100, 125);

      const dataUrl = out.toDataURL('image/jpeg', 0.85);
      return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    } finally {
      URL.revokeObjectURL(bitmapUrl);
    }
  } catch {
    return null;
  }
}

/** Android Base64.URL_SAFE|NO_WRAP (flags 10) style encoding */
function base64UrlNoWrap(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * APK ViewLicenceScreenKt.buildFallbackUrl:
 * JSON { n,a,l,s,p,e,d,t,ts } → Base64 URL_SAFE|NO_WRAP →
 * https://mvr-verify.web.app/verify.html?data=<b64>
 */
export function buildFallbackVerifyUrl(userData: UserData): string {
  const payload = {
    n: `${userData.firstName} ${userData.lastName}`.toUpperCase(),
    a: userData.address,
    l: userData.licenceNumber,
    s: userData.licenceStatus,
    p: userData.proficiency,
    e: userData.licenceExpiry,
    d: userData.dob,
    t: userData.licenceType,
    ts: Date.now(),
  };
  const b64 = base64UrlNoWrap(JSON.stringify(payload));
  return `${VerificationConfig.verifyPage}?data=${b64}`;
}

export type CreateSessionResult = {
  sessionId: string | null;
  verifyUrl: string;
  expiresAt: number;
  isFallback: boolean;
};

/**
 * APK primary path: PUT session to RTDB, return verify.html?id={sessionId}
 * On failure: fallback verify.html?data={base64url json} (no sessionId)
 */
export async function createSession(
  userData: UserData,
  photoUri: string | null
): Promise<CreateSessionResult> {
  const expiresAt = Date.now() + VerificationConfig.SESSION_TTL_MS;

  if (!VerificationConfig.isConfigured()) {
    return {
      sessionId: null,
      verifyUrl: buildFallbackVerifyUrl(userData),
      expiresAt,
      isFallback: true,
    };
  }

  try {
    const sessionId = randomSessionId();
    const now = Date.now();
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
      expiresAt: now + VerificationConfig.SESSION_TTL_MS,
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
      throw new Error(`Firebase error ${res.status}`);
    }

    const verifyUrl = `${VerificationConfig.verifyPage}?id=${sessionId}`;
    return {
      sessionId,
      verifyUrl,
      expiresAt: session.expiresAt,
      isFallback: false,
    };
  } catch {
    return {
      sessionId: null,
      verifyUrl: buildFallbackVerifyUrl(userData),
      expiresAt,
      isFallback: true,
    };
  }
}

/**
 * APK isScanned: GET .../sessions/{id}/scannedAt.json — true if body ≠ null
 */
export async function isScanned(sessionId: string): Promise<boolean> {
  try {
    const url = `${VerificationConfig.dbBaseUrl}/sessions/${sessionId}/scannedAt.json`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return false;
    const body = (await res.text()).trim();
    return body !== 'null' && body !== '' && body !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * ISO/IEC 18004 QR Code (2D matrix) — same as APK ZXing BarcodeFormat.QR_CODE.
 * Not Data Matrix / PDF417 / Aztec.
 * Matches APK: 512px, ErrorCorrectionLevel.M, margin 1 module, black/white.
 */
export const QR_ENCODE_OPTIONS = {
  width: 512,
  margin: 1,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#000000', light: '#FFFFFF' },
};

/**
 * Encode content as an ISO/IEC 18004 QR Code PNG data-URL.
 */
export async function encodeIsoQrDataUrl(content: string): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(content, {
    width: QR_ENCODE_OPTIONS.width,
    margin: QR_ENCODE_OPTIONS.margin,
    errorCorrectionLevel: QR_ENCODE_OPTIONS.errorCorrectionLevel,
    color: QR_ENCODE_OPTIONS.color,
  });
}

