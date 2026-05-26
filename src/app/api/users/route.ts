import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();

  const { data: { users }, error } = await admin.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch profiles for can_edit
  const ids = users.map(u => u.id);
  const { data: profiles } = await admin.from('profiles').select('id, full_name, can_edit').in('id', ids);
  const profileById: Record<string, any> = {};
  for (const p of profiles || []) profileById[p.id] = p;

  return NextResponse.json(users.map(u => {
    const profile = profileById[u.id];
    return {
      id: u.id,
      username: u.email ?? '',
      fullName: profile?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      role: u.id === auth.id ? 'admin' : 'user',
      canEdit: profile?.can_edit ?? true,
    };
  }));
}

export async function POST(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const { fullName, username, password, role, canEdit } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin.auth.admin.createUser({
    email: username,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || username },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update can_edit on the profile row the trigger created
  await admin.from('profiles').update({ can_edit: canEdit ?? true }).eq('id', data.user.id);

  return NextResponse.json({
    id: data.user.id,
    username: data.user.email ?? '',
    fullName: fullName || username,
    role: role || 'user',
    canEdit: canEdit ?? true,
  });
}
