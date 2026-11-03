/* File storage on Vercel Blob (private store). Connecting a store to the project sets either
   BLOB_STORE_ID (newer stores; the SDK authenticates with the project's Vercel OIDC token) or
   BLOB_READ_WRITE_TOKEN (older stores). Every file lives under u/<user id>/, so ownership is a
   path check. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const configured = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
export const userPrefix = user => `u/${user.id}/`;

/* The stored pathname, if it belongs to this user; otherwise null. */
export function ownPath(user, path) {
  const p = String(path || '');
  return p.startsWith(userPrefix(user)) && !p.includes('..') ? p : null;
}
