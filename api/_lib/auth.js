/* Password hashing (scrypt) and cookie sessions stored hashed in Postgres. */
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'gr8r_session';
const DAY = 86400;

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  if (!stored.startsWith('scrypt$')) return false;
  const [, salt, key] = stored.split('$');
  const want = Buffer.from(key, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length);
  return crypto.timingSafeEqual(got, want);
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');

export async function startSession(res, userId, remember) {
  const token = crypto.randomBytes(32).toString('base64url');
  const days = remember ? 30 : 1;
  const sql = await db();
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${userId}, now() + ${days + ' days'}::interval)`;
  setCookie(res, token, remember ? days * DAY : null);
}
export async function endSession(req, res) {
  const token = readCookie(req);
  if (token) {
    const sql = await db();
    await sql`DELETE FROM sessions WHERE token_hash = ${sha(token)}`;
  }
  setCookie(res, '', 0);
}
export async function currentUser(req) {
  const token = readCookie(req);
  if (!token) return null;
  const sql = await db();
  const rows =
    await sql`SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${sha(token)} AND s.expires_at > now()`;
  return rows[0] || null;
}

export function readCookie(req, name = COOKIE) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
export function setCookie(res, value, maxAge, name = COOKIE) {
  const secure = process.env.VERCEL_ENV ? '; Secure' : '';
  const age = maxAge === null ? '' : `; Max-Age=${maxAge}`;
  const prev = [res.getHeader('Set-Cookie') || []].flat();
  res.setHeader('Set-Cookie', [...prev, `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure}${age}`]);
}
