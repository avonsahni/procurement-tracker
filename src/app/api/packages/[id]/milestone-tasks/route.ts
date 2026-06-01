import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { rollUpMilestoneTasks } from '@/lib/db';
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

/** Verifies that pkgId belongs to orgId. Returns the package row or null. */
async function getOwnedPackage(admin: ReturnType<typeof createAdminSupabase>, pkgId: string, orgId: string) {
  const { data: pkg } = await admin.from('packages').select('id, project_id').eq('id', pkgId).maybeSingle();
  if (!pkg) return null;
  const { data: proj } = await admin.from('projects').select('org_id').eq('id', pkg.project_id).maybeSingle();
  if (!proj || proj.org_id !== orgId) return null;
  return pkg;
}

export const GET = withRoute(async (_req: NextRequest, ctx) => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId } = await ctx!.params as { id: string };
  const admin = createAdminSupabase();

  if (!await getOwnedPackage(admin, pkgId, auth.orgId)) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

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

  const admin = createAdminSupabase();

  const ownedPkg = await getOwnedPackage(admin, pkgId, auth.orgId);
  if (!ownedPkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const g = await assertProjectActive(admin, ownedPkg.project_id, auth);
  if (g) return g;

  const { data: task, error } = await admin
    .from('milestone_tasks')
    .insert({
      package_id:     pkgId,
      org_id:         auth.orgId,
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

  return NextResponse.json(task, { status: 201 });
}, { route: '/api/packages/[id]/milestone-tasks' });
