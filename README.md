# Gr8r Studio

A calm, structured project management workspace: home dashboard, inbox, my tasks, projects with
board / list / table / calendar / timeline / files views, members, teams, activity and settings.

Built with plain JavaScript ES modules and CSS, bundled by [Vite](https://vite.dev). There is no
UI framework and no runtime dependency.

![Gr8r Studio home dashboard](docs/preview.png)

## Getting started

Requires Node.js 24 (`.nvmrc`; `engines` pins `24.x` so Vercel never upgrades the major version on its own).

```bash
npm install
npm run dev       # http://localhost:5173 with hot reload
npm run build     # production build in dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
npm run format    # Prettier
```

## Project structure

```
index.html              HTML entry; loads src/main.js
public/favicon.svg      brand mark
vite.config.js          Vite config, including the Lucide icon-subset plugin
eslint.config.js        lint rules (ESLint flat config); formatting by Prettier (.prettierrc.json)
.github/workflows/      CI: lint, format check, build
docs/preview.png        README screenshot
src/
  main.js               entry: imports styles and modules, then boots the app
  styles/
    index.css           imports every stylesheet in cascade order
    tokens.css          colours, spacing, type, radius, the shared --gutter
    base.css  components.css  shell.css  panels.css  overlays.css  states.css  motion.css  responsive.css
    views/              list, board, table, calendar, timeline, projects & files
    pages/              settings, auth & onboarding
  core/                 utilities, constants, icons, store (state + lookups), theme
  data/seed.js          demo workspace data
  ui/                   shared render helpers, toasts, the select dropdown
  shell/                render loop and router, sidebar/topbar layout, skeletons, view engine
  components/           task list renderer
  pages/                one module per route
  views/                project views: board, table, calendar, timeline, files, overview
  overlays/             task drawer, modals, popovers, context menu, command palette
  features/             teams, subtasks, archive (rendering)
  actions/              user actions, event wiring, keyboard shortcuts, drag and drop
```

### Layers

Dependencies point downward:

1. `core/` and `data/` depend on nothing else in the app.
2. `ui/`, `shell/`, `components/`, `pages/`, `views/`, `overlays/` and `features/` render HTML from state.
3. `actions/` change state and re-render. Each action module registers its handlers on the
   shared action table (`A`) when it loads, so `main.js` imports them after `actions/actions.js`.

## Conventions

- **Rendering:** each page or view is a function that returns an HTML string from the store
  (`S`). `render()` rebuilds the shell and keeps focus and scroll positions.
- **Interactions:** elements declare `data-a="actionName"`. `actions/events.js` delegates the
  click to `A.actionName`. Inputs use `data-in`, blur handlers use `data-blur`.
- **Layout:** every page edge uses `var(--gutter)`, so the breadcrumb, page header, toolbar,
  list, table and board start on the same line.
- **Dropdowns:** write a normal `<select class="select">`. `ui/select.js` renders it as the
  design-system menu and keeps the native element as the source of truth.
- **Icons:** call `ic('name')` with any [Lucide](https://lucide.dev) icon name. The
  `virtual:icons` plugin bundles only the icons the source uses.

## Continuous integration

Every push and pull request runs lint, the format check and a production build
(`.github/workflows/ci.yml`).

## Backend

Vercel serverless functions in `api/` with a [Neon](https://neon.tech) Postgres database:

| Route                | Method              | Purpose                                                                                 |
| -------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `/api/auth/signup`   | POST                | `{ name, email, password }` → creates account, signs in                                 |
| `/api/auth/login`    | POST                | `{ email, password, remember }` → signs in                                              |
| `/api/auth/logout`   | POST                | ends the session                                                                        |
| `/api/auth/me`       | GET                 | the signed-in user, or 401                                                              |
| `/api/workspace`     | GET / PUT           | the user's workspace (`{ data, prefs, views }`)                                         |
| `/api/workspace-url` | GET / POST          | check or claim the workspace address (`yoursite/<slug>`), unique across accounts        |
| `/api/invites`       | GET / POST / DELETE | check an invite link (no sign-in), list, create or revoke the user's invites            |
| `/api/auth/password` | POST                | `{ current, next }` → changes the password, signs out other sessions                    |
| `/api/sessions`      | GET / DELETE        | the user's signed-in devices; sign out one (`?id=`) or all others (`?others=1`)         |
| `/api/files-upload`  | POST                | short-lived token so the browser uploads straight to Vercel Blob (own folder, ≤ 100 MB) |
| `/api/files`         | GET / DELETE        | open (`?path=`, `&download=1`) or delete one of the user's files                        |

Passwords are hashed with scrypt; sessions are random tokens in an `HttpOnly` cookie, stored hashed.
The workspace is saved as one JSON document with a version number, so a stale tab gets a 409 and
reloads the latest copy instead of overwriting it. Tables are created on the first request
(`db/schema.sql` has the same SQL).

**Invite-only sign-up.** New accounts (email or Google) need an invite link from an existing
user: Members → Invite member creates a single-use link per address, valid 14 days, that the
inviter sends themselves (there's no email service yet). The invite only works for the address
it was made for. The first account on an empty database needs no invite, so a fresh deploy can be
set up. Existing accounts sign in as before.

**Workspace URLs.** The address bar mirrors the page as `/<workspace>/<page>`, e.g.
`/acme/project/web/table`, `/acme/task/WEB-201` or `/acme/settings/profile` (`src/shell/url.js`).
`vercel.json` rewrites every non-API path to `index.html` so these links open directly.

When `/api` isn't reachable (plain `npm run dev`), the app runs as a local demo saved in the browser.
To run with the backend locally, use `vercel dev` with `DATABASE_URL` in `.env.local`
(`vercel env pull .env.local`).

## Deploy

`vercel.json` builds with Vite and serves `dist/`; files in `api/` deploy as functions.

1. In the Vercel project, open **Storage → Create Database → Neon** (or Marketplace → Neon) and
   connect it to the project. This sets `DATABASE_URL`.
2. Redeploy. The tables are created automatically.
3. For file uploads and previews: **Storage → Create → Blob**, choose **private** access, and
   connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`; files are stored under
   `u/<user id>/` and only their owner can open them.
4. Optional, for **Continue with Google**: in Google Cloud Console → APIs & Services → Credentials,
   create an OAuth client ID (type _Web application_) with the authorized redirect URI
   `https://<your-domain>/api/auth/google-callback`. Add `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET` to the Vercel project's environment variables and redeploy.
