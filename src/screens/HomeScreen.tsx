import type { UserData } from '../data/UserData';
import type { StackDest } from '../components/NavTab';
import './HomeScreen.css';

interface HomeScreenProps {
  userData: UserData;
  onNavigate: (dest: StackDest) => void;
}

function IconDemerit() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      {/* Gauge / speedometer style matching reference */}
      <path
        d="M6 22c0-6.627 5.373-12 12-12s12 5.373 12 12"
        stroke="#1A2A3A"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="18" cy="22" r="3.2" fill="#2E7D32" stroke="#1A2A3A" strokeWidth="1.2" />
      <line x1="8" y1="22" x2="28" y2="22" stroke="#1A2A3A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconVehicles() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      {/* Car + rising bars */}
      <path
        d="M7 24h14c.6 0 1.1-.3 1.4-.8l2.2-4.2c.2-.4.2-.9 0-1.3l-1.5-2.8c-.3-.5-.8-.8-1.4-.8H11c-.6 0-1.1.3-1.4.8L8 17.5c-.2.4-.2.9 0 1.3l.4.8H7c-.6 0-1 .4-1 1v2.4c0 .6.4 1 1 1z"
        fill="#1A2A3A"
      />
      <circle cx="11.5" cy="24" r="1.6" fill="#fff" stroke="#1A2A3A" strokeWidth="1" />
      <circle cx="20.5" cy="24" r="1.6" fill="#fff" stroke="#1A2A3A" strokeWidth="1" />
      <path
        d="M24 22v-2.5l3-4 3 3V22"
        stroke="#2E7D32"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M24 22h6" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export function HomeScreen({ userData, onNavigate }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <h1 className="home-greeting">Hi {userData.firstName}</h1>
      </header>

      <section className="home-shortcuts" aria-label="Shortcuts">
        <h2 className="home-shortcuts__label">Shortcuts</h2>

        <button
          type="button"
          className="home-shortcut"
          onClick={() => onNavigate('demerit')}
        >
          <span className="home-shortcut__icon">
            <IconDemerit />
          </span>
          <span className="home-shortcut__title">Demerit point balance</span>
        </button>

        <button
          type="button"
          className="home-shortcut"
          onClick={() => onNavigate('myVehicles')}
        >
          <span className="home-shortcut__icon">
            <IconVehicles />
          </span>
          <span className="home-shortcut__title">Registered vehicles</span>
        </button>
      </section>

      <button
        type="button"
        className="home-licence-bar"
        onClick={() => onNavigate('viewlicence')}
      >
        <span className="home-licence-bar__text">
          <span className="home-licence-bar__title">My licence</span>
          <span className="home-licence-bar__sub">Tap to view licence</span>
        </span>
        <span className="home-licence-bar__expand" aria-hidden>
          <IconExpand />
        </span>
      </button>
    </div>
  );
}
