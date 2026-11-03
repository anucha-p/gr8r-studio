/* Change (or, for an account created with Google, set) the signed-in user's password.
   POST { current, next } → signs out every other session. */
import { db } from '../_lib/db.js';
import { currentUser, hashPassword, verifyPassword } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

export default route(['POST'], async (req, res, { current, next }) => {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  next = String(next || '');
  if (next.length < 10 || !/[0-9\W]/.test(next)) return json(res, 400, { error: 'Use at least 10 characters, including a number or symbol', field: 'pwNew' });

  const sql = await db();
  const [u] = await sql`SELECT pw_hash FROM users WHERE id = ${user.id}`;
  if (u.pw_hash && !(await verifyPassword(String(current || ''), u.pw_hash)))
    return json(res, 400, { error: "That's not your current password", field: 'pwCur' });
  await sql`UPDATE users SET pw_hash = ${await hashPassword(next)} WHERE id = ${user.id}`;
  await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND token_hash <> ${user.session}`;
  json(res, 200, { ok: true });
});
