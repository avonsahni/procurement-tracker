import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { rollUpMilestoneTasks, logPackageAudit } from '@/lib/db';
import { withRoute } from '@/lib/withRoute';
import { z } from 'zod';
import { assertProjectActive } from '@/lib/projectGuard';

const UpdateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  progress:    z.number().int().min(0).max(100).optional(),
  startDate:   z.string().nullable().optional(),
  endDate:     z.string().nullable().optional(),
  sortOrder:   z.number().int().min(0).optional(),
});

/** RLS-based package access check. Returns project_id if accessible, null otherwise. */
async function checkPackageAccess(pkgId: string): Promise<{ id: string; project_id: string } | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('packages')
    .select('id, project_id')
    .eq('id', pkgId)
    .maybeSingle();
  return data ?? null;
}

export const PATCH = withRoute(async (req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, tid } = await ctx!.params as { id: string; tid: string };

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const pkg = await checkPackageAccess(pkgId);
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const admin = createAdminSupabase();

  const g = await assertProjectActive(admin, pkg.project_id, auth);
  if (g) return g;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.data.name        !== undefined) updates.name        = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.progress    !== undefined) updates.progress    = parsed.data.progress;
  if (parsed.data.startDate   !== undefined) updates.start_date  = parsed.data.startDate;
  if (parsed.data.endDate     !== undefined) updates.end_date    = parsed.data.endDate;
  if (parsed.data.sortOrder   !== undefined) updates.sort_order  = parsed.data.sortOrder;

  const { data: updatedTask, error } = await admin
    .from('milestone_tasks')
    .update(updates)
    .eq('id', tid)
    .eq('package_id', pkgId)
    .select('name, milestone_name, progress')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await rollUpMilestoneTasks(admin, pkgId);
  if (updatedTask) {
    await logPackageAudit(admin, auth, pkgId, 'Task Updated', 'milestone', {
      task: updatedTask.name, milestone: updatedTask.milestone_name,
      ...(parsed.data.progress !== undefined ? { progress: `${updatedTask.progress}%` } : {}),
    });
  }

  return NextResponse.json({ ok: true });
}, { route: '/api/packages/[id]/milestone-tasks/[tid]' });

export const DELETE = withRoute(async (_req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, tid } = await ctx!.params as { id: string; tid: string };

  const pkg = await checkPackageAccess(pkgId);
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const admin = createAdminSupabase();

  const g = await assertProjectActive(admin, pkg.project_id, auth);
  if (g) return g;

  const { data: existing } = await admin
    .from('milestone_tasks')
    .select('name, milestone_name')
    .eq('id', tid)
    .eq('package_id', pkgId)
    .maybeSingle();

  const { error } = await admin
    .from('milestone_tasks')
    .delete()
    .eq('id', tid)
    .eq('package_id', pkgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await rollUpMilestoneTasks(admin, pkgId);
  if (existing) {
    await logPackageAudit(admin, auth, pkgId, 'Task Deleted', 'milestone', {
      task: existing.name, milestone: existing.milestone_name,
    });
  }

  return NextResponse.json({ ok: true });
}, { route: '/api/packages/[id]/milestone-tasks/[tid]' });
