/* Invite-only sign-up. An invite is a random token (stored hashed) sent as a link by the person
   who created it; it can be used once, within INVITE_DAYS. The very first account on an empty
   database needs no invite, so a fresh deploy can be set up. */
import crypto from 'node:crypto';
import { db } from './db.js';

export const INVITE_DAYS = 14;
export const INVITE_COOKIE = 'gr8r_invite';
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

export async function createInvite(email, userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  const sql = await db();
  // A new link replaces any unused one for the same address.
  await sql`DELETE FROM invites WHERE email = ${email} AND accepted_by IS NULL`;
  await sql`INSERT INTO invites (token_hash, email, invited_by, expires_at) VALUES (${sha(token)}, ${email}, ${userId}, now() + ${INVITE_DAYS + ' days'}::interval)`;
  return token;
}

/* The open invite for a token, or null. */
export async function findInvite(token) {
  if (!token) return null;
  const sql = await db();
  const [i] = await sql`SELECT token_hash, email FROM invites WHERE token_hash = ${sha(token)} AND accepted_by IS NULL AND expires_at > now()`;
  return i || null;
}

export async function acceptInvite(invite, userId) {
  const sql = await db();
  await sql`UPDATE invites SET accepted_by = ${userId} WHERE token_hash = ${invite.token_hash}`;
}

/* True when nobody has an account yet: the first sign-up is the owner and needs no invite. */
export async function noUsersYet() {
  const sql = await db();
  const [r] = await sql`SELECT NOT EXISTS (SELECT 1 FROM users) AS empty`;
  return r.empty;
}
