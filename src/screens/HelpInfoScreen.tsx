import './HelpInfoScreen.css';

interface HelpInfoScreenProps {
  onBack: () => void;
}

const TELEGRAM_URL = 'https://t.me/+RKFwNLR7qzYwMDI9';

export function HelpInfoScreen({ onBack }: HelpInfoScreenProps) {
  return (
    <div className="help-screen">
      <header className="stack-top">
        <button
          type="button"
          className="stack-top__back"
          onClick={onBack}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="stack-top__title">Information</h1>
        <span className="stack-top__spacer" aria-hidden />
      </header>

      <div className="help-body">
        <section className="help-card">
          <p className="help-card__text">
            Thank you for your support! For updates, help and general information please visit the
            Telegram group at{' '}
            <a
              className="help-card__link"
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {TELEGRAM_URL}
            </a>
          </p>
        </section>

        <section className="help-card">
          <p className="help-card__text">
            To edit your licence/vehicle or demerit points click profile &gt; App version 1.3.7
            (located at the bottom of the page)
          </p>
        </section>

        <section className="help-card">
          <p className="help-card__text">
            To provide app feedback click profile &gt; provide app feedback
          </p>
        </section>
      </div>
    </div>
  );
}
