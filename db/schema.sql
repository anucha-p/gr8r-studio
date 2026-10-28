-- Gr8r Studio schema. api/_lib/db.js applies this automatically on first request;
-- it is kept here so the tables can also be created by hand (psql "$DATABASE_URL" -f db/schema.sql).
CREATE TABLE IF NOT EXISTS users (
  id         text PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  name       text NOT NULL,
  pw_hash    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS workspaces (
  user_id    text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state      jsonb NOT NULL,
  version    integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
