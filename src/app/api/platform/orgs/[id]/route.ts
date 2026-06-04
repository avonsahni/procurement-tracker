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

  const [orgRes, membersRes, projectsRes, storageRes, authRes] = await Promise.all([
    admin.from('organizations')
      .select(`id, name, plan, subscription_status, trial_ends_at,
               paused_at, paused_reason, platform_notes, created_at, seat_count,
               org_type, website, address_line1, city, state_region, country,
               phone, contact_name, contact_title, contact_email, coupon_code`)
      .eq('id', orgId)
      .maybeSingle(),
    admin.from('organization_members').select('org_id, user_id, role').eq('org_id', orgId),
    admin.from('projects').select('id').eq('org_id', orgId),
    admin.from('org_storage_bytes').select('used_bytes').eq('org_id', orgId).maybeSingle(),
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
    usedBytes:    Number((storageRes.data as any)?.used_bytes ?? 0),
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
  const { plan, subscription_status, paused_reason, platform_notes, trial_ends_at, seat_count } = body;

  const admin = createAdminSupabase();
  const updates: Record<string, any> = {};

  if (plan !== undefined) updates.plan = plan;
  if (platform_notes !== undefined) updates.platform_notes = platform_notes;
  if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at || null;
  if (seat_count !== undefined) {
    const n = seat_count === null || seat_count === '' ? null : Number(seat_count);
    updates.seat_count = (!n || isNaN(n) || n < 1) ? null : n;
  }

  // Registration / contact details — platform admins can edit these too.
  const REG_FIELDS = [
    'contact_name', 'contact_title', 'contact_email', 'phone', 'org_type',
    'website', 'address_line1', 'city', 'state_region', 'country',
  ] as const;
  for (const key of REG_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key] === '' ? null : body[key];
  }

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

// DELETE /api/platform/orgs/[id]  — permanently delete an org and everything related to it
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

  // 1. Collect member user IDs before the cascade removes membership rows
  const { data: members } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId);
  const userIds = (members ?? []).map((m: any) => m.user_id as string).filter(Boolean);

  // 2. Collect storage file paths so the bucket is cleaned up
  let filesDeleted = 0;
  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .eq('org_id', orgId);
  const projectIds = (projects ?? []).map((p: any) => p.id as string);

  if (projectIds.length > 0) {
    const { data: packages } = await admin
      .from('packages')
      .select('id')
      .in('project_id', projectIds);
    const pkgIds = (packages ?? []).map((p: any) => p.id as string);

    if (pkgIds.length > 0) {
      const storagePaths: string[] = [];

      const { data: docs } = await admin
        .from('documents')
        .select('storage_path')
        .in('package_id', pkgIds)
        .not('storage_path', 'is', null);
      for (const d of docs ?? []) {
        if ((d as any).storage_path) storagePaths.push((d as any).storage_path);
      }

      const { data: remarks } = await admin
        .from('remarks')
        .select('image_urls')
        .in('package_id', pkgIds);
      for (const r of remarks ?? []) {
        for (const url of (r as any).image_urls ?? []) {
          if (url) storagePaths.push(url);
        }
      }

      // Delete files in batches — non-fatal if bucket operation fails
      if (storagePaths.length > 0) {
        const BATCH = 100;
        for (let i = 0; i < storagePaths.length; i += BATCH) {
          const batch = storagePaths.slice(i, i + BATCH);
          const { data: removed } = await admin.storage.from('package-documents').remove(batch);
          filesDeleted += (removed ?? []).length;
        }
      }
    }
  }

  // 3. Delete the org — FK cascades handle all relational data:
  //    organization_members, projects, packages, vendors, invoices, remarks,
  //    documents, audit_trail, package_milestones, milestone_tasks, cash_inflow,
  //    cash_outflow, company_info, categories, org_audit_log
  const { error } = await admin
    .from('organizations')
    .delete()
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Delete auth users — cascades to profiles and active_sessions
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid);
  }

  return NextResponse.json({ ok: true, usersDeleted: userIds.length, filesDeleted });
}
