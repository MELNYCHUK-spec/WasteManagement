import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { clearSessionCookie, createSession, hashPassword, hashToken, requireAuth, sessionToken, verifyPassword } from '../auth';
import { pool } from '../db/pool';
import { emailDeliveryConfigured, sendPasswordResetEmail, sendVerificationEmail } from '../mail';

const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const verificationHtml = (message: string) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>EcoRoute email verification</title><body style="font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#263329"><h1>EcoRoute</h1><p>${message}</p><p><a href="/">Return to EcoRoute</a></p></body></html>`;

router.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const key = req.ip || 'unknown';
  let value = attempts.get(key);
  if (!value || value.resetAt <= now) { value = { count: 0, resetAt: now + 15 * 60_000 }; attempts.set(key, value); }
  value.count += 1;
  if (value.count > 20) { res.setHeader('Retry-After', String(Math.ceil((value.resetAt - now) / 1000))); res.status(429).json({ error: 'Too many authentication attempts' }); return; }
  next();
});

async function issueVerification(userId: string, email: string) {
  const token = randomBytes(32).toString('base64url');
  await pool.query('DELETE FROM email_verification_tokens WHERE user_id=$1 OR expires_at <= NOW()', [userId]);
  await pool.query('INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL \'24 hours\')', [userId, hashToken(token)]);
  try { await sendVerificationEmail(email, token); }
  catch (error) {
    await pool.query('DELETE FROM email_verification_tokens WHERE user_id=$1', [userId]);
    throw error;
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
      res.status(400).json({ error: 'Enter a valid email and a password of 12-128 characters' }); return;
    }
    if (!emailDeliveryConfigured()) { res.status(503).json({ error: 'Email delivery is not configured' }); return; }
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query('INSERT INTO auth_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING id,email', [email, passwordHash]);
    if (!rows[0]) { res.status(409).json({ error: 'An account with this email already exists' }); return; }
    try { await issueVerification(rows[0].id, email); }
    catch (error) {
      await pool.query('DELETE FROM auth_users WHERE id=$1 AND email_verified_at IS NULL', [rows[0].id]);
      throw error;
    }
    res.status(201).json({ message: 'Verification email sent. Open the link in your inbox to activate your account.' });
  } catch (error) { next(error); }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !emailDeliveryConfigured()) {
      const configured = emailDeliveryConfigured();
      res.status(configured ? 400 : 503).json({ error: configured ? 'Invalid email' : 'Email delivery is not configured' }); return;
    }
    const { rows } = await pool.query('SELECT id,email FROM auth_users WHERE email=$1 AND email_verified_at IS NULL', [email]);
    if (rows[0]) await issueVerification(rows[0].id, rows[0].email);
    res.json({ message: 'If the account exists and is not verified, a new link has been sent.' });
  } catch (error) { next(error); }
});

router.get('/verify', async (req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token || token.length > 128) { res.status(400).type('html').send(verificationHtml('This verification link is invalid or has expired.')); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('DELETE FROM email_verification_tokens WHERE token_hash=$1 AND expires_at > NOW() RETURNING user_id', [hashToken(token)]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      res.status(400).type('html').send(verificationHtml('This verification link is invalid or has expired.'));
      return;
    }
    await client.query('UPDATE auth_users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1', [rows[0].user_id]);
    await client.query('DELETE FROM email_verification_tokens WHERE user_id=$1', [rows[0].user_id]);
    await client.query('COMMIT');
    res.type('html').send(verificationHtml('Your email is confirmed. You can now sign in.'));
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (email.length > 254 || typeof password !== 'string' || password.length > 128) { res.status(400).json({ error: 'Invalid email or password' }); return; }
    const { rows } = await pool.query('SELECT id,email,password_hash,email_verified_at FROM auth_users WHERE email=$1', [email]);
    const valid = rows[0] && await verifyPassword(password, rows[0].password_hash);
    if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    if (!rows[0].email_verified_at) { res.status(403).json({ error: 'Verify your email address before signing in' }); return; }
    await createSession(rows[0].id, res);
    res.json({ user: { id: rows[0].id, email: rows[0].email } });
  } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Enter a valid email' }); return; }
    if (!emailDeliveryConfigured()) { res.status(503).json({ error: 'Email delivery is not configured' }); return; }
    const { rows } = await pool.query('SELECT id,email FROM auth_users WHERE email=$1 AND email_verified_at IS NOT NULL', [email]);
    if (rows[0]) {
      const token = randomBytes(32).toString('base64url');
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at <= NOW()', [rows[0].id]);
      await pool.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL \'1 hour\')', [rows[0].id, hashToken(token)]);
      try { await sendPasswordResetEmail(rows[0].email, token); }
      catch (error) { await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [rows[0].id]); throw error; }
    }
    res.json({ message: 'If a verified account exists for that email, a reset link has been sent.' });
  } catch (error) { next(error); }
});

router.post('/reset-password', async (req, res, next) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = req.body?.password;
  if (token.length < 32 || token.length > 128 || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    res.status(400).json({ error: 'Use a valid reset link and a password of 12-128 characters' }); return;
  }
  const client = await pool.connect();
  try {
    const passwordHash = await hashPassword(password);
    await client.query('BEGIN');
    const { rows } = await client.query('DELETE FROM password_reset_tokens WHERE token_hash=$1 AND expires_at > NOW() RETURNING user_id', [hashToken(token)]);
    if (!rows[0]) { await client.query('ROLLBACK'); res.status(400).json({ error: 'This reset link is invalid or has expired' }); return; }
    await client.query('UPDATE auth_users SET password_hash=$1 WHERE id=$2', [passwordHash, rows[0].user_id]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [rows[0].user_id]);
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [rows[0].user_id]);
    await client.query('COMMIT');
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const token = sessionToken(req)!;
    const { rows } = await pool.query('SELECT u.id,u.email FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=$1', [hashToken(token)]);
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = sessionToken(req);
    if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [hashToken(token)]);
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
