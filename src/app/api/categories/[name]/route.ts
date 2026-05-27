import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { CategoryUpdateSchema, parseBody } from '@/lib/validation';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { name: rawOld } = await params;
  const oldName = decodeURIComponent(rawOld);

  const parsed = await parseBody(req, CategoryUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const newName = parsed.data.name;

  const admin = createAdminSupabase();

  // Rename category across all packages in this org
  await admin.from('categories').update({ name: newName })
    .eq('org_id', auth.orgId).eq('name', oldName);

  // Update package.category labels in all org projects
  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .eq('org_id', auth.orgId);
  const ids = (projects || []).map((p: any) => p.id);
  if (ids.length) {
    await admin.from('packages')
      .update({ category: newName })
      .in('project_id', ids)
      .eq('category', oldName);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { name } = await params;

  const admin = createAdminSupabase();
  await admin.from('categories').delete()
    .eq('org_id', auth.orgId)
    .eq('name', decodeURIComponent(name));

  return NextResponse.json({ ok: true });
}
