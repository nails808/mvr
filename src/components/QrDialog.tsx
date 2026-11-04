import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  createSession,
  isScanned,
  type CreateSessionResult,
} from '../data/VerificationRepository';
import type { UserData } from '../data/UserData';
import './QrDialog.css';

type Phase = 'loading' | 'ready' | 'verified' | 'expired' | 'error';

interface QrDialogProps {
  userData: UserData;
  photoUri: string | null;
  onClose: () => void;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QrDialog({ userData, photoUri, onClose }: QrDialogProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const sessionRef = useRef<CreateSessionResult | null>(null);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await createSession(userData, photoUri);
        if (cancelled) return;
        sessionRef.current = session;

        const dataUrl = await QRCode.toDataURL(session.verifyUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0D2D6B', light: '#FFFFFF' },
        });
        if (cancelled) return;

        setQrDataUrl(dataUrl);
        setRemainingMs(session.expiresAt - Date.now());
        setPhase('ready');

        // Countdown
        tickRef.current = window.setInterval(() => {
          const left = (sessionRef.current?.expiresAt ?? 0) - Date.now();
          setRemainingMs(left);
          if (left <= 0) {
            setPhase((p) => (p === 'verified' ? p : 'expired'));
            if (pollRef.current) window.clearInterval(pollRef.current);
            if (tickRef.current) window.clearInterval(tickRef.current);
          }
        }, 250);

        // Poll scannedAt every 2s
        pollRef.current = window.setInterval(async () => {
          const id = sessionRef.current?.sessionId;
          if (!id) return;
          const scanned = await isScanned(id);
          if (scanned && !cancelled) {
            setPhase('verified');
            if (pollRef.current) window.clearInterval(pollRef.current);
            if (tickRef.current) window.clearInterval(tickRef.current);
          }
        }, 2000);
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Could not create verification session');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [userData, photoUri]);

  return createPortal(
    <div className="qr-backdrop" onClick={onClose}>
      <div className="qr-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="qr-dialog__header">
          <h2 className="qr-dialog__title">
            {phase === 'verified' ? 'Licence Verified!' : 'Verification QR Code'}
          </h2>
          <button type="button" className="qr-dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="qr-dialog__body">
          {phase === 'loading' && (
            <div className="qr-status">
              <div className="qr-spinner" />
              <p>Generating secure QR code…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="qr-status qr-status--error">
              <p>{errorMsg}</p>
              <p className="qr-status-hint">
                Check your network connection. The verification service must be reachable.
              </p>
            </div>
          )}

          {phase === 'ready' && qrDataUrl && (
            <>
              <img src={qrDataUrl} alt="Verification QR code" className="qr-image" />
              <p className="qr-expires">
                QR expires {formatCountdown(remainingMs)}
              </p>
              <div className="qr-sharing">
                <p className="qr-sharing__title">You&apos;re sharing:</p>
                <ul className="qr-sharing__list">
                  <li>Full name, birth date and address</li>
                  <li>Licence number, type and expiry date</li>
                  <li>Licence status</li>
                  <li>Proficiency</li>
                </ul>
              </div>
            </>
          )}

          {phase === 'verified' && (
            <div className="qr-status qr-status--success">
              <div className="qr-check">✓</div>
              <p>Your licence was successfully verified by the scanner.</p>
            </div>
          )}

          {phase === 'expired' && (
            <div className="qr-status">
              <p>This QR code has expired.</p>
              <p className="qr-status-hint">Close and tap Verify Licence again to generate a new one.</p>
            </div>
          )}
        </div>

        <div className="qr-dialog__footer">
          <button type="button" className="btn-primary qr-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
