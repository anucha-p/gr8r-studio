/* The signed-in user's sessions (one per browser or device signed in).
   GET                → { sessions: [{ id, device, created_at, expires_at, current }], hasPassword }
   DELETE ?id=…       → signs that session out
   DELETE ?others=1   → signs out every session except this one */
import { db } from '../_lib/db.js';
import { currentUser } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

// Sessions are identified to the browser by a prefix of the token hash, never the token itself.
const ID_LEN = 16;

/* "Chrome on macOS" from a user-agent string; good enough to recognise your own devices. */
export function device(ua) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : '';
  return os ? `${browser} on ${os}` : browser;
}

export default route(['GET', 'DELETE'], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  const sql = await db();

  if (req.method === 'GET') {
    const rows =
      await sql`SELECT token_hash, user_agent, created_at, expires_at FROM sessions WHERE user_id = ${user.id} AND expires_at > now() ORDER BY created_at DESC`;
    const [u] = await sql`SELECT pw_hash <> '' AS has_pw FROM users WHERE id = ${user.id}`;
    return json(res, 200, {
      sessions: rows.map(s => ({
        id: s.token_hash.slice(0, ID_LEN),
        device: device(s.user_agent),
        mobile: /Mobi|iPhone|Android/.test(s.user_agent),
        created_at: s.created_at,
        expires_at: s.expires_at,
        current: s.token_hash === user.session,
      })),
      hasPassword: u.has_pw,
    });
  }
  if (req.query.others) {
    await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND token_hash <> ${user.session}`;
    return json(res, 200, { ok: true });
  }
  const id = String(req.query.id || '');
  if (!/^[0-9a-f]{16}$/.test(id)) return json(res, 400, { error: 'Unknown session' });
  if (user.session.startsWith(id)) return json(res, 400, { error: 'Use Sign out to end this session' });
  await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND left(token_hash, ${ID_LEN}) = ${id}`;
  json(res, 200, { ok: true });
});
