/* The signed-in user's workspace address: yoursite/<slug>. Slugs are unique across all users.
   GET ?url=<slug>  → { url, available } (url is the user's current slug)
   POST { url }     → claims it, or 409 if another account has it
   POST { url, auto: true } → keeps the user's current slug if they have one, otherwise claims
                     url or the first free url-2, url-3, … (used on sign-in) */
import { db } from '../_lib/db.js';
import { currentUser } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
// First path segments the app or Vercel already uses.
const RESERVED = new Set([
  'api',
  'assets',
  'src',
  'join',
  'login',
  'signup',
  'logout',
  'settings',
  'admin',
  'app',
  'www',
  'favicon.svg',
  'index.html',
  'node_modules',
  '_vercel',
]);

export const normalize = s =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export default route(['GET', 'POST'], async (req, res, body) => {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  const sql = await db();
  const [cur] = await sql`SELECT slug FROM workspace_urls WHERE user_id = ${user.id}`;

  if (req.method === 'GET') {
    const want = normalize(req.query.url);
    const [taken] = SLUG_RE.test(want) && !RESERVED.has(want) ? await sql`SELECT user_id FROM workspace_urls WHERE slug = ${want}` : [{ user_id: null }];
    return json(res, 200, { url: cur?.slug || null, available: !taken || taken.user_id === user.id });
  }

  if (body.auto && cur) return json(res, 200, { url: cur.slug });
  const base = normalize(body.url) || 'workspace';
  if (!SLUG_RE.test(base) || RESERVED.has(base)) return json(res, 400, { error: 'Use 1–40 lowercase letters, numbers or dashes', field: 'url' });
  if (cur?.slug === base) return json(res, 200, { url: base });

  const tries = body.auto
    ? [base, ...Array.from({ length: 8 }, (_, i) => `${base.slice(0, 34)}-${i + 2}`), `${base.slice(0, 30)}-${Math.random().toString(36).slice(2, 8)}`]
    : [base];
  for (const slug of tries) {
    if (RESERVED.has(slug)) continue;
    const rows = await sql`INSERT INTO workspace_urls (slug, user_id) VALUES (${slug}, ${user.id})
      ON CONFLICT (user_id) DO UPDATE SET slug = EXCLUDED.slug
      WHERE NOT EXISTS (SELECT 1 FROM workspace_urls w WHERE w.slug = EXCLUDED.slug)
      RETURNING slug`.catch(e => {
      if (e.code === '23505') return [];
      throw e;
    });
    if (rows.length) return json(res, 200, { url: rows[0].slug });
  }
  json(res, 409, { error: `${base} is already taken. Try another address.`, field: 'url' });
});
