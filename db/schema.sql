-- Gr8r Studio schema. api/_lib/db.js applies this automatically on first request;
-- it is kept here so the tables can also be created by hand (psql "$DATABASE_URL" -f db/schema.sql).
CREATE TABLE IF NOT EXISTS users (
  id         text PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  name       text NOT NULL,
  pw_hash    text NOT NULL, -- '' for accounts created with Google
  google_id  text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS workspaces (
  user_id    text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state      jsonb NOT NULL,
  version    integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Each user's workspace address (yoursite/<slug>); unique across all users.
CREATE TABLE IF NOT EXISTS workspace_urls (
  slug    text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);
-- Sign-up is invite-only: an account can only be created with an unused, unexpired invite link.
CREATE TABLE IF NOT EXISTS invites (
  token_hash  text PRIMARY KEY,
  email       text NOT NULL,
  invited_by  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  accepted_by text REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites(email);
