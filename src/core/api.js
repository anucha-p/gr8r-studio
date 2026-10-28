/* ---------- backend API (Vercel functions in /api) ---------- */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body || {};
  }
}
/* Throws ApiError for HTTP errors and TypeError when the network or backend is unreachable. */
export async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api/' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = r.headers.get('content-type') || '';
  const j = ct.includes('application/json') ? await r.json() : null;
  if (!r.ok || !j) throw new ApiError(r.status, j);
  return j;
}
