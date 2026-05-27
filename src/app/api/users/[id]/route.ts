import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addOrgAuditEntry } from '@/lib/db';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id: rawId } = await params;

  const parsed = uuidSchema.safeParse(rawId);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  const id = parsed.data;

  const isSelf = id === auth.id;
  const isOrgAdmin = ['owner', 'admin'].includes(auth.orgRole);
  if (!isSelf && !isOrgAdmin) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminSupabase();

  if (!isSelf) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', id)
      .eq('org_id', auth.orgId)
      .single();
    if (!membership) return NextResponse.json({ error: 'User not in your organisation' }, { status: 403 });
  }

  // Grab target user info for audit label before making changes
  const { data: targetProfile } = await admin.from('profiles').select('full_name').eq('id', id).maybeSingle();
  const targetName = targetProfile?.full_name || id;

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

  // Audit (only log admin changes to other users, not self-edits)
  if (isOrgAdmin && !isSelf) {
    const changes: string[] = [];
    if (body.role !== undefined) changes.push(`role → ${body.role}`);
    if (body.canEdit !== undefined) changes.push(`can_edit → ${body.canEdit}`);
    if (body.fullName !== undefined) changes.push(`name → ${body.fullName}`);
    await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
      'User Updated', 'user_mgmt', targetName,
      { changes: changes.join(', ') });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const { id: rawId } = await params;

  const parsed = uuidSchema.safeParse(rawId);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  const id = parsed.data;

  if (id === auth.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data: membership } = await admin
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', id)
    .eq('org_id', auth.orgId)
    .single();
  if (!membership) return NextResponse.json({ error: 'User not in your organisation' }, { status: 403 });

  if (membership.role === 'owner') {
    const { data: owners } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('org_id', auth.orgId)
      .eq('role', 'owner');
    if ((owners || []).length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last owner of the organisation. Promote another user to owner first.' },
        { status: 400 }
      );
    }
  }

  // Grab name before deleting
  const { data: targetProfile } = await admin.from('profiles').select('full_name').eq('id', id).maybeSingle();
  const { data: targetAuthUser } = await admin.auth.admin.getUserById(id);
  const targetName = targetProfile?.full_name || targetAuthUser?.user?.email || id;

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'User Removed', 'user_mgmt', targetName,
    { role: membership.role });

  return NextResponse.json({ ok: true });
}
