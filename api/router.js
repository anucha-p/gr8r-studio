/* The single serverless function: vercel.json rewrites every /api/<route> request here with
   ?route=<route>, and the handlers live in api/_routes (folders starting with _ are not deployed
   as functions of their own). One function keeps the deployment under the Hobby plan's limit
   of 12 functions and shares the warm database connection between routes. */
import google from './_routes/auth/google.js';
import googleCallback from './_routes/auth/google-callback.js';
import login from './_routes/auth/login.js';
import logout from './_routes/auth/logout.js';
import me from './_routes/auth/me.js';
import password from './_routes/auth/password.js';
import signup from './_routes/auth/signup.js';
import invites from './_routes/invites.js';
import sessions from './_routes/sessions.js';
import workspace from './_routes/workspace.js';
import workspaceUrl from './_routes/workspace-url.js';
import { json } from './_lib/http.js';

const ROUTES = {
  'auth/google': google,
  'auth/google-callback': googleCallback,
  'auth/login': login,
  'auth/logout': logout,
  'auth/me': me,
  'auth/password': password,
  'auth/signup': signup,
  invites,
  sessions,
  workspace,
  'workspace-url': workspaceUrl,
};

export default function router(req, res) {
  const name = String(req.query.route || '').replace(/^\/+|\/+$/g, '');
  delete req.query.route;
  const handler = Object.hasOwn(ROUTES, name) ? ROUTES[name] : null;
  if (!handler) return json(res, 404, { error: 'Not found' });
  return handler(req, res);
}
