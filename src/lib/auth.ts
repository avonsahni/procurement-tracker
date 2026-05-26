import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  canEdit: boolean;
  orgId: string;
  orgRole: 'owner' | 'admin' | 'viewer';
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminSupabase();

  const [{ data: profile, error: profileErr }, { data: memberships, error: memErr }] = await Promise.all([
    admin.from('profiles').select('full_name, can_edit').eq('id', user.id).maybeSingle(),
    admin.from('organization_members').select('org_id, role').eq('user_id', user.id),
  ]);

  if (profileErr) console.error('[getCurrentUser] profile error:', profileErr.message);
  if (memErr) console.error('[getCurrentUser] membership error:', memErr.message);

  // Pick highest-privilege membership: owner > admin > viewer
  const priority = { owner: 0, admin: 1, viewer: 2 };
  const membership = (memberships || []).sort(
    (a, b) => (priority[a.role as keyof typeof priority] ?? 9) - (priority[b.role as keyof typeof priority] ?? 9)
  )[0] ?? null;

  console.log('[getCurrentUser] user=%s memberships=%d role=%s orgId=%s',
    user.email, (memberships || []).length, membership?.role, membership?.org_id);

  const orgRole = (membership?.role as 'owner' | 'admin' | 'viewer') ?? 'viewer';

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
    role: orgRole === 'owner' || orgRole === 'admin' ? 'admin' : 'user',
    canEdit: profile?.can_edit ?? true,
    orgId: membership?.org_id ?? '',
    orgRole,
  };
}

/**
 * Route guard. Returns the user, or a NextResponse to short-circuit the handler.
 * Roles:
 *   - 'user'   — any authenticated user
 *   - 'editor' — must have can_edit=true
 *   - 'admin'  — must be org owner or admin
 */
export async function guard(role: 'user' | 'editor' | 'admin'): Promise<NextResponse | AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (role === 'editor' && !user.canEdit) {
    return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
  }
  if (role === 'admin' && !['owner', 'admin'].includes(user.orgRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return user;
}
