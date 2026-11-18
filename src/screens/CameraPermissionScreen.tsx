import './CameraPermissionScreen.css';

interface CameraPermissionScreenProps {
  onAllow: () => void;
  onOpenSettings: () => void;
  onBack: () => void;
  denied?: boolean;
}

export function CameraPermissionScreen({
  onAllow,
  onOpenSettings,
  onBack,
  denied = false,
}: CameraPermissionScreenProps) {
  return (
    <div className="cam-perm">
      <header className="cam-perm__header">
        <button type="button" className="cam-perm__back" onClick={onBack}>
          Back
        </button>
        <h1 className="cam-perm__title">Allow access to your camera</h1>
        <span className="cam-perm__spacer" />
      </header>

      <div className="cam-perm__body">
        <div className="cam-perm__icon" aria-hidden>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
              stroke="#0D2D6B"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="3.5" stroke="#0D2D6B" strokeWidth="1.6" />
          </svg>
        </div>

        {denied ? (
          <>
            <p className="cam-perm__message">
              Please go to settings to give the app permission to use the camera. You cannot use
              this feature if you don&apos;t give permission.
            </p>
            <button type="button" className="cam-perm__btn cam-perm__btn--primary" onClick={onOpenSettings}>
              Open Settings
            </button>
          </>
        ) : (
          <>
            <p className="cam-perm__message">
              myVicRoads needs camera access to scan QR codes on digital driver licences.
            </p>
            <button type="button" className="cam-perm__btn cam-perm__btn--primary" onClick={onAllow}>
              Continue
            </button>
          </>
        )}

        <button type="button" className="cam-perm__btn cam-perm__btn--ghost" onClick={onBack}>
          Not now
        </button>
      </div>
    </div>
  );
}
