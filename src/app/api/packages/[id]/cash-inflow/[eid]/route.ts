import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { logPackageAudit } from '@/lib/db';
import { guard } from '@/lib/auth';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; eid: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, eid } = await params;

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { data: existing } = await supabase
    .from('cash_inflow').select('amount, from_party').eq('id', eid).eq('package_id', pkgId).maybeSingle();

  const { error } = await supabase.from('cash_inflow').delete().eq('id', eid).eq('package_id', pkgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (existing) {
    await logPackageAudit(createAdminSupabase(), auth, pkgId, 'Cash Receipt Deleted', 'cashflow', {
      amount: Number(existing.amount), from: existing.from_party,
    });
  }

  return NextResponse.json({ ok: true });
}
