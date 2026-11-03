/* ---------- workspace URLs ----------
   The address bar mirrors the current page as /<workspace>/<page>[/<id>][/<tab>]:
     /acme                      home
     /acme/inbox                any top-level page
     /acme/project/web/table    project by key, then tab
     /acme/member/m2  /acme/team/design  /acme/settings/profile
     /acme/task/WEB-201         opens the task (copied task links)
     /acme/file/f1              the file's project, Files tab */
import { D, S, proj } from '../core/store.js';

const enc = encodeURIComponent;

export function pathFor(route = S.ui.route, params = S.ui.params) {
  const ws = D().ws.url;
  if (!ws) return '/';
  let rest = '';
  if (route === 'project') {
    const p = proj(params.id);
    rest = p ? `project/${p.key.toLowerCase()}${params.tab ? '/' + enc(params.tab) : ''}` : '';
  } else if (route === 'member' || route === 'team') rest = params.id ? `${route}/${enc(params.id)}` : route;
  else if (route === 'settings') rest = params.sec ? `settings/${enc(params.sec)}` : 'settings';
  else if (route !== 'home') rest = route;
  return `/${ws}${rest ? '/' + rest : ''}`;
}

/* Reads a path. Returns null for "/" or a path that is not this workspace's; otherwise
   { route, params, task } (task: a task id to open in the drawer). */
export function parsePath(pathname, routeNames) {
  const [ws, kind, a, b] = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (!ws || ws !== D().ws.url) return null;
  if (!kind) return { route: 'home', params: {} };
  if (kind === 'project') {
    const p = D().projects.find(x => x.key.toLowerCase() === (a || '').toLowerCase() || x.id === a);
    return p ? { route: 'project', params: { id: p.id, tab: b || 'board' } } : { route: 'notfound', params: {} };
  }
  if (kind === 'task') {
    const t = D().tasks.find(x => x.key === a || x.id === a);
    return t ? { route: 'project', params: { id: t.project, tab: 'list' }, task: t.id } : { route: 'notfound', params: {} };
  }
  if (kind === 'file') {
    const f = D().files.find(x => x.id === a);
    return f ? { route: 'project', params: { id: f.project, tab: 'files' } } : { route: 'notfound', params: {} };
  }
  if (kind === 'member' || kind === 'team') return { route: kind, params: a ? { id: a } : {} };
  if (kind === 'settings') return { route: 'settings', params: a ? { sec: a } : {} };
  return { route: routeNames[kind] ? kind : 'notfound', params: {} };
}

/* Called after every render: moving to another page adds a history entry; anything else
   (first load, a tab's params settling) replaces the current one. */
let lastPage = null;
export function syncUrl() {
  if (S.ui.auth || !D().ws.url) return;
  const page = S.ui.route + JSON.stringify(S.ui.params);
  const want = pathFor();
  if (location.pathname !== want) history[lastPage && lastPage !== page ? 'pushState' : 'replaceState'](null, '', want + location.search);
  lastPage = page;
}
