import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { EXECUTION_MILESTONES } from '@/lib/types';
import { captureApiError } from '@/lib/sentry';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) {
    console.error('[milestones PATCH] guard failed — user not authenticated or canEdit=false');
    return auth;
  }
  const { id: pkgId } = await params;
  const body = await req.json();
  const { milestoneName, progress } = body;

  console.log('[milestones PATCH] pkgId=%s milestone=%s progress=%s user=%s', pkgId, milestoneName, progress, auth.fullName);

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    console.error('[milestones PATCH] invalid progress value:', progress);
    return NextResponse.json({ error: 'progress must be a number 0–100' }, { status: 400 });
  }

  const supabase = await createServerSupabase();

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
    captureApiError(error, { route: 'milestones PATCH', pkgId, milestoneName, userId: auth.id });
    console.error('[milestones PATCH] upsert error:', error.message, error.code, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('[milestones PATCH] saved ok — pkgId=%s milestone=%s progress=%s', pkgId, milestoneName, progress);
  return NextResponse.json({ ok: true });
}
