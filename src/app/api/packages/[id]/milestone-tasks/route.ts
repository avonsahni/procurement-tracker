import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { rollUpMilestoneTasks, logPackageAudit } from '@/lib/db';
import { withRoute } from '@/lib/withRoute';
import { z } from 'zod';
import { assertProjectActive } from '@/lib/projectGuard';

const CreateSchema = z.object({
  milestoneName: z.string().min(1),
  name:          z.string().min(1).max(200),
  description:   z.string().max(500).optional(),
  startDate:     z.string().nullable().optional(),
  endDate:       z.string().nullable().optional(),
  sortOrder:     z.number().int().min(0).optional(),
});

export const GET = withRoute(async (_req: NextRequest, ctx) => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId } = await ctx!.params as { id: string };

  // RLS check: if the package is not visible to this user, return 404
  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase
    .from('packages')
    .select('id')
    .eq('id', pkgId)
    .maybeSingle();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('milestone_tasks')
    .select('*')
    .eq('package_id', pkgId)
    .order('sort_order')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}, { route: '/api/packages/[id]/milestone-tasks' });

export const POST = withRoute(async (req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId } = await ctx!.params as { id: string };

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  // RLS check: package must be visible to this user
  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase
    .from('packages')
    .select('id, project_id')
    .eq('id', pkgId)
    .maybeSingle();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const admin = createAdminSupabase();

  const g = await assertProjectActive(admin, pkg.project_id, auth);
  if (g) return g;

  // Get org_id from the project (source of truth, not from auth token)
  const { data: proj } = await admin
    .from('projects')
    .select('org_id')
    .eq('id', pkg.project_id)
    .maybeSingle();
  if (!proj?.org_id) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: task, error } = await admin
    .from('milestone_tasks')
    .insert({
      package_id:     pkgId,
      org_id:         proj.org_id,
      milestone_name: parsed.data.milestoneName,
      name:           parsed.data.name,
      description:    parsed.data.description ?? null,
      progress:       0,
      start_date:     parsed.data.startDate ?? null,
      end_date:       parsed.data.endDate ?? null,
      sort_order:     parsed.data.sortOrder ?? 0,
      created_by:     auth.fullName,
    })
    .select()
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await rollUpMilestoneTasks(admin, pkgId);
  await logPackageAudit(admin, auth, pkgId, 'Task Added', 'milestone', {
    task: task.name, milestone: task.milestone_name,
  });

  return NextResponse.json(task, { status: 201 });
}, { route: '/api/packages/[id]/milestone-tasks' });
