import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import type { UserData } from '../data/UserData';
import {
  createSession,
  isScanned,
  type CreateSessionResult,
} from '../data/VerificationRepository';
import { LicenceBarcode } from '../components/LicenceBarcode';
import { HologramOverlay } from '../components/HologramOverlay';
import { LICENCE_TABS, type LicenceTab } from '../components/LicenceTab';
import vlogo from '../assets/vlogo_nobg.png';
import './ViewLicenceScreen.css';

interface ViewLicenceScreenProps {
  userData: UserData;
  photoUri: string | null;
  embedded?: boolean;
  onBack?: () => void;
  onUserDataChange?: (data: UserData) => void;
  onPhotoChange?: (uri: string | null) => void;
}


type QrPhase = 'hidden' | 'loading' | 'ready' | 'verified' | 'expired' | 'error';

function isOver18(dob: string): boolean {
  const d = Date.parse(dob);
  if (Number.isNaN(d)) return true;
  return (Date.now() - d) / (365.25 * 24 * 3600 * 1000) >= 18;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseFlexibleDate(raw: string): Date | null {
  const s = (raw || '').trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

/** Expired if expiry is today or earlier; Current if after today */
function isLicenceCurrentByExpiry(expiry: string): boolean {
  const exp = parseFlexibleDate(expiry);
  if (!exp) return true;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return exp.getTime() > today.getTime();
}

function signatureText(firstName: string, lastName: string): string {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  if (f && l) return `${f}${l}`;
  return f || l || '';
}

function formatLastRefreshed(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = days[d.getDay()];
  const dd = d.getDate();
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${day} ${dd} ${mon} ${yyyy} ${h}:${m}${ampm}`;
}

function maskCardNumber(value: string): string {
  const digits = (value || '').replace(/\s/g, '');
  if (!digits) return '•••••••';
  return '•'.repeat(Math.max(digits.length, 7));
}

export function ViewLicenceScreen({
  userData,
  photoUri,
  onBack,
}: ViewLicenceScreenProps) {
  const [tab, setTab] = useState<LicenceTab>('Licence');
  const [lastRefreshed] = useState(() => new Date());
  const [cardRevealed, setCardRevealed] = useState(false);

  const [qrPhase, setQrPhase] = useState<QrPhase>('hidden');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const [fullscreenBarcode, setFullscreenBarcode] = useState(false);
  const sessionRef = useRef<CreateSessionResult | null>(null);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const displayName = `${userData.firstName} ${userData.lastName}`.trim().toUpperCase();
  const over18 = isOver18(userData.dob);
  const licenceCurrent = isLicenceCurrentByExpiry(userData.licenceExpiry);
  const sig = signatureText(userData.firstName, userData.lastName);

  const clearTimers = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  };

  useEffect(() => () => clearTimers(), []);

  const revealQr = async () => {
    clearTimers();
    setQrPhase('loading');
    setErrorMsg('');
    setQrDataUrl(null);
    try {
      const session = await createSession(userData, photoUri);
      sessionRef.current = session;
      // Crisp 2D matrix QR (module grid)
      const dataUrl = await QRCode.toDataURL(session.verifyUrl, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
      setRemainingMs(session.expiresAt - Date.now());
      setQrPhase('ready');

      tickRef.current = window.setInterval(() => {
        const left = (sessionRef.current?.expiresAt ?? 0) - Date.now();
        setRemainingMs(left);
        if (left <= 0) {
          setQrPhase((p) => (p === 'verified' ? p : 'expired'));
          clearTimers();
        }
      }, 250);

      pollRef.current = window.setInterval(async () => {
        const id = sessionRef.current?.sessionId;
        if (!id) return;
        if (await isScanned(id)) {
          setQrPhase('verified');
          clearTimers();
        }
      }, 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not create verification session');
      setQrPhase('error');
    }
  };





  const photoEl = (
    <div className="dl-photo-stack">
      {photoUri ? (
        <img src={photoUri} alt="Licence photo" className="dl-photo" />
      ) : (
        <div className="dl-photo dl-photo--empty">
          <span>No photo</span>
        </div>
      )}
      <HologramOverlay />
    </div>
  );

  return (
    <div className="view-licence dl">
      <header className="vd-top">
        <button
          type="button"
          className="vd-top__back"
          onClick={() => onBack?.()}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="vd-top__title">View details</h1>
        <span className="vd-top__spacer" aria-hidden />
      </header>
      <p className="vd-refreshed">Last refreshed: {formatLastRefreshed(lastRefreshed)}</p>

      <header className="dl-header">
        <div className="dl-header__text">
          <div className="dl-header__title">DRIVER LICENCE</div>
          <div className="dl-header__sub">Victoria Australia</div>
        </div>
        <img src={vlogo} alt="VicRoads" className="dl-header__logo" />
      </header>

      <section className="dl-band">
        <div className="dl-band__inner">
          <div className="dl-band__photo">{photoEl}</div>
          <div className="dl-band__panel">
            {qrPhase === 'hidden' && (
              <div className="dl-consent">
                <p className="dl-consent__lead">
                  Presenting a QR code allows your driver licence information to be scanned and
                  shared.
                </p>
                <p className="dl-consent__ask">Do you consent to share your information?</p>
                <button type="button" className="dl-consent__btn" onClick={() => void revealQr()}>
                  Reveal QR code
                </button>
              </div>
            )}
            {qrPhase === 'loading' && (
              <div className="dl-qr-panel dl-qr-panel--status">
                <div className="dl-spinner" />
                <p>Generating secure QR code…</p>
              </div>
            )}
            {qrPhase === 'error' && (
              <div className="dl-qr-panel dl-qr-panel--status">
                <p className="dl-error">{errorMsg}</p>
                <button type="button" className="dl-consent__btn" onClick={() => void revealQr()}>
                  Try again
                </button>
              </div>
            )}
            {(qrPhase === 'ready' || qrPhase === 'verified' || qrPhase === 'expired') &&
              qrDataUrl && (
                <button
                  type="button"
                  className="dl-qr-panel dl-qr-panel--clickable"
                  onClick={() => setFullscreenQr(true)}
                  aria-label="Open QR code full screen"
                >
                  <div className="dl-qr-panel__label">
                    Check licence
                    {qrPhase === 'verified' && <span className="dl-qr-panel__badge">✓</span>}
                    {qrPhase === 'expired' && (
                      <span className="dl-qr-panel__badge dl-qr-panel__badge--warn">!</span>
                    )}
                  </div>
                  <img
                    src={qrDataUrl}
                    alt="Verification QR code"
                    className="dl-qr-panel__img dl-qr-matrix"
                    draggable={false}
                  />
                  <div className="dl-qr-panel__expires">
                    {qrPhase === 'expired'
                      ? 'QR expired'
                      : qrPhase === 'verified'
                        ? 'Verified'
                        : `QR expires ${formatCountdown(remainingMs)}`}
                  </div>
                </button>
              )}
          </div>
        </div>
      </section>

      <div className="dl-seg-wrap">
        <div className="dl-seg" role="tablist">
          {LICENCE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`dl-seg__btn ${tab === t ? 'dl-seg__btn--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="dl-panel" role="tabpanel">
        {tab === 'Licence' && (
          <div className="lic-sheet">
            <h2 className="lic-sheet__name">{displayName}</h2>

            <div className="lic-sheet__grid">
              <div className="lic-sheet__cell">
                <div className="lic-sheet__label">Licence number</div>
                <div className="lic-sheet__value">{userData.licenceNumber}</div>
              </div>
              <div className="lic-sheet__cell">
                <div className="lic-sheet__label">Expiry</div>
                <div className="lic-sheet__value">{userData.licenceExpiry}</div>
              </div>
              <div className="lic-sheet__cell">
                <div className="lic-sheet__label">Licence type</div>
                <div className="lic-sheet__value">{userData.licenceType}</div>
              </div>
              <div className="lic-sheet__cell">
                <div className="lic-sheet__label">Date of birth</div>
                <div className="lic-sheet__value">{userData.dob}</div>
              </div>
            </div>

            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Address</div>
              <div className="lic-sheet__value lic-sheet__value--multi">
                {(userData.address || '—').toUpperCase()}
              </div>
            </div>

            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Signature</div>
              <div className="lic-signature" aria-label={`Signature of ${displayName}`}>
                {sig}
              </div>
            </div>

            <div className="lic-sheet__section-bar">Car licence details</div>

            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Licence status</div>
              <div
                className={`lic-status ${licenceCurrent ? 'lic-status--current' : 'lic-status--expired'}`}
              >
                <span className="lic-status__icon" aria-hidden>
                  {licenceCurrent ? '✓' : '✕'}
                </span>
                <span className="lic-status__text">
                  {licenceCurrent ? 'Current' : 'Expired'}
                </span>
              </div>
            </div>

            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Proficiency</div>
              <div className="lic-sheet__value">{userData.proficiency || '—'}</div>
            </div>
            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Issue date</div>
              <div className="lic-sheet__value">{userData.issueDate || '—'}</div>
            </div>
            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Expiry</div>
              <div className="lic-sheet__value">{userData.licenceExpiry || '—'}</div>
            </div>

            <div className="lic-sheet__section-bar">Other details</div>

            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Conditions</div>
              <div className="lic-sheet__value lic-sheet__value--multi">
                {userData.conditions || '—'}
              </div>
            </div>

            <div className="lic-sheet__block lic-sheet__card-row">
              <div className="lic-sheet__card-main">
                <div className="lic-sheet__label">Card number</div>
                <div className="lic-sheet__value lic-sheet__card-num">
                  {cardRevealed
                    ? userData.cardNumber || '—'
                    : maskCardNumber(userData.cardNumber)}
                </div>
              </div>
              <button
                type="button"
                className="lic-eye"
                onClick={() => setCardRevealed((v) => !v)}
                aria-label={cardRevealed ? 'Hide card number' : 'Show card number'}
                aria-pressed={cardRevealed}
              >
                {cardRevealed ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="button"
              className="lic-sheet__barcode lic-sheet__barcode--btn"
              onClick={() => setFullscreenBarcode(true)}
              aria-label="Open Victoria Police barcode full screen"
            >
              <div className="lic-sheet__label">Victoria Police barcode</div>
              <LicenceBarcode value={userData.licenceNumber} />
            </button>
          </div>
        )}

        {tab === 'Identity' && (
          <div className="lic-sheet">
            <h2 className="lic-sheet__name">{displayName}</h2>
            <div className="lic-sheet__block">
              <div className="lic-sheet__label">Address</div>
              <div className="lic-sheet__value lic-sheet__value--multi">
                {(userData.address || '—').toUpperCase()}
              </div>
            </div>
            <div className="lic-sheet__block lic-sheet__block--sig">
              <div className="lic-sheet__label">Signature</div>
              <div className="lic-signature" aria-label={`Signature of ${displayName}`}>
                {sig}
              </div>
            </div>
          </div>
        )}

        {tab === 'Age' && (
          <div className="lic-sheet lic-sheet--age">
            <div className="lic-sheet__label">Age status</div>
            <div className={`lic-status ${over18 ? 'lic-status--current' : 'lic-status--expired'}`}>
              <span className="lic-status__icon" aria-hidden>
                {over18 ? '✓' : '✕'}
              </span>
              <span className="lic-status__text">{over18 ? 'Over 18' : 'Under 18'}</span>
            </div>
          </div>
        )}
      </div>

            {fullscreenQr &&
        qrDataUrl &&
        createPortal(
          <div className="dl-fs" role="dialog" aria-modal>
            <header className="dl-fs__header">
              <button
                type="button"
                className="dl-fs__back"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFullscreenQr(false);
                }}
                aria-label="Back"
              >
                ‹
              </button>
              <h2 className="dl-fs__title">Verify Age</h2>
              <span className="dl-fs__spacer" aria-hidden />
            </header>
            <div className="dl-fs__body">
              <img src={qrDataUrl} alt="Verification QR code" className="dl-fs__qr dl-qr-matrix" draggable={false} />
              <p className="dl-fs__expires">
                {qrPhase === 'expired' ? (
                  'QR expired'
                ) : (
                  <>
                    QR expires <strong>{formatCountdown(remainingMs)}</strong>
                  </>
                )}
              </p>
              <p className="dl-fs__legal">
                By presenting this QR code you consent to share some or all of your driver licence
                information, including with scanners, venues and law enforcement agencies. They may
                retain your information in accordance with their business practices and legal
                requirements.
              </p>
              <div className="dl-fs__sharing">
                <p className="dl-fs__sharing-title">You&apos;re sharing:</p>
                <ul className="dl-fs__sharing-list">
                  <li>Victorian driver licence photo</li>
                  <li>Full name, birth date and address</li>
                  <li>Licence number, type and expiry date</li>
                  <li>Licence status</li>
                  <li>Proficiency</li>
                </ul>
              </div>
            </div>
          </div>,
          document.body
        )}

      {fullscreenBarcode &&
        createPortal(
          <div className="dl-fs dl-fs--barcode" role="dialog" aria-modal>
            <header className="dl-fs__header">
              <button
                type="button"
                className="dl-fs__back"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFullscreenBarcode(false);
                }}
                aria-label="Back"
              >
                ‹
              </button>
              <h2 className="dl-fs__title">Verify Barcode</h2>
              <span className="dl-fs__spacer" aria-hidden />
            </header>
            <div className="dl-fs__body dl-fs__body--barcode">
              <h3 className="dl-fs__barcode-heading">Victoria Police barcode</h3>
              <div className="dl-fs__barcode-wrap">
                <LicenceBarcode value={userData.licenceNumber} />
              </div>
              <p className="dl-fs__barcode-note">
                The person who scans this code will only validate your licence number. No other data
                will be shared. Please see our{' '}
                <a
                  className="dl-fs__link"
                  href="https://www.vicroads.vic.gov.au/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy policy
                </a>{' '}
                for more information.
              </p>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
