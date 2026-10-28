/* =====================================================================
   ENTRY: styles, then every module in dependency order (several register
   global listeners or add handlers to the action table when they load), then boot.
   ===================================================================== */
import './styles/index.css';
import './core/utils.js';
import './core/icons.js';
import './core/constants.js';
import './data/seed.js';
import './core/store.js';
import './ui/helpers.js';
import './core/theme.js';
import './ui/toast.js';
import './ui/select.js';
import './shell/render.js';
import './shell/layout.js';
import './shell/skeletons.js';
import './shell/view-engine.js';
import './components/task-list.js';
import './pages/home.js';
import './pages/overview.js';
import './pages/my-tasks.js';
import './pages/tasks.js';
import './pages/inbox.js';
import './pages/notifications.js';
import './pages/favorites.js';
import './pages/projects.js';
import './pages/members.js';
import './pages/activity.js';
import './pages/search.js';
import './pages/errors.js';
import './pages/project.js';
import './views/project-overview.js';
import './views/board.js';
import './views/table.js';
import './views/calendar.js';
import './views/timeline.js';
import './views/files.js';
import './overlays/drawer.js';
import './overlays/modals.js';
import './overlays/popovers.js';
import './overlays/context-menu.js';
import './overlays/palette.js';
import './pages/settings.js';
import './pages/auth.js';
import './pages/design-system.js';
import './actions/actions.js';
import './actions/events.js';
import './actions/keyboard.js';
import './actions/drag-drop.js';
import './features/teams.js';
import './features/subtasks.js';
import './features/archive.js';
import './actions/teams.js';
import './actions/subtasks.js';
import './actions/archive.js';
import { S, D, remote } from './core/store.js';
import { ApiError, api } from './core/api.js';
import { toast } from './ui/toast.js';
import { A, signedIn } from './actions/actions.js';
import { ROUTE_NAMES, render, go } from './shell/render.js';

/* Checks for a backend session. With no backend (plain `vite` dev server) the app stays a
   local demo saved in this browser; with one, the workspace loads from the server. */
async function connect(fresh) {
  try {
    const { user } = await api('auth/me');
    S.ui.backend = true;
    await signedIn(user, fresh);
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) S.ui.backend = true;
    return false;
  }
}
remote.onConflict = () => {
  render();
  toast('This workspace was updated in another tab. Showing the latest version.', { kind: 'info' });
};

const AUTH_ERRORS = {
  google_not_configured: "Google sign-in isn't set up on this server yet.",
  google_cancelled: 'Google sign-in was cancelled.',
  google_unverified: "Your Google account email isn't verified.",
  google_failed: "We couldn't sign you in with Google. Try again.",
};

(async function init() {
  // Google sign-in returns here with ?auth=new (first sign-in) or ?auth_error=<code>.
  const qs = new URLSearchParams(location.search);
  const authNew = qs.get('auth') === 'new',
    authErr = AUTH_ERRORS[qs.get('auth_error')];
  if (qs.has('auth') || qs.has('auth_error')) history.replaceState(null, '', location.pathname + location.hash);
  document.documentElement.lang = 'en';
  if (!document.getElementById('sr-live')) {
    const l = document.createElement('div');
    l.id = 'sr-live';
    l.className = 'sr';
    l.setAttribute('aria-live', 'polite');
    document.body.appendChild(l);
  }
  const h = (location.hash || '').slice(1);
  const authRoutes = ['login', 'signup', 'forgot', 'reset', 'verify', 'onboarding'];
  const signedInNow = await connect(authNew);
  if (S.ui.backend && !signedInNow) S.ui.auth = ['login', 'signup'].includes(h) ? h : 'login';
  else if (authRoutes.includes(h)) S.ui.auth = h;
  else if (h && ROUTE_NAMES[h]) S.ui.route = h;
  else S.ui.route = S.prefs.home || 'home';
  if (authErr) S.ui.errors = { login: authErr };
  if (signedInNow && authNew) {
    S.ui.auth = 'onboarding';
    S.ui.onb = 0;
  }
  render();
})();

// Dev-only handle for debugging and screenshot tooling; stripped from production builds.
if (import.meta.env.DEV) window.__gr8r = { S, D, A, go, render };
