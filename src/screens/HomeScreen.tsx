import type { UserData } from '../data/UserData';
import type { StackDest } from '../components/NavTab';
import { VicColors } from '../theme/colors';
import './HomeScreen.css';

interface HomeScreenProps {
  userData: UserData;
  onNavigate: (dest: StackDest) => void;
}

export function HomeScreen({ userData, onNavigate }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <h1 className="home-greeting">Hi {userData.firstName}</h1>
      </header>

      <section className="home-card home-card--licence" onClick={() => onNavigate('viewlicence')}>
        <div className="home-card__body">
          <div className="home-card__title">My licence</div>
          <div className="home-card__subtitle">Tap to view licence</div>
        </div>
        <div className="home-card__chevron">›</div>
      </section>

      <section className="home-actions">
        <button
          type="button"
          className="home-action-btn"
          onClick={() => onNavigate('demerit')}
        >
          Demerit points
          <span className="home-action-btn__value">
            {userData.demeritPoints} / {userData.demeritMax}
          </span>
        </button>
        <button
          type="button"
          className="home-action-btn"
          onClick={() => onNavigate('myVehicles')}
        >
          My vehicles
          <span className="home-action-btn__value">{userData.vehicleRego}</span>
        </button>
      </section>
    </div>
  );
}
