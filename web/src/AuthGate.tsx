import { useState, type FormEvent } from 'react';

type Props = { onAuthenticated: (email: string) => void };
type Mode = 'login' | 'register' | 'forgot' | 'reset';

export default function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>(() => new URLSearchParams(window.location.search).has('resetToken') ? 'reset' : 'login');
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setCanResend(false);
    try {
      const endpoint = mode === 'reset' ? 'reset-password' : mode === 'forgot' ? 'forgot-password' : mode;
      const body = mode === 'reset' ? { token: resetToken, password } : { email, password };
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) { setCanResend(response.status === 403); throw new Error(payload.error || 'Request failed'); }
      if (mode === 'register' || mode === 'forgot' || mode === 'reset') {
        setPassword(''); setMode('login'); setMessage(payload.message);
        if (mode === 'reset') window.history.replaceState({}, '', window.location.pathname);
        return;
      }
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

  const title = mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Choose a new password';
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="auth-brand">ecoroute</div>
    <h1>{title}</h1>
    <p>{mode === 'login' ? 'Use your email and password to access the dashboard.' : mode === 'forgot' ? 'Enter your account email and we will send a reset link if it exists.' : mode === 'reset' ? 'Choose a new password for your account.' : 'Create an account with your email and password.'}</p>
    {mode !== 'reset' && <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
    {(mode === 'login' || mode === 'register' || mode === 'reset') && <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
    {(mode === 'register' || mode === 'reset') && <small className="auth-hint">Use at least 12 characters.</small>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {message && <div className="auth-success" role="status">{message}</div>}
    <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
    {mode === 'login' && <button className="auth-toggle" type="button" disabled={busy} onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>Forgot password?</button>}
    {canResend && <button className="auth-toggle" type="button" disabled={busy} onClick={() => void resendVerification()}>Resend verification email</button>}
    <button className="auth-toggle" type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setMessage(''); setCanResend(false); }}>
      {mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create an account'}
    </button>
  </form></main>;
}
