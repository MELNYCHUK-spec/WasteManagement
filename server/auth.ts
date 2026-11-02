import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db/pool';

const scrypt = promisify(scryptCallback);
const cookieName = 'ecoroute_session';
const sessionDays = 7;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDays * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

export function setSessionCookie(res: Response, token: string) {
  res.setHeader('Set-Cookie', `${cookieName}=${token}; ${cookieOptions}`);
}

export function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

export function sessionToken(req: Request) {
  const cookie = req.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`));
  return cookie?.slice(cookieName.length + 1);
}

export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO auth_sessions(user_id, token_hash, expires_at) VALUES($1,$2,NOW()+($3 * INTERVAL \'1 day\'))', [userId, hashToken(token), sessionDays]);
  setSessionCookie(res, token);
}

export async function authenticatedUser(req: Request) {
  const token = sessionToken(req);
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at > NOW()`, [hashToken(token)],
  );
  return rows[0] as { id: string; email: string } | undefined || null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, saltHex, keyHex] = encoded.split('$');
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  } catch (error) { next(error); }
}

export { hashToken };
