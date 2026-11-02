import { useState, type FormEvent } from 'react';

type Props = { onAuthenticated: (email: string) => void };

export default function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setCanResend(false);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) { setCanResend(response.status === 403); throw new Error(payload.error || 'Request failed'); }
      if (mode === 'register') { setPassword(''); setMode('login'); setMessage(payload.message); return; }
      onAuthenticated(payload.user.email);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in'); }
    finally { setBusy(false); }
  }

  async function resendVerification() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Request failed');
      setMessage(payload.message);
      setCanResend(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to resend email'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="auth-brand">ecoroute</div>
    <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
    <p>Use your email and password to access the dashboard.</p>
    <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {mode === 'register' && <small className="auth-hint">Use at least 12 characters.</small>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {message && <div className="auth-success" role="status">{message}</div>}
    <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    {canResend && <button className="auth-toggle" type="button" disabled={busy} onClick={() => void resendVerification()}>Resend verification email</button>}
    <button className="auth-toggle" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); setCanResend(false); }}>
      {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
    </button>
  </form></main>;
}
