import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string; rid: string }> };

// PUT /api/packages/[id]/remarks/[rid]  — edit remark text (own remarks only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { rid } = await params;
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Fetch the remark to verify ownership
  const { data: remark } = await admin
    .from('remarks')
    .select('id, user_id')
    .eq('id', rid)
    .maybeSingle();

  if (!remark) return NextResponse.json({ error: 'Remark not found' }, { status: 404 });

  // Only the author can edit their own remark
  if (remark.user_id !== auth.id) {
    return NextResponse.json({ error: 'You can only edit your own remarks' }, { status: 403 });
  }

  const { data: updated, error } = await admin
    .from('remarks')
    .update({ text: text.trim() })
    .eq('id', rid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: updated.id,
    user: updated.username,
    text: updated.text,
    timestamp: updated.timestamp,
    userId: updated.user_id,
  });
}

// DELETE /api/packages/[id]/remarks/[rid]  — delete (own remark or admin)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, rid } = await params;
  const admin = createAdminSupabase();

  // Verify the package belongs to the caller's org before acting
  const { data: pkg } = await admin
    .from('packages')
    .select('project_id')
    .eq('id', pkgId)
    .maybeSingle();

  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const { data: proj } = await admin
    .from('projects')
    .select('org_id')
    .eq('id', pkg.project_id)
    .maybeSingle();

  if (!proj || proj.org_id !== auth.orgId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch the remark to verify ownership
  const { data: remark } = await admin
    .from('remarks')
    .select('id, user_id')
    .eq('id', rid)
    .maybeSingle();

  if (!remark) return NextResponse.json({ error: 'Remark not found' }, { status: 404 });

  // Must be own remark OR org admin
  const isOwner = remark.user_id === auth.id;
  const isAdmin = auth.orgRole === 'owner' || auth.orgRole === 'admin';

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'You can only delete your own remarks' }, { status: 403 });
  }

  const { error } = await admin.from('remarks').delete().eq('id', rid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
