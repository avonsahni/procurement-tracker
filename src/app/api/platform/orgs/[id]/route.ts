import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/platform/orgs/[id]  — full org detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  const [orgRes, membersRes, projectsRes, authRes] = await Promise.all([
    admin.from('organizations')
      .select(`id, name, plan, subscription_status, trial_ends_at,
               paused_at, paused_reason, platform_notes, created_at,
               org_type, website, address_line1, city, state_region, country,
               phone, contact_name, contact_title, contact_email, coupon_code`)
      .eq('id', orgId)
      .maybeSingle(),
    admin.from('organization_members').select('org_id, user_id, role').eq('org_id', orgId),
    admin.from('projects').select('id').eq('org_id', orgId),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (orgRes.error) return NextResponse.json({ error: orgRes.error.message }, { status: 500 });
  if (!orgRes.data)  return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

  const emailById: Record<string, string> = {};
  for (const u of authRes.data?.users || []) emailById[u.id] = u.email ?? '';

  const ownerEmails = (membersRes.data || [])
    .filter(m => m.role === 'owner')
    .map(m => emailById[m.user_id])
    .filter(Boolean);

  return NextResponse.json({
    ...orgRes.data,
    memberCount:  (membersRes.data || []).length,
    projectCount: (projectsRes.data || []).length,
    ownerEmails,
  });
}

// PUT /api/platform/orgs/[id]  — update plan, status, notes
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const body = await req.json();
  const { plan, subscription_status, paused_reason, platform_notes, trial_ends_at } = body;

  const admin = createAdminSupabase();
  const updates: Record<string, any> = {};

  if (plan !== undefined) updates.plan = plan;
  if (platform_notes !== undefined) updates.platform_notes = platform_notes;
  if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at || null;

  if (subscription_status !== undefined) {
    updates.subscription_status = subscription_status;
    if (subscription_status === 'paused') {
      updates.paused_at = new Date().toISOString();
      updates.paused_reason = paused_reason || null;
    } else {
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
