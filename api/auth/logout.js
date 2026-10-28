import { endSession } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

export default route(['POST'], async (req, res) => {
  await endSession(req, res);
  json(res, 200, { ok: true });
});
