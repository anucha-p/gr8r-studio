/* Issues short-lived tokens so the browser can upload straight to Vercel Blob (no 4.5 MB
   function body limit). Only signed-in users, only into their own folder, up to 100 MB.
   GET → { configured, maxBytes } so the app can explain a missing Blob store before uploading. */
import { handleUpload } from '@vercel/blob/client';
import { currentUser } from '../_lib/auth.js';
import { MAX_FILE_BYTES, configured, ownPath } from '../_lib/blob.js';
import { json, route } from '../_lib/http.js';

export default route(['GET', 'POST'], async (req, res, body) => {
  if (req.method === 'GET') return json(res, 200, { configured: configured(), maxBytes: MAX_FILE_BYTES });
  if (!configured()) return json(res, 503, { error: 'File uploads aren’t set up yet: connect a Vercel Blob store to the project.' });
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  try {
    const r = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async pathname => {
        if (!ownPath(user, pathname)) throw new Error('Uploads must go to your own folder');
        return { addRandomSuffix: true, maximumSizeInBytes: MAX_FILE_BYTES };
      },
    });
    json(res, 200, r);
  } catch (e) {
    json(res, 400, { error: e.message || 'Upload refused' });
  }
});
