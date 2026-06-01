import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Platform admin: wipe all project data for an org without deleting the org or its users.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  // 1. Get all project IDs for this org
  const { data: projects, error: projErr } = await admin
    .from('projects')
    .select('id')
    .eq('org_id', orgId);

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });

  const projectIds = (projects ?? []).map((p: any) => p.id);

  let filesDeleted = 0;

  if (projectIds.length > 0) {
    // 2. Get all package IDs for those projects
    const { data: packages } = await admin
      .from('packages')
      .select('id')
      .in('project_id', projectIds);

    const pkgIds = (packages ?? []).map((p: any) => p.id);

    // 3. Collect storage file paths to clean up from the bucket
    const storagePaths: string[] = [];

    if (pkgIds.length > 0) {
      // Document storage paths
      const { data: docs } = await admin
        .from('documents')
        .select('storage_path')
        .in('package_id', pkgIds)
        .not('storage_path', 'is', null);

      for (const d of docs ?? []) {
        if (d.storage_path) storagePaths.push(d.storage_path);
      }

      // Remark image paths (image_urls column — added in migration 021)
      const { data: remarks } = await admin
        .from('remarks')
        .select('image_urls')
        .in('package_id', pkgIds);

      for (const r of remarks ?? []) {
        for (const url of (r as any).image_urls ?? []) {
          if (url) storagePaths.push(url);
        }
      }
    }

    // 4. Delete storage files in batches (non-fatal)
    if (storagePaths.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < storagePaths.length; i += BATCH) {
        const batch = storagePaths.slice(i, i + BATCH);
        const { data: removed } = await admin.storage.from('package-documents').remove(batch);
        filesDeleted += (removed ?? []).length;
      }
    }
  }

  // 5. Delete all projects — cascade removes packages, vendors, remarks, documents,
  //    audit_trail, package_milestones, milestone_tasks, invoices
  const { error: deleteErr } = await admin
    .from('projects')
    .delete()
    .eq('org_id', orgId);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, projectsWiped: projectIds.length, filesDeleted });
}
