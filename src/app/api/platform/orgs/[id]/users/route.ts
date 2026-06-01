import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/platform/orgs/[id]/users  — list all members of an org
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  const [membersRes, authRes, profilesRes] = await Promise.all([
    admin.from('organization_members')
      .select('user_id, role, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('id, full_name').in(
      'id',
      // We'll re-filter after we get members — pass a placeholder to avoid a second round-trip
      // We'll compute intersection client-side below
      [] as string[]
    ),
  ]);

  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 });

  const members = membersRes.data || [];
  const memberIds = members.map(m => m.user_id);

  // Fetch profiles including can_edit to derive the display role
  const { data: profiles } = memberIds.length > 0
    ? await admin.from('profiles').select('id, full_name, can_edit').in('id', memberIds)
    : { data: [] };

  const emailById: Record<string, string> = {};
  for (const u of authRes.data?.users || []) emailById[u.id] = u.email ?? '';

  const profileById: Record<string, any> = {};
  for (const p of profiles || []) profileById[p.id] = p;

  const result = members.map(m => {
    const profile  = profileById[m.user_id];
    const canEdit  = profile?.can_edit ?? true;
    const orgRole  = m.role as 'owner' | 'admin' | 'viewer';
    // Derive the 3-tier display role (keep owner as-is for the platform admin view)
    const role = orgRole === 'owner' ? 'owner'
               : orgRole === 'admin' ? 'admin'
               : canEdit             ? 'user'
               :                       'viewer';
    return {
      id:       m.user_id,
      email:    emailById[m.user_id] ?? '',
      fullName: profile?.full_name ?? '',
      role,
      joinedAt: m.created_at,
    };
  });

  return NextResponse.json(result);
}

// POST /api/platform/orgs/[id]/users  — add an existing user to an org
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const { email, role = 'user' } = await req.json();

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  if (!['admin', 'user', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be admin, user, or viewer.' }, { status: 400 });
  }

  // Map display role → orgRole + canEdit
  const orgRole  = role === 'admin' ? 'admin' : 'viewer';
  const canEdit  = role !== 'viewer';

  const admin = createAdminSupabase();

  // Look up the user by email
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const targetUser = (authList?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!targetUser) {
    return NextResponse.json({ error: 'No account found with that email address.' }, { status: 404 });
  }

  // Check org exists
  const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

  // Check already a member
  const { data: existing } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'This user is already a member of this organisation.' }, { status: 409 });

  const { error: insertErr } = await admin
    .from('organization_members')
    .insert({ org_id: orgId, user_id: targetUser.id, role: orgRole });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Set can_edit on their profile
  await admin.from('profiles').update({ can_edit: canEdit }).eq('id', targetUser.id);

  // Fetch their profile name
  const { data: profile } = await admin.from('profiles').select('full_name').eq('id', targetUser.id).maybeSingle();

  return NextResponse.json({
    id:       targetUser.id,
    email:    targetUser.email ?? '',
    fullName: profile?.full_name ?? '',
    role,
    joinedAt: new Date().toISOString(),
  }, { status: 201 });
}
