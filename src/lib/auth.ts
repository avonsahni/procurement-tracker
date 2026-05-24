import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  canEdit: boolean;
};

/**
 * Returns the current authenticated user with their profile, or null.
 * Pulls session from the Supabase auth cookie set by login.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, can_edit')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
    // Every user is admin of their own workspace (single-tenant-per-user model)
    role: 'admin',
    canEdit: profile?.can_edit ?? true,
  };
}

/**
 * Route guard. Returns the user, or a NextResponse to short-circuit the handler.
 *
 *   const auth = await guard('editor');
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is AuthUser here
 *
 * Roles:
 *   - 'user'   — any authenticated user
 *   - 'editor' — must have can_edit=true (personal edit-mode lock)
 *   - 'admin'  — every user is admin of their own workspace, so same as 'user'
 */
export async function guard(role: 'user' | 'editor' | 'admin'): Promise<NextResponse | AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (role === 'editor' && !user.canEdit) {
    return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
  }
  return user;
}
