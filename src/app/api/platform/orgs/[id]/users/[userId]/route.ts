import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// PATCH /api/platform/orgs/[id]/users/[userId]  — change role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId, userId } = await params;
  const { role } = await req.json();

  if (!['owner', 'admin', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be owner, admin, or viewer.' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('organization_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role });
}

// DELETE /api/platform/orgs/[id]/users/[userId]  — remove user from org
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId, userId } = await params;

  // Prevent removing yourself
  if (userId === auth.id) {
    return NextResponse.json({ error: 'Cannot remove yourself from an organisation.' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Count owners — prevent removing the last owner
  const { data: owners } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner');

  const isOwner = (owners || []).some(o => o.user_id === userId);
  if (isOwner && (owners || []).length <= 1) {
    return NextResponse.json({ error: 'Cannot remove the last owner of an organisation.' }, { status: 400 });
  }

  const { error } = await admin
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
