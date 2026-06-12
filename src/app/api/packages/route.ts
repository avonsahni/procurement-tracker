import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { assemblePackage, logPackageAudit } from '@/lib/db';
import { guard } from '@/lib/auth';
import { PackageCreateSchema, parseBody } from '@/lib/validation';
import { withRoute } from '@/lib/withRoute';
import { assertProjectActive } from '@/lib/projectGuard';

export const POST = withRoute(async (req: NextRequest) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, PackageCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { projectId, name, category, origin, currency } = parsed.data;

  const supabase = await createServerSupabase();

  // RLS will block this if the project isn't owned by the user
  const { data: project } = await supabase.from('projects').select('id, status').eq('id', projectId).single();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const g = await assertProjectActive(supabase, projectId, auth);
  if (g) return g;

  // Dedup guard: same name in same project within 10 s → return existing row
  const dedupeWindow = new Date(Date.now() - 10_000).toISOString();
  const { data: existing } = await supabase
    .from('packages')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', name)
    .gte('created_at', dedupeWindow)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(await assemblePackage(supabase, existing), { status: 201 });
  }

  const { data: row, error } = await supabase
    .from('packages')
    .insert({ project_id: projectId, name, description: '', category, origin, currency, current_stage: 'Spec Received' })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await logPackageAudit(createAdminSupabase(), auth, row.id, 'Package Created', 'package', { category, origin });

  return NextResponse.json(await assemblePackage(supabase, row), { status: 201 });
}, { route: '/api/packages' });
