/* The signed-in user's workspace: { data, prefs, views } saved as one JSON document.
   PUT sends the version it was based on; a stale version gets 409 so a second tab
   can't silently overwrite newer edits. */
import { db } from './_lib/db.js';
import { currentUser } from './_lib/auth.js';
import { json, route } from './_lib/http.js';

export default route(['GET', 'PUT'], async (req, res, body) => {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  const sql = await db();

  if (req.method === 'GET') {
    const [w] = await sql`SELECT state, version FROM workspaces WHERE user_id = ${user.id}`;
    return json(res, 200, w ? { state: w.state, version: w.version } : { state: null, version: 0 });
  }

  const { state, version } = body;
  if (!state || typeof state !== 'object' || !state.data?.tasks) return json(res, 400, { error: 'Invalid workspace' });
  const base = Number(version) || 0;
  const rows =
    base === 0
      ? await sql`INSERT INTO workspaces (user_id, state) VALUES (${user.id}, ${JSON.stringify(state)}::jsonb) ON CONFLICT (user_id) DO NOTHING RETURNING version`
      : await sql`UPDATE workspaces SET state = ${JSON.stringify(state)}::jsonb, version = version + 1, updated_at = now() WHERE user_id = ${user.id} AND version = ${base} RETURNING version`;
  if (!rows.length) {
    const [w] = await sql`SELECT state, version FROM workspaces WHERE user_id = ${user.id}`;
    return json(res, 409, { error: 'Workspace changed elsewhere', state: w?.state, version: w?.version });
  }
  json(res, 200, { version: rows[0].version });
});
