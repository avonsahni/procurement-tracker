import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { EXECUTION_MILESTONES } from '@/lib/types';
import { withRoute } from '@/lib/withRoute';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export const PATCH = withRoute(async (req: NextRequest, ctx) => {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId } = await ctx!.params as { id: string };
  const body = await req.json();
  const { milestoneName, progress } = body;

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return NextResponse.json({ error: 'progress must be a number 0–100' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { data: existing } = await supabase
    .from('package_milestones')
    .select('display_order')
    .eq('package_id', pkgId)
    .eq('milestone_name', milestoneName)
    .single();

  const displayOrder = existing?.display_order ?? (EXECUTION_MILESTONES.indexOf(milestoneName) + 1);

  const { error } = await supabase
    .from('package_milestones')
    .upsert({
      package_id: pkgId,
      milestone_name: milestoneName,
      display_order: displayOrder,
      progress,
      completed_at: progress === 100 ? new Date().toISOString() : null,
      completed_by: progress === 100 ? auth.fullName : null,
    }, { onConflict: 'package_id,milestone_name' });

  if (error) {
    console.error('[milestones PATCH] upsert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}, { route: '/api/packages/[id]/milestones' });
