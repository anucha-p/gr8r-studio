import crypto from 'node:crypto';
import { db } from '../_lib/db.js';
import { readCookie, setCookie, startSession } from '../_lib/auth.js';
import { STATE_COOKIE, configured, redirect, redirectUri } from '../_lib/google.js';
import { route } from '../_lib/http.js';

const fail = (res, code) => redirect(res, `/?auth_error=${code}#login`);

export default route(['GET'], async (req, res) => {
  const { code, state, error } = req.query;
  const expected = readCookie(req, STATE_COOKIE);
  setCookie(res, '', 0, STATE_COOKIE);
  if (error) return fail(res, 'google_cancelled');
  if (!configured() || !code || !state || state !== expected) return fail(res, 'google_failed');

  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
    }),
  });
  if (!tr.ok) return fail(res, 'google_failed');
  const { access_token } = await tr.json();
  const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
  if (!ur.ok) return fail(res, 'google_failed');
  const g = await ur.json();
  if (!g.sub || !g.email || !g.email_verified) return fail(res, 'google_unverified');

  const sql = await db();
  const email = g.email.toLowerCase();
  let [u] = await sql`SELECT id FROM users WHERE google_id = ${g.sub}`;
  let isNew = false;
  if (!u) {
    // Google has verified the address, so an existing email/password account with it is linked.
    [u] = await sql`UPDATE users SET google_id = ${g.sub} WHERE email = ${email} AND google_id IS NULL RETURNING id`;
  }
  if (!u) {
    const id = 'u_' + crypto.randomUUID();
    [u] =
      await sql`INSERT INTO users (id, email, name, pw_hash, google_id) VALUES (${id}, ${email}, ${g.name || email.split('@')[0]}, '', ${g.sub}) ON CONFLICT DO NOTHING RETURNING id`;
    if (!u) return fail(res, 'google_failed');
    isNew = true;
  }
  await startSession(res, u.id, true);
  redirect(res, isNew ? '/?auth=new' : '/');
});
