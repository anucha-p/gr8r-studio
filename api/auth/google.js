import crypto from 'node:crypto';
import { setCookie } from '../_lib/auth.js';
import { STATE_COOKIE, configured, redirect, redirectUri } from '../_lib/google.js';
import { route } from '../_lib/http.js';

export default route(['GET'], async (req, res) => {
  if (!configured()) return redirect(res, '/?auth_error=google_not_configured#login');
  const state = crypto.randomBytes(16).toString('base64url');
  setCookie(res, state, 600, STATE_COOKIE);
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + q);
});
