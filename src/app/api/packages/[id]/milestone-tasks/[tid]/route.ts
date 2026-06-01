import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { rollUpMilestoneTasks } from '@/lib/db';
import { withRoute } from '@/lib/withRoute';
import { z } from 'zod';

const UpdateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  progress:    z.number().int().min(0).max(100).optional(),
  startDate:   z.string().nullable().optional(),
  endDate:     z.string().nullable().optional(),
  sortOrder:   z.number().int().min(0).optional(),
});

/** Verifies that pkgId belongs to orgId. Returns the package row or null. */
async function getOwnedPackage(admin: ReturnType<typeof createAdminSupabase>, pkgId: string, orgId: string) {
  const { data: pkg } = await admin.from('packages').select('id, project_id').eq('id', pkgId).maybeSingle();
  if (!pkg) return null;
  const { data: proj } = await admin.from('projects').select('org_id').eq('id', pkg.project_id).maybeSingle();
  if (!proj || proj.org_id !== orgId) return null;
  return pkg;
}

export const PATCH = withRoute(async (req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, tid } = await ctx!.params as { id: string; tid: string };

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const admin = createAdminSupabase();

  if (!await getOwnedPackage(admin, pkgId, auth.orgId)) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.data.name        !== undefined) updates.name        = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.progress    !== undefined) updates.progress    = parsed.data.progress;
  if (parsed.data.startDate   !== undefined) updates.start_date  = parsed.data.startDate;
  if (parsed.data.endDate     !== undefined) updates.end_date    = parsed.data.endDate;
  if (parsed.data.sortOrder   !== undefined) updates.sort_order  = parsed.data.sortOrder;

  const { error } = await admin
    .from('milestone_tasks')
    .update(updates)
    .eq('id', tid)
    .eq('package_id', pkgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await rollUpMilestoneTasks(admin, pkgId);

  return NextResponse.json({ ok: true });
}, { route: '/api/packages/[id]/milestone-tasks/[tid]' });

export const DELETE = withRoute(async (_req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, tid } = await ctx!.params as { id: string; tid: string };
  const admin = createAdminSupabase();

  if (!await getOwnedPackage(admin, pkgId, auth.orgId)) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const { error } = await admin
    .from('milestone_tasks')
    .delete()
    .eq('id', tid)
    .eq('package_id', pkgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await rollUpMilestoneTasks(admin, pkgId);

  return NextResponse.json({ ok: true });
}, { route: '/api/packages/[id]/milestone-tasks/[tid]' });
