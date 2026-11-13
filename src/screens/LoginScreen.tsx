import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import vlogo from '../assets/vlogo_nobg.png';
import './LoginScreen.css';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'choice' | 'form'>('choice');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(username.trim(), password);
      // Narrow discriminated union: error only exists when ok === false
      if (res.ok === false) {
        setError(res.error || 'Login failed');
      }
    } catch {
      setError('Unable to reach authentication service');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-screen__brand">
        <img src={vlogo} alt="" className="login-screen__logo" />
        <span className="login-screen__wordmark">myVicRoads</span>
      </div>

      {step === 'choice' && (
        <div className="login-screen__panel">
          <p className="login-screen__lead">Log in to your myVicRoads account</p>
          <button
            type="button"
            className="login-btn login-btn--primary"
            onClick={() => setStep('form')}
          >
            Log in
          </button>
          <p className="login-screen__hint">Don&apos;t have an account?</p>
          <button type="button" className="login-btn login-btn--secondary" disabled>
            Sign up
          </button>
          <button type="button" className="login-screen__scan" disabled>
            Scan QR Code
          </button>
        </div>
      )}

      {step === 'form' && (
        <form className="login-screen__panel login-screen__form" onSubmit={onSubmit}>
          <p className="login-screen__lead">Log in to your myVicRoads account</p>
          <label className="login-field">
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="login-screen__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="login-btn login-btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
          <button
            type="button"
            className="login-btn login-btn--secondary"
            onClick={() => {
              setStep('choice');
              setError('');
            }}
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
