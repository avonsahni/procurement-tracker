import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Platform admin: wipe all project data for an org without deleting the org or its users.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  // 1. Collect document storage paths for this org
  const { data: docs } = await admin
    .from('documents')
    .select('storage_path')
    .filter('storage_path', 'ilike', `${orgId}/%`);

  const docPaths = (docs ?? []).map((d: any) => d.storage_path).filter(Boolean);

  // 2. Collect remark image paths via package → project → org join
  const { data: pkgs } = await admin
    .from('packages')
    .select('id, projects!inner(org_id)')
    .eq('projects.org_id', orgId);

  const pkgIds = (pkgs ?? []).map((p: any) => p.id);
  let imagePaths: string[] = [];

  if (pkgIds.length > 0) {
    const { data: remarks } = await admin
      .from('remarks')
      .select('image_urls')
      .in('package_id', pkgIds);
    imagePaths = (remarks ?? []).flatMap((r: any) => r.image_urls ?? []).filter(Boolean);
  }

  // 3. Delete storage files (non-fatal if partial error)
  const allPaths = [...docPaths, ...imagePaths];
  if (allPaths.length > 0) {
    await admin.storage.from('package-documents').remove(allPaths);
  }

  // 4. Delete all projects — cascades to packages, vendors, audits, remarks, documents
  const { error } = await admin.from('projects').delete().eq('org_id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, filesDeleted: allPaths.length });
}
