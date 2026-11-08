import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createSession,
  isScanned,
  encodeDataMatrixDataUrl,
  type CreateSessionResult,
} from '../data/VerificationRepository';
import { VerificationConfig } from '../data/VerificationConfig';
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

/**
 * Full-screen verification dialog matching APK QrDialog behaviour:
 * - Primary: verify.html?id={sessionId}
 * - Fallback: verify.html?data={base64url json}
 * - Data Matrix 2D symbol
 * - 120s countdown; isScanned poll when secondsLeft % 3 === 0
 * - Auto-close when expired without scan
 */
export function QrDialog({ userData, photoUri, onClose }: QrDialogProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(VerificationConfig.SESSION_TTL_MS);
  const [errorMsg, setErrorMsg] = useState('');
  const sessionRef = useRef<CreateSessionResult | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    void (async () => {
      try {
        const session = await createSession(userData, photoUri);
        if (cancelled) return;
        sessionRef.current = session;

        const dataUrl = await encodeDataMatrixDataUrl(session.verifyUrl);
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setRemainingMs(session.expiresAt - Date.now());
        setPhase('ready');

        let secondsLeft = Math.ceil(VerificationConfig.SESSION_TTL_MS / 1000);
        const canPoll = !session.isFallback && !!session.sessionId;

        timerRef.current = window.setInterval(() => {
          secondsLeft -= 1;
          setRemainingMs(Math.max(0, secondsLeft) * 1000);

          if (secondsLeft <= 0) {
            clearTimer();
            setPhase((p) => (p === 'verified' ? p : 'expired'));
            if (sessionRef.current && !sessionRef.current.isFallback) {
              window.setTimeout(() => {
                if (!cancelled) onClose();
              }, 500);
            }
            return;
          }

          if (canPoll && secondsLeft % 3 === 0 && session.sessionId) {
            void isScanned(session.sessionId).then((scanned) => {
              if (scanned && !cancelled) {
                setPhase('verified');
                clearTimer();
              }
            });
          }
        }, 1000);
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Could not create verification session');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [userData, photoUri, onClose]);

  return createPortal(
    <div className="qr-backdrop" onClick={onClose}>
      <div
        className="qr-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="qr-dialog__header">
          <h2 className="qr-dialog__title">
            {phase === 'verified' ? 'Licence Verified!' : 'Verification code'}
          </h2>
          <button type="button" className="qr-dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="qr-dialog__body">
          {phase === 'loading' && (
            <div className="qr-status">
              <div className="qr-spinner" />
              <p>Generating secure code…</p>
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

          {(phase === 'ready' || phase === 'expired') && qrDataUrl && (
            <>
              <img
                src={qrDataUrl}
                alt="Verification Data Matrix"
                className="qr-image dl-qr-matrix"
              />
              <p className="qr-expires">
                {phase === 'expired' ? 'Code expired' : `Expires ${formatCountdown(remainingMs)}`}
              </p>
              <div className="qr-sharing">
                <p className="qr-sharing__title">You&apos;re sharing:</p>
                <ul className="qr-sharing__list">
                  <li>Victorian driver licence photo</li>
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
        </div>

        <div className="qr-dialog__footer">
          <button type="button" className="btn-primary qr-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
