import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// PUT /api/platform/orgs/[id]  — update plan, status, notes
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const body = await req.json();
  const { plan, subscription_status, paused_reason, platform_notes } = body;

  const admin = createAdminSupabase();
  const updates: Record<string, any> = {};

  if (plan !== undefined) updates.plan = plan;
  if (platform_notes !== undefined) updates.platform_notes = platform_notes;

  if (subscription_status !== undefined) {
    updates.subscription_status = subscription_status;
    if (subscription_status === 'paused') {
      updates.paused_at = new Date().toISOString();
      updates.paused_reason = paused_reason || null;
    } else {
      // Unpausing or activating — clear pause metadata
      updates.paused_at = null;
      updates.paused_reason = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/platform/orgs/[id]  — permanently delete an org and all its data
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;

  // Safety: cannot delete your own org
  if (orgId === auth.orgId) {
    return NextResponse.json(
      { error: 'Cannot delete your own organisation.' },
      { status: 400 }
    );
  }

  const admin = createAdminSupabase();

  // Cascade: organizations → org_members, projects → packages → vendors/invoices/etc.
  // All FK relationships have ON DELETE CASCADE, so deleting the org is sufficient.
  const { error } = await admin
    .from('organizations')
    .delete()
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
