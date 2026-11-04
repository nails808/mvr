import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import type { UserData } from '../data/UserData';
import {
  createSession,
  isScanned,
  type CreateSessionResult,
} from '../data/VerificationRepository';
import { LicenceBarcode } from '../components/LicenceBarcode';
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

type LicenceEditKey = keyof Pick<
  UserData,
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'address'
  | 'licenceNumber'
  | 'licenceType'
  | 'proficiency'
  | 'licenceStatus'
  | 'issueDate'
  | 'licenceExpiry'
  | 'conditions'
  | 'cardNumber'
>;

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

export function ViewLicenceScreen({
  userData,
  photoUri,
  onUserDataChange,
  onPhotoChange,
}: ViewLicenceScreenProps) {
  const [tab, setTab] = useState<LicenceTab>('Licence');
  const [editing, setEditing] = useState<{ key: LicenceEditKey; label: string } | null>(null);
  const [draft, setDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // QR flow (picture 1 → 2 → 3)
  const [qrPhase, setQrPhase] = useState<QrPhase>('hidden');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const sessionRef = useRef<CreateSessionResult | null>(null);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const unlocked = userData.isUnlocked;
  const displayName = `${userData.firstName} ${userData.lastName}`.trim();
  const over18 = isOver18(userData.dob);

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
      const dataUrl = await QRCode.toDataURL(session.verifyUrl, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
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

  const openEdit = (key: LicenceEditKey, label: string) => {
    if (!unlocked || !onUserDataChange) return;
    setDraft(String(userData[key] ?? ''));
    setEditing({ key, label });
  };

  const saveEdit = () => {
    if (!editing || !onUserDataChange) return;
    onUserDataChange({ ...userData, [editing.key]: draft });
    setEditing(null);
  };

  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoChange) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onPhotoChange(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const DetailRow = ({
    label,
    value,
    field,
  }: {
    label: string;
    value: string;
    field?: LicenceEditKey;
  }) => {
    const canEdit = unlocked && field && onUserDataChange;
    if (canEdit) {
      return (
        <button
          type="button"
          className="lic-detail-row lic-detail-row--editable"
          onClick={() => openEdit(field, label)}
        >
          <span className="lic-detail-label">{label}</span>
          <span className="lic-detail-value">{value || '—'}</span>
          <span className="lic-detail-chevron">›</span>
        </button>
      );
    }
    return (
      <div className="lic-detail-row">
        <span className="lic-detail-label">{label}</span>
        <span className="lic-detail-value">{value || '—'}</span>
      </div>
    );
  };

  const photoEl = (
    <>
      {unlocked && onPhotoChange ? (
        <label className="dl-photo-btn dl-photo-btn--editable">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="dl-photo-input"
            onChange={onPhotoFile}
          />
          {photoUri ? (
            <img src={photoUri} alt="Licence photo" className="dl-photo" />
          ) : (
            <div className="dl-photo dl-photo--empty">
              <span>
                Tap to
                <br />
                add photo
              </span>
            </div>
          )}
        </label>
      ) : photoUri ? (
        <img src={photoUri} alt="Licence photo" className="dl-photo" />
      ) : (
        <div className="dl-photo dl-photo--empty">
          <span>No photo</span>
        </div>
      )}
    </>
  );

  return (
    <div className="view-licence view-licence--embedded dl">
      {/* Picture 1/2 header */}
      <header className="dl-header">
        <div className="dl-header__text">
          <div className="dl-header__title">Driver licence</div>
          <div className="dl-header__sub">Victoria Australia</div>
        </div>
        <img src={vlogo} alt="VicRoads" className="dl-header__logo" />
      </header>

      {/* Mint band: photo + consent OR QR */}
      <section className="dl-band">
        <div className="dl-band__inner">
          <div className="dl-band__photo">{photoEl}</div>

          <div className="dl-band__panel">
            {qrPhase === 'hidden' && (
              <div className="dl-consent">
                <p className="dl-consent__lead">
                  Presenting a QR code allows your driver licence information to be accessed and
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
                  className="dl-qr-panel"
                  onClick={() => setFullscreenQr(true)}
                  aria-label="Open QR code full screen"
                >
                  <div className="dl-qr-panel__label">
                    Check licence
                    {qrPhase === 'verified' && <span className="dl-qr-panel__badge">✓</span>}
                    {qrPhase === 'expired' && <span className="dl-qr-panel__badge dl-qr-panel__badge--warn">!</span>}
                  </div>
                  <img src={qrDataUrl} alt="Verification QR code" className="dl-qr-panel__img" />
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

      {/* Tabs — picture 2 */}
      <div className="dl-tabs" role="tablist">
        {LICENCE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`dl-tabs__btn ${tab === t ? 'dl-tabs__btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="dl-panel" role="tabpanel">
        {tab === 'Licence' && (
          <>
            <h2 className="dl-name">{displayName}</h2>
            <div className="dl-grid">
              <div className="dl-grid__cell">
                <div className="dl-grid__label">Licence number</div>
                <div className="dl-grid__value">{userData.licenceNumber}</div>
              </div>
              <div className="dl-grid__cell">
                <div className="dl-grid__label">Licence expiry</div>
                <div className="dl-grid__value">{userData.licenceExpiry}</div>
              </div>
              <div className="dl-grid__cell">
                <div className="dl-grid__label">Date of birth</div>
                <div className="dl-grid__value">{userData.dob}</div>
              </div>
              <div className="dl-grid__cell">
                <div className="dl-grid__label">Licence type</div>
                <div className="dl-grid__value">{userData.licenceType}</div>
              </div>
            </div>
            <div className="lic-section-header">Driver licence details</div>
            <DetailRow label="Licence status" value={userData.licenceStatus} field="licenceStatus" />
            <DetailRow label="Proficiency" value={userData.proficiency} field="proficiency" />
            <DetailRow label="Issue date" value={userData.issueDate} field="issueDate" />
            <DetailRow label="Conditions" value={userData.conditions} field="conditions" />
            <DetailRow label="Card number" value={userData.cardNumber} field="cardNumber" />
          </>
        )}

        {tab === 'Identity' && (
          <>
            <h2 className="dl-name">{displayName}</h2>
            <DetailRow label="First name" value={userData.firstName} field="firstName" />
            <DetailRow label="Last name" value={userData.lastName} field="lastName" />
            <DetailRow label="Date of birth" value={userData.dob} field="dob" />
            <DetailRow label="Address" value={userData.address} field="address" />
            <DetailRow label="Licence number" value={userData.licenceNumber} field="licenceNumber" />
          </>
        )}

        {tab === 'Age' && (
          <>
            <div className="age-highlight">
              <div className="age-highlight__label">Age status</div>
              <div className="age-highlight__value">{over18 ? 'Over 18' : 'Under 18'}</div>
              <div className="age-highlight__dob">Date of birth · {userData.dob}</div>
            </div>
            <DetailRow label="First name" value={userData.firstName} field="firstName" />
            <DetailRow label="Last name" value={userData.lastName} field="lastName" />
            <DetailRow label="Licence status" value={userData.licenceStatus} field="licenceStatus" />
          </>
        )}
      </div>

      {/* Barcode replaces Verify Licence button */}
      <div className="licence-barcode-full">
        <LicenceBarcode value={userData.licenceNumber} />
      </div>

      {/* Fullscreen QR — picture 3 */}
      {fullscreenQr &&
        qrDataUrl &&
        createPortal(
          <div className="dl-fs" role="dialog" aria-modal>
            <header className="dl-fs__header">
              <h2 className="dl-fs__title">Verify Licence</h2>
              <button type="button" className="dl-fs__close" onClick={() => setFullscreenQr(false)}>
                Close
              </button>
            </header>
            <div className="dl-fs__body">
              <img src={qrDataUrl} alt="Verification QR code" className="dl-fs__qr" />
              <p className="dl-fs__expires">
                {qrPhase === 'expired'
                  ? 'QR expired'
                  : `QR expires ${formatCountdown(remainingMs)}`}
              </p>
              <p className="dl-fs__legal">
                By presenting this QR code you consent to share some or all of your driver licence
                information, including with economies, venues and law enforcement agencies. They may
                retain your information in accordance with their business practices and legal
                requirements.
              </p>
            </div>
          </div>,
          document.body
        )}

      {editing &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setEditing(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">{editing.label}</h3>
              {editing.key === 'address' ? (
                <textarea
                  className="modal-input modal-textarea"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  autoFocus
                />
              ) : (
                <input
                  className="modal-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                />
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={saveEdit}>
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
