/* Serves and deletes the signed-in user's uploaded files.
   GET ?path=…[&download=1] → redirects to a 10-minute signed link (falls back to streaming)
   DELETE ?path=…           → deletes the file */
import { Readable } from 'node:stream';
import { del, get, issueSignedToken, presignUrl } from '@vercel/blob';
import { currentUser } from './_lib/auth.js';
import { configured, ownPath } from './_lib/blob.js';
import { json, route } from './_lib/http.js';

export default route(['GET', 'DELETE'], async (req, res) => {
  if (!configured()) return json(res, 503, { error: 'File storage isn’t set up yet.' });
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  const path = ownPath(user, req.query.path);
  if (!path) return json(res, 404, { error: 'File not found' });

  if (req.method === 'DELETE') {
    await del(path);
    return json(res, 200, { ok: true });
  }

  const download = !!req.query.download;
  res.setHeader('Cache-Control', 'private, no-store');
  // A signed link lets the browser fetch the file from Blob directly, whatever its size.
  if (!download) {
    try {
      const validUntil = Date.now() + 10 * 60 * 1000;
      const token = await issueSignedToken({ pathname: path, operations: ['get'], validUntil });
      const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname: path, access: 'private', validUntil });
      res.setHeader('Location', presignedUrl);
      return res.status(302).end();
    } catch (e) {
      console.warn('Signed link failed; streaming instead', e.message);
    }
  }
  const r = await get(path, { access: 'private' });
  if (!r || r.statusCode !== 200) return json(res, 404, { error: 'File not found' });
  const name = path.split('/').pop();
  res.setHeader('Content-Type', r.blob.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Served from the app's own origin here, so uploaded HTML or SVG must not run scripts.
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.status(200);
  Readable.fromWeb(r.stream).pipe(res);
});
