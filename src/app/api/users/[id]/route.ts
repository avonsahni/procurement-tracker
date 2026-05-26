import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const isSelf = id === auth.id;
  const isOrgAdmin = ['owner', 'admin'].includes(auth.orgRole);
  if (!isSelf && !isOrgAdmin) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminSupabase();

  // Verify target is in the same org when updating someone else
  if (!isSelf) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', id)
      .eq('org_id', auth.orgId)
      .single();
    if (!membership) return NextResponse.json({ error: 'User not in your organisation' }, { status: 403 });
  }

  const updates: Record<string, any> = {};
  if (body.fullName !== undefined) updates.full_name = body.fullName;
  if (body.canEdit !== undefined) updates.can_edit = body.canEdit;
  if (Object.keys(updates).length > 0) {
    await admin.from('profiles').update(updates).eq('id', id);
  }

  if (body.role !== undefined && isOrgAdmin && !isSelf) {
    const orgRole = body.role === 'admin' ? 'admin' : 'viewer';
    await admin.from('organization_members').update({ role: orgRole }).eq('user_id', id).eq('org_id', auth.orgId);
  }

  if (body.password && isSelf) {
    const supabase = await createServerSupabase();
    const { error: pwErr } = await supabase.auth.updateUser({ password: body.password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  if (id === auth.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data: membership } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', id)
    .eq('org_id', auth.orgId)
    .single();
  if (!membership) return NextResponse.json({ error: 'User not in your organisation' }, { status: 403 });

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
