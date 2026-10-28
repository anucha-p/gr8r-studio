/* Google OAuth 2.0 (authorization code flow). Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET;
   the redirect URI registered in Google Cloud is https://<your-domain>/api/auth/google-callback. */
export const STATE_COOKIE = 'gr8r_oauth_state';

export const configured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers.host}/api/auth/google-callback`;
}

export function redirect(res, to) {
  res.setHeader('Location', to);
  res.status(302).end();
}
