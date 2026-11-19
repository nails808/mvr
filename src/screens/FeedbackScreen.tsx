import { useState, type FormEvent } from 'react';
import { submitFeedback } from '../auth/authApi';
import './FeedbackScreen.css';

interface FeedbackScreenProps {
  username: string;
  onBack: () => void;
}

export function FeedbackScreen({ username, onBack }: FeedbackScreenProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const feedback = text.trim();
    if (!feedback) {
      setError('Please enter your feedback.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await submitFeedback(feedback, username);
      if (!res.ok) {
        setError(res.error || 'Could not send feedback.');
        return;
      }
      setDone(true);
      setText('');
    } catch {
      setError('Could not send feedback. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="feedback-screen">
      <header className="stack-top">
        <button
          type="button"
          className="stack-top__back"
          onClick={onBack}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="stack-top__title">App feedback</h1>
        <span className="stack-top__spacer" aria-hidden />
      </header>

      <div className="feedback-body">
        {done ? (
          <div className="feedback-done">
            <p className="feedback-done__title">Thank you</p>
            <p className="feedback-done__text">Your feedback has been submitted.</p>
            <button type="button" className="feedback-btn feedback-btn--secondary" onClick={onBack}>
              Back to profile
            </button>
            <button
              type="button"
              className="feedback-btn feedback-btn--primary"
              onClick={() => setDone(false)}
            >
              Send more feedback
            </button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={(e) => void onSubmit(e)}>
            <label className="feedback-label" htmlFor="app-feedback">
              Tell us what you think about the app
            </label>
            <textarea
              id="app-feedback"
              className="feedback-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder="Your feedback…"
              disabled={busy}
            />
            <p className="feedback-hint">{text.length}/2000</p>
            {error && (
              <p className="feedback-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="feedback-btn feedback-btn--primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
