import { db } from '../_lib/db.js';
import { startSession, verifyPassword } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

export default route(['POST'], async (req, res, { email, password, remember }) => {
  email = String(email || '')
    .trim()
    .toLowerCase();
  const sql = await db();
  const [u] = await sql`SELECT id, email, name, pw_hash FROM users WHERE email = ${email}`;
  if (!u || !(await verifyPassword(String(password || ''), u.pw_hash)))
    return json(res, 401, { error: "That email and password don't match. Try again or reset your password." });
  await startSession(res, u.id, remember !== false);
  json(res, 200, { user: { id: u.id, email: u.email, name: u.name } });
});
