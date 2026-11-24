import './DesktopBlockedScreen.css';

export function DesktopBlockedScreen() {
  return (
    <div className="desk-block">
      <div className="desk-block__card">
        <div className="desk-block__icon" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <rect x="7" y="2" width="10" height="20" rx="2" stroke="#0d2d6b" strokeWidth="1.5" />
            <circle cx="12" cy="18" r="1" fill="#0d2d6b" />
          </svg>
        </div>
        <h1 className="desk-block__title">Mobile only</h1>
        <p className="desk-block__msg">
          This application can only be used on mobile devices.
        </p>
        <p className="desk-block__hint">
          Open this link on your phone or tablet, then install the app to your home screen.
        </p>
      </div>
    </div>
  );
}
