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
  // Session verification uses the cookie-based client
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile + org lookup use the admin client to bypass RLS fragility.
  // We already know who the user is from the verified JWT above.
  const admin = createAdminSupabase();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from('profiles').select('full_name, can_edit').eq('id', user.id).maybeSingle(),
    admin.from('organization_members').select('org_id, role').eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'viewer']).order('role').limit(1).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
    role: membership?.role === 'owner' || membership?.role === 'admin' ? 'admin' : 'user',
    canEdit: profile?.can_edit ?? true,
    orgId: membership?.org_id ?? '',
    orgRole: (membership?.role as 'owner' | 'admin' | 'viewer') ?? 'viewer',
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
