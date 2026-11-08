import type { UserData } from '../data/UserData';
import type { StackDest } from '../components/NavTab';
import demeritIcon from '../assets/demerit_point_icon.svg';
import vehiclesIcon from '../assets/registered_vehicles_icon.svg';
import './HomeScreen.css';

interface HomeScreenProps {
  userData: UserData;
  onNavigate: (dest: StackDest) => void;
}

function IconDemerit() {
  return (
    <img
      src={demeritIcon}
      alt=""
      width={36}
      height={36}
      className="home-shortcut__icon-img"
      aria-hidden
    />
  );
}

function IconVehicles() {
  return (
    <img
      src={vehiclesIcon}
      alt=""
      width={40}
      height={40}
      className="home-shortcut__icon-img"
      aria-hidden
    />
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
