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
        <div className="demerit-hero__label">Demerit points</div>
        {/* Original copy: "You have X of Y" */}
        <p className="demerit-hero__youhave">
          You have <strong>{points}</strong> of <strong>{max}</strong>
        </p>
        <div className="demerit-hero__points">
          <span className="demerit-hero__current">{points}</span>
          <span className="demerit-hero__sep">/</span>
          <span className="demerit-hero__max">{max}</span>
        </div>
        <div className="demerit-bar" role="progressbar" aria-valuenow={points} aria-valuemin={0} aria-valuemax={max}>
          <div className="demerit-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="demerit-hero__remain">
          {points === 0
            ? `You have ${max} demerit points remaining on your licence.`
            : points >= max
              ? `${points} points used`
              : `You have ${remaining} demerit points remaining on your licence.`}
        </p>
      </div>

      <section className="demerit-section">
        <div className="demerit-card">
          <button type="button" className="demerit-link-row">
            <span>Demerit point offences</span>
            <span className="demerit-chevron">›</span>
          </button>
          <button type="button" className="demerit-link-row">
            <span>Good behaviour option</span>
            <span className="demerit-chevron">›</span>
          </button>
          <button type="button" className="demerit-link-row demerit-link-row--last">
            <span>How demerit points work</span>
            <span className="demerit-chevron">›</span>
          </button>
        </div>
      </section>

      <section className="demerit-section">
        <h2 className="demerit-section-title">Licence</h2>
        <div className="demerit-card">
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
