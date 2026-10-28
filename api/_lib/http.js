/* Small helpers shared by the route handlers. */
export const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

/* Wraps a handler: enforces the allowed methods and turns thrown errors into a 500. */
export function route(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return json(res, 405, { error: 'Method not allowed' });
    }
    try {
      await fn(req, res, req.body || {});
    } catch (e) {
      console.error(e);
      json(res, 500, { error: 'Something went wrong on our side. Try again.' });
    }
  };
}
