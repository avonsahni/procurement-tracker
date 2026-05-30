import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret — reject anything unauthorised
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const results: { orgId: string; status: 'deleted' | 'error'; detail?: string }[] = [];

  // Find all trial orgs whose trial period has ended
  const { data: expiredOrgs, error: queryError } = await admin
    .from('organizations')
    .select('id')
    .eq('subscription_status', 'trial')
    .lt('trial_ends_at', new Date().toISOString());

  if (queryError) {
    console.error('[cleanup-expired-trials] query error:', queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!expiredOrgs || expiredOrgs.length === 0) {
    return NextResponse.json({ deleted: 0, results: [] });
  }

  for (const org of expiredOrgs) {
    const orgId = org.id;
    try {
      // 1. Collect all storage paths for documents belonging to this org
      const { data: docs } = await admin
        .from('documents')
        .select('storage_path')
        .filter('storage_path', 'ilike', `${orgId}/%`);

      const docPaths = (docs ?? []).map(d => d.storage_path).filter(Boolean);

      // 2. Collect remark image storage paths for packages in this org
      const { data: pkgs } = await admin
        .from('packages')
        .select('id, projects(org_id)')
        .filter('projects.org_id', 'eq', orgId);

      const pkgIds = (pkgs ?? []).map((p: any) => p.id);
      let imagePaths: string[] = [];

      if (pkgIds.length > 0) {
        const { data: remarks } = await admin
          .from('remarks')
          .select('image_urls')
          .in('package_id', pkgIds);

        imagePaths = (remarks ?? [])
          .flatMap((r: any) => r.image_urls ?? [])
          .filter(Boolean);
      }

      // 3. Delete storage files (errors here are non-fatal — DB cascade will remove records)
      const allPaths = [...docPaths, ...imagePaths];
      if (allPaths.length > 0) {
        const { error: storageError } = await admin.storage
          .from('package-documents')
          .remove(allPaths);
        if (storageError) {
          console.warn(`[cleanup] storage delete partial error for org ${orgId}:`, storageError.message);
        }
      }

      // 4. Collect member user IDs before deleting org (cascade will remove membership rows)
      const { data: members } = await admin
        .from('organization_members')
        .select('user_id')
        .eq('org_id', orgId);

      const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);

      // 5. Delete the org row — ON DELETE CASCADE wipes projects, packages, remarks,
      //    documents, organization_members, company_info, categories
      const { error: orgDeleteError } = await admin
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (orgDeleteError) throw new Error(orgDeleteError.message);

      // 6. Delete auth users (must happen after org delete so RLS-dependent triggers fire cleanly)
      for (const uid of userIds) {
        const { error: authErr } = await admin.auth.admin.deleteUser(uid);
        if (authErr) {
          console.warn(`[cleanup] could not delete auth user ${uid}:`, authErr.message);
        }
      }

      results.push({ orgId, status: 'deleted' });
    } catch (err: any) {
      console.error(`[cleanup] failed for org ${orgId}:`, err.message);
      results.push({ orgId, status: 'error', detail: err.message });
    }
  }

  return NextResponse.json({ deleted: results.filter(r => r.status === 'deleted').length, results });
}
