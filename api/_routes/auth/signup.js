import crypto from 'node:crypto';
import { db } from '../../_lib/db.js';
import { hashPassword, startSession } from '../../_lib/auth.js';
import { EMAIL_RE, json, route } from '../../_lib/http.js';
import { acceptInvite, findInvite, noUsersYet } from '../../_lib/invites.js';

export default route(['POST'], async (req, res, { name, email, password, invite: token }) => {
  name = String(name || '').trim();
  email = String(email || '')
    .trim()
    .toLowerCase();
  password = String(password || '');
  if (!name || name.length > 120) return json(res, 400, { error: 'Enter your name', field: 'name' });
  if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'Enter a valid work email', field: 'email' });
  if (password.length < 10 || !/[0-9\W]/.test(password))
    return json(res, 400, { error: 'Use at least 10 characters, including a number or symbol', field: 'pw' });

  const invite = await findInvite(token);
  if (!invite && !(await noUsersYet())) return json(res, 403, { error: 'Gr8r Studio is invite-only. Ask a member for an invite link.' });
  if (invite && invite.email !== email) return json(res, 403, { error: `This invite is for ${invite.email}. Sign up with that address.`, field: 'email' });

  const sql = await db();
  const id = 'u_' + crypto.randomUUID();
  const rows =
    await sql`INSERT INTO users (id, email, name, pw_hash) VALUES (${id}, ${email}, ${name}, ${await hashPassword(password)}) ON CONFLICT (email) DO NOTHING RETURNING id`;
  if (!rows.length) return json(res, 409, { error: 'An account with this email already exists', field: 'email' });
  if (invite) await acceptInvite(invite, id);
  await startSession(req, res, id, true);
  json(res, 201, { user: { id, email, name } });
});
