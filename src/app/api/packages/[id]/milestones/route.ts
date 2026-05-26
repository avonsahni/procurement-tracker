import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const { milestoneName, progress } = await req.json();

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return NextResponse.json({ error: 'progress must be a number 0–100' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('package_milestones')
    .update({
      progress,
      completed_at: progress === 100 ? new Date().toISOString() : null,
      completed_by: progress === 100 ? auth.fullName : null,
    })
    .eq('package_id', pkgId)
    .eq('milestone_name', milestoneName);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
