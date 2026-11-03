import type { UserData } from '../data/UserData';
import './DemeritScreen.css';

interface DemeritScreenProps {
  userData: UserData;
  onUserDataChange?: (data: UserData) => void;
}

export function DemeritScreen({ userData, onUserDataChange }: DemeritScreenProps) {
  const points = userData.demeritPoints;
  const max = userData.demeritMax || 12;
  const pct = Math.min(100, Math.round((points / max) * 100));
  const remaining = Math.max(0, max - points);
  const level =
    points === 0 ? 'clear' : points >= max ? 'critical' : points >= max * 0.7 ? 'high' : 'moderate';

  const unlocked = userData.isUnlocked;

  const adjust = (delta: number) => {
    if (!onUserDataChange || !unlocked) return;
    const next = Math.max(0, Math.min(max, points + delta));
    onUserDataChange({ ...userData, demeritPoints: next });
  };

  return (
    <div className="demerit-screen">
      <div className={`demerit-hero demerit-hero--${level}`}>
        <div className="demerit-hero__label">Current demerit points</div>
        <div className="demerit-hero__points">
          <span className="demerit-hero__current">{points}</span>
          <span className="demerit-hero__sep">/</span>
          <span className="demerit-hero__max">{max}</span>
        </div>
        <div className="demerit-bar" role="progressbar" aria-valuenow={points} aria-valuemin={0} aria-valuemax={max}>
          <div className="demerit-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="demerit-hero__remain">
          {remaining === max
            ? 'No demerit points recorded'
            : remaining === 0
              ? 'Maximum points reached'
              : `${remaining} point${remaining === 1 ? '' : 's'} remaining before maximum`}
        </p>
      </div>

      <section className="demerit-section">
        <h2 className="demerit-section-title">About demerit points</h2>
        <div className="demerit-card">
          <p className="demerit-info">
            Demerit points are recorded against your Victorian driver licence for certain
            traffic offences. Full licence holders typically have a maximum of {max} points.
          </p>
          <div className="demerit-row">
            <span className="demerit-row-label">Licence holder</span>
            <span className="demerit-row-value">
              {userData.firstName} {userData.lastName}
            </span>
          </div>
          <div className="demerit-row">
            <span className="demerit-row-label">Licence number</span>
            <span className="demerit-row-value">{userData.licenceNumber}</span>
          </div>
          <div className="demerit-row">
            <span className="demerit-row-label">Licence status</span>
            <span className="demerit-row-value">{userData.licenceStatus}</span>
          </div>
        </div>
      </section>

      {unlocked && onUserDataChange && (
        <section className="demerit-section">
          <h2 className="demerit-section-title">Adjust points (editing unlocked)</h2>
          <div className="demerit-adjust">
            <button type="button" className="demerit-adjust-btn" onClick={() => adjust(-1)} disabled={points <= 0}>
              −
            </button>
            <span className="demerit-adjust-value">{points}</span>
            <button type="button" className="demerit-adjust-btn" onClick={() => adjust(1)} disabled={points >= max}>
              +
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
