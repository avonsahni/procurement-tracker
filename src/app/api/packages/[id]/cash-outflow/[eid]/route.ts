import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; eid: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, eid } = await params;

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { error } = await supabase.from('cash_outflow').delete().eq('id', eid).eq('package_id', pkgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
