/* Neon Postgres over HTTP. DATABASE_URL is set by the Neon integration on Vercel. */
import { neon } from '@neondatabase/serverless';

let sql, ready;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  sql ||= neon(process.env.DATABASE_URL);
  ready ||= migrate(sql).catch(e => {
    ready = null;
    throw e;
  });
  return ready.then(() => sql);
}

async function migrate(q) {
  await q`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, pw_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  await q`CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`;
  await q`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`;
  await q`CREATE TABLE IF NOT EXISTS workspaces (user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, state jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`;
}
