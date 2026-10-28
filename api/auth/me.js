import { currentUser } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

export default route(['GET'], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  json(res, 200, { user });
});
