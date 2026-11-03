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
  /** When true, parent already shows a back header (stack mode) */
  embedded?: boolean;
  onBack?: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="lic-detail-row">
      <span className="lic-detail-label">{label}</span>
      <span className="lic-detail-value">{value || '—'}</span>
    </div>
  );
}

export function ViewLicenceScreen({
  userData,
  photoUri,
  embedded,
  onBack,
}: ViewLicenceScreenProps) {
  const [tab, setTab] = useState<LicenceTab>('Licence');
  const [showQr, setShowQr] = useState(false);

  const fullName = `${userData.firstName} ${userData.lastName}`.toUpperCase();

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

      {/* Digital card */}
      <div className="licence-card">
        <HologramOverlay />

        <div className="licence-card__header">
          <img src={vlogo} alt="VicRoads" className="licence-card__logo" />
          <div className="licence-card__header-text">
            <div className="licence-card__title">Victorian</div>
            <div className="licence-card__subtitle">Driver Licence</div>
          </div>
          <div
            className={`licence-card__status-pill ${
              userData.licenceStatus.toLowerCase().includes('licen')
                ? 'licence-card__status-pill--ok'
                : ''
            }`}
          >
            {userData.licenceStatus}
          </div>
        </div>

        <div className="licence-card__body">
          <div className="licence-card__photo-col">
            {photoUri ? (
              <img src={photoUri} alt="Licence photo" className="licence-card__photo" />
            ) : (
              <div className="licence-card__photo licence-card__photo--empty">
                <span>PHOTO</span>
              </div>
            )}
            <div className="licence-card__card-no">Card {userData.cardNumber}</div>
          </div>

          <div className="licence-card__info-col">
            <div className="licence-card__name">{fullName}</div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Licence no.</span>
              <span className="licence-card__field-value">{userData.licenceNumber}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Type</span>
              <span className="licence-card__field-value">{userData.licenceType}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">Expires</span>
              <span className="licence-card__field-value">{userData.licenceExpiry}</span>
            </div>
            <div className="licence-card__field">
              <span className="licence-card__field-label">DOB</span>
              <span className="licence-card__field-value">{userData.dob}</span>
            </div>
          </div>
        </div>

        <LicenceBarcode value={userData.licenceNumber} />

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

      {/* Tab content */}
      <div className="licence-panel" role="tabpanel">
        {tab === 'Licence' && (
          <>
            <DetailRow label="Licence number" value={userData.licenceNumber} />
            <DetailRow label="Licence type" value={userData.licenceType} />
            <DetailRow label="Proficiency" value={userData.proficiency} />
            <DetailRow label="Status" value={userData.licenceStatus} />
            <DetailRow label="Issue date" value={userData.issueDate} />
            <DetailRow label="Expiry" value={userData.licenceExpiry} />
            <DetailRow label="Conditions" value={userData.conditions} />
            <DetailRow label="Card number" value={userData.cardNumber} />
          </>
        )}

        {tab === 'Identity' && (
          <>
            <DetailRow
              label="Full name"
              value={`${userData.firstName} ${userData.lastName}`}
            />
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
              <div className="age-highlight__label">Date of birth</div>
              <div className="age-highlight__value">{userData.dob}</div>
            </div>
            <DetailRow
              label="Full name"
              value={`${userData.firstName} ${userData.lastName}`}
            />
            <DetailRow label="Licence status" value={userData.licenceStatus} />
            <p className="licence-panel-note">
              Present this tab when only age verification is required.
            </p>
          </>
        )}
      </div>

      {/* Verify CTA */}
      <div className="licence-actions">
        <button
          type="button"
          className="licence-verify-btn"
          onClick={() => setShowQr(true)}
        >
          Verify Licence
        </button>
      </div>

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
