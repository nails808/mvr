import { useState } from 'react';
import type { UserData } from '../data/UserData';
import { HologramOverlay } from '../components/HologramOverlay';
import { QrDialog } from '../components/QrDialog';
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="lic-detail-row">
      <span className="lic-detail-label">{label}</span>
      <span className="lic-detail-value">{value || '—'}</span>
    </div>
  );
}

/** Rough age check from DOB strings like "01 Jan 1990" */
function isOver18(dob: string): boolean {
  const d = Date.parse(dob);
  if (Number.isNaN(d)) return true;
  const age = (Date.now() - d) / (365.25 * 24 * 3600 * 1000);
  return age >= 18;
}

export function ViewLicenceScreen({
  userData,
  photoUri,
  embedded,
  onBack,
}: ViewLicenceScreenProps) {
  const [tab, setTab] = useState<LicenceTab>('Licence');
  const [showConsent, setShowConsent] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const fullName = `${userData.firstName} ${userData.lastName}`.toUpperCase();
  const isLicenced = userData.licenceStatus.toLowerCase().includes('licen') &&
    !userData.licenceStatus.toLowerCase().includes('unlicen');
  const over18 = isOver18(userData.dob);

  const startVerify = () => setShowConsent(true);
  const acceptConsent = () => {
    setShowConsent(false);
    setShowQr(true);
  };

  return (
    <div className={`view-licence ${embedded ? 'view-licence--embedded' : ''}`}>
      {!embedded && (
        <header className="view-licence-topbar">
          {onBack && (
            <button type="button" className="view-licence-back" onClick={onBack}>
              ‹ Back
            </button>
          )}
          <h1>Licence</h1>
        </header>
      )}

      {!isLicenced && (
        <div className="licence-warning" role="alert">
          ⚠️ One or more of these licences or permits is not current. It is illegal to drive or
          ride under this licence or permit.
        </div>
      )}

      {/* Digital card — original labels: DRIVER LICENCE, Victoria Australia */}
      <div className="licence-card">
        <HologramOverlay />

        <div className="licence-card__header">
          <img src={vlogo} alt="VicRoads" className="licence-card__logo" />
          <div className="licence-card__header-text">
            <div className="licence-card__title">DRIVER LICENCE</div>
            <div className="licence-card__subtitle">Victoria Australia</div>
          </div>
          <div
            className={`licence-card__status-pill ${
              isLicenced ? 'licence-card__status-pill--ok' : 'licence-card__status-pill--bad'
            }`}
          >
            {userData.licenceStatus}
          </div>
        </div>

        <div className="licence-card__body">
          <div className="licence-card__photo-col">
            {photoUri ? (
              <img src={photoUri} alt="Victorian driver licence photo" className="licence-card__photo" />
            ) : (
              <div className="licence-card__photo licence-card__photo--empty">
                <span>
                  Tap to
                  <br />
                  add photo
                </span>
              </div>
            )}
            <div className="licence-card__card-no">Card number {userData.cardNumber}</div>
          </div>

          <div className="licence-card__info-col">
            <div className="licence-card__name">{fullName}</div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Licence number</span>
              <span className="licence-card__field-value">{userData.licenceNumber}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Licence type</span>
              <span className="licence-card__field-value">{userData.licenceType}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Licence expiry</span>
              <span className="licence-card__field-value">{userData.licenceExpiry}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Date of birth</span>
              <span className="licence-card__field-value">{userData.dob}</span>
            </div>
          </div>
        </div>

        <div className="licence-card__footer">
          <span>
            {userData.proficiency} · {userData.conditions}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="licence-tabs" role="tablist">
        {LICENCE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`licence-tabs__btn ${tab === t ? 'licence-tabs__btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="licence-panel" role="tabpanel">
        {tab === 'Licence' && (
          <>
            <div className="lic-section-header">Car licence details</div>
            <DetailRow label="Licence number" value={userData.licenceNumber} />
            <DetailRow label="Licence type" value={userData.licenceType} />
            <DetailRow label="Proficiency" value={userData.proficiency} />
            <DetailRow label="Licence status" value={userData.licenceStatus} />
            <DetailRow label="Issue date" value={userData.issueDate} />
            <DetailRow label="Licence expiry" value={userData.licenceExpiry} />
            <DetailRow label="Conditions" value={userData.conditions} />
            <div className="lic-section-header">Other details</div>
            <DetailRow label="Card number" value={userData.cardNumber} />
          </>
        )}

        {tab === 'Identity' && (
          <>
            <DetailRow label="First name" value={userData.firstName} />
            <DetailRow label="Last name" value={userData.lastName} />
            <DetailRow label="Date of birth" value={userData.dob} />
            <DetailRow label="Address" value={userData.address} />
            <DetailRow label="Licence number" value={userData.licenceNumber} />
            <p className="licence-panel-note">
              Full name, birth date and address — suitable for identity verification.
            </p>
          </>
        )}

        {tab === 'Age' && (
          <>
            <div className="age-highlight">
              <div className="age-highlight__label">Age status</div>
              <div className="age-highlight__value">{over18 ? 'Over 18' : 'Under 18'}</div>
              <div className="age-highlight__dob">Date of birth · {userData.dob}</div>
            </div>
            <DetailRow
              label="Full name"
              value={`${userData.firstName} ${userData.lastName}`}
            />
            <DetailRow label="Licence status" value={userData.licenceStatus} />
          </>
        )}
      </div>

      <div className="licence-actions">
        <button type="button" className="licence-verify-btn" onClick={startVerify}>
          Verify Licence
        </button>
      </div>

      {/* Victoria Police barcode — displayed below Verify Licence at full width */}
      <div className="licence-barcode-block">
        <div className="licence-barcode-label">Victoria Police barcode</div>
        <LicenceBarcode value={userData.licenceNumber} />
      </div>

      {/* Consent sheet — original copy before QR */}
      {showConsent && (
        <div className="modal-backdrop" onClick={() => setShowConsent(false)}>
          <div className="modal qr-consent-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Do you consent to share your information?</h3>
            <p className="consent-lead">
              Presenting a QR code allows your driver licence information to be scanned and shared.
            </p>
            <p className="consent-body">
              By presenting this QR code you consent to share some or all of your driver licence
              information, including with scanners, venues and law enforcement agencies. They may
              retain your information in accordance with their business practices and legal
              requirements.
            </p>
            <p className="consent-sharing-title">You&apos;re sharing:</p>
            <ul className="consent-list">
              <li>Full name, birth date and address</li>
              <li>Licence number, type and expiry date</li>
              <li>Licence status</li>
              <li>Proficiency</li>
              <li>Victorian driver licence photo</li>
            </ul>
            <div className="modal-actions consent-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowConsent(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={acceptConsent}>
                Reveal QR code
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <QrDialog
          userData={userData}
          photoUri={photoUri}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
}
