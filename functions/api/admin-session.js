const SUPABASE_URL = 'https://renzehysxirjilvdxacv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';

export async function onRequestGet({ request }) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return Response.json({ allowed: false, reason: 'login_required' }, { status: 401 });
  }
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: SUPABASE_KEY }
  });
  if (!response.ok) {
    return Response.json({ allowed: false, reason: 'invalid_session' }, { status: 401 });
  }
  const user = await response.json();
  const grade = user.app_metadata?.grade || user.app_metadata?.role || 'associate';
  const allowed = grade === 'admin' || grade === 'manager';
  return Response.json({
    allowed,
    grade,
    mode: grade === 'admin' ? 'edit' : grade === 'manager' ? 'read' : 'none',
    email: allowed ? user.email : undefined
  }, { status: allowed ? 200 : 403 });
}
