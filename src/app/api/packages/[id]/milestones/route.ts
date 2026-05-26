import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { EXECUTION_MILESTONES } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const { milestoneName, progress } = await req.json();

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return NextResponse.json({ error: 'progress must be a number 0–100' }, { status: 400 });
  }

  const supabase = await createServerSupabase();

  // Check if a row already exists to preserve its display_order
  const { data: existing } = await supabase
    .from('package_milestones')
    .select('display_order')
    .eq('package_id', pkgId)
    .eq('milestone_name', milestoneName)
    .single();

  const displayOrder = existing?.display_order ?? (EXECUTION_MILESTONES.indexOf(milestoneName) + 1);

  // Upsert so legacy packages (no pre-seeded rows) get rows created on first edit
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
