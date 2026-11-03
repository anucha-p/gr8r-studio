/* Invites.
   GET ?token=…          (no sign-in) → { email } for an open invite, or 404; used by the sign-up page
   GET                   → { invites: [{ email, created_at, expires_at, accepted }] } sent by the user
   POST { email }        → { email, token } a fresh invite link token (replaces an unused one)
   DELETE ?email=…       → revokes the user's unused invite for that address */
import { currentUser } from '../_lib/auth.js';
import { db } from '../_lib/db.js';
import { createInvite, findInvite } from '../_lib/invites.js';
import { EMAIL_RE, json, route } from '../_lib/http.js';

export default route(['GET', 'POST', 'DELETE'], async (req, res, body) => {
  if (req.method === 'GET' && req.query.token) {
    const i = await findInvite(req.query.token);
    return i ? json(res, 200, { email: i.email }) : json(res, 404, { error: 'This invite link is invalid, used or expired. Ask for a new one.' });
  }
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  const sql = await db();

  if (req.method === 'GET') {
    const rows =
      await sql`SELECT email, created_at, expires_at, accepted_by IS NOT NULL AS accepted FROM invites WHERE invited_by = ${user.id} ORDER BY created_at DESC`;
    return json(res, 200, { invites: rows });
  }
  const email = String((req.method === 'POST' ? body.email : req.query.email) || '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'Enter a valid email address', field: 'email' });

  if (req.method === 'DELETE') {
    await sql`DELETE FROM invites WHERE email = ${email} AND invited_by = ${user.id} AND accepted_by IS NULL`;
    return json(res, 200, { ok: true });
  }
  const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (exists) return json(res, 409, { error: `${email} already has an account`, field: 'email' });
  json(res, 201, { email, token: await createInvite(email, user.id) });
});
