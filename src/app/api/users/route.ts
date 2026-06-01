import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addOrgAuditEntry } from '@/lib/db';
import { withRoute } from '@/lib/withRoute';

export const GET = withRoute(async () => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();

  // Get all members of the caller's org
  const { data: members, error: memErr } = await admin
    .from('organization_members')
    .select('user_id, role')
    .eq('org_id', auth.orgId);

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

  const ids = (members || []).map((m: any) => m.user_id);
  if (ids.length === 0) return NextResponse.json([]);

  const roleByUserId: Record<string, string> = {};
  for (const m of members || []) roleByUserId[m.user_id] = m.role;

  // Fetch auth users + profiles in parallel
  const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers();
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const { data: profiles } = await admin.from('profiles').select('id, full_name, can_edit').in('id', ids);
  const profileById: Record<string, any> = {};
  for (const p of profiles || []) profileById[p.id] = p;

  const orgUsers = users
    .filter(u => ids.includes(u.id))
    .map(u => {
      const profile = profileById[u.id];
      const orgRole  = roleByUserId[u.id] || 'viewer';
      const canEdit  = profile?.can_edit ?? true;
      const isOrgAdmin = orgRole === 'owner' || orgRole === 'admin';
      const role = isOrgAdmin ? 'admin' : canEdit ? 'user' : 'viewer';
      return {
        id: u.id,
        username: u.email ?? '',
        fullName: profile?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
        role,
        canEdit,
        orgRole,
        isYou: u.id === auth.id,
      };
    });

  return NextResponse.json(orgUsers);
}, { route: '/api/users' });

export const POST = withRoute(async (req: NextRequest) => {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const { fullName, username, password, role, canEdit } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // admin → orgRole:'admin', canEdit:true
  // user  → orgRole:'viewer', canEdit:true
  // viewer → orgRole:'viewer', canEdit:false
  const orgRole  = role === 'admin' ? 'admin' : 'viewer';
  const editFlag = role !== 'viewer';

  const admin = createAdminSupabase();

  const { data, error } = await admin.auth.admin.createUser({
    email: username,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || username,
      org_id: auth.orgId,
      org_role: orgRole,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('profiles').update({ can_edit: editFlag }).eq('id', data.user.id);

  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'User Invited', 'user_mgmt', fullName || username,
    { email: username, role: role || 'user' });

  return NextResponse.json({
    id: data.user.id,
    username: data.user.email ?? '',
    fullName: fullName || username,
    role: role || 'user',
    canEdit: editFlag,
    orgRole,
  });
}, { route: '/api/users' });
