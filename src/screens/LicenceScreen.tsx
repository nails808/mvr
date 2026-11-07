import type { StackDest } from '../components/NavTab';
import './LicenceScreen.css';

interface LicenceScreenProps {
  onNavigate: (dest: StackDest) => void;
}

function ExpandIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QrScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
        stroke="#1A2A3A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="#1A2A3A" strokeWidth="1.5" />
      <rect x="13" y="7" width="4" height="4" rx="0.5" stroke="#1A2A3A" strokeWidth="1.5" />
      <rect x="7" y="13" width="4" height="4" rx="0.5" stroke="#1A2A3A" strokeWidth="1.5" />
      <path d="M13 13h2v2h-2v-2zm3 0h1v1h-1v-1zm0 3h1v1h-1v-1zm-3 0h2v1h-2v-1z" fill="#1A2A3A" />
    </svg>
  );
}

const MENU_ROWS: { id: string; title: string; subtitle?: string; action?: StackDest }[] = [
  { id: 'demerit', title: 'View demerit points', action: 'demerit' },
  {
    id: 'renew',
    title: 'Manage licence renewal',
    subtitle: "Renew your licence when it's due",
  },
  { id: 'history', title: 'Order driver history report' },
  { id: 'address', title: 'Update address on licence' },
  { id: 'learners', title: 'Access myLearners' },
  { id: 'replace', title: 'Replace licence' },
];

export function LicenceScreen({ onNavigate }: LicenceScreenProps) {
  return (
    <div className="licence-tab">
      <header className="licence-tab__header">
        <h1>Licence</h1>
      </header>

      <button
        type="button"
        className="licence-tab__hero"
        onClick={() => onNavigate('viewlicence')}
      >
        <span className="licence-tab__hero-text">
          <span className="licence-tab__hero-title">My licence</span>
          <span className="licence-tab__hero-sub">Tap to view licence</span>
        </span>
        <span className="licence-tab__hero-expand" aria-hidden>
          <ExpandIcon />
        </span>
      </button>

      <section className="licence-tab__card">
        {MENU_ROWS.map((row, i) => (
          <button
            key={row.id}
            type="button"
            className={`licence-tab__row ${i === MENU_ROWS.length - 1 ? 'licence-tab__row--last' : ''}`}
            onClick={() => {
              if (row.action) onNavigate(row.action);
            }}
          >
            <span className="licence-tab__row-title">{row.title}</span>
            {row.subtitle && (
              <span className="licence-tab__row-sub">{row.subtitle}</span>
            )}
          </button>
        ))}
      </section>

      <button type="button" className="licence-tab__verify">
        <QrScanIcon />
        <span>Verify someone&apos;s licence</span>
      </button>
    </div>
  );
}
