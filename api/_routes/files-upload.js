/* Presigned uploads: the browser asks for a short-lived signed URL and uploads straight to
   Vercel Blob (no 4.5 MB function body limit). Only signed-in users, only into their own
   folder, up to 100 MB. Signing works with either credential a connected store provides
   (OIDC with BLOB_STORE_ID, or BLOB_READ_WRITE_TOKEN).
   GET → { configured, maxBytes } so the app can explain a missing Blob store before uploading. */
import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned } from '@vercel/blob/client';
import { currentUser } from '../_lib/auth.js';
import { MAX_FILE_BYTES, configured, ownPath } from '../_lib/blob.js';
import { json, route } from '../_lib/http.js';

export default route(['GET', 'POST'], async (req, res, body) => {
  if (req.method === 'GET') return json(res, 200, { configured: configured(), maxBytes: MAX_FILE_BYTES });
  if (!configured()) return json(res, 503, { error: 'File uploads aren’t set up yet: connect a Vercel Blob store to the project.' });
  // Only URL issuance is used; upload-completed callbacks are never requested, so refuse them.
  if (body?.type !== 'blob.generate-presigned-url') return json(res, 400, { error: 'Unsupported upload request' });
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  try {
    const r = await handleUploadPresigned({
      request: req,
      body,
      // The SDK insists on a key even when no callback is used; callbacks are refused above.
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY || 'unused',
      getSignedToken: async pathname => {
        if (!ownPath(user, pathname)) throw new Error('Uploads must go to your own folder');
        const validUntil = Date.now() + 15 * 60 * 1000;
        // The browser only receives a signature for this one pathname (not the signing key), so a
        // store-wide delegation can't be reused for other paths.
        const token = await issueSignedToken({ pathname: '*', operations: ['put'], maximumSizeInBytes: MAX_FILE_BYTES, validUntil });
        return { token, urlOptions: { addRandomSuffix: true, maximumSizeInBytes: MAX_FILE_BYTES, validUntil } };
      },
    });
    json(res, 200, r);
  } catch (e) {
    console.error('Upload signing failed', e);
    json(res, 400, { error: e.message || 'Upload refused' });
  }
});
