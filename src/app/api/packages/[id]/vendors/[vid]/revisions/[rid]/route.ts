import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { assertPackageProjectActive } from '@/lib/projectGuard';
import { addAuditEntry } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string; rid: string }> },
) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, vid, rid } = await params;
  const supabase = await createServerSupabase();

  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  // Capture details for the audit entry before deleting
  const { data: rev } = await supabase
    .from('vendor_revisions').select('round_number, amount').eq('id', rid).maybeSingle();
  const { data: vendor } = await supabase
    .from('vendors').select('name').eq('id', vid).maybeSingle();

  const { error } = await supabase
    .from('vendor_revisions')
    .delete()
    .eq('id', rid)
    .eq('vendor_id', vid)
    .eq('package_id', pkgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (rev) {
    await addAuditEntry(
      supabase, pkgId, auth.fullName,
      `Revision R${rev.round_number} Removed — ${vendor?.name ?? 'vendor'}`,
      String(rev.amount), '',
    );
  }

  // After deletion, sync vendor's revised_amount to the new latest round (or keep as-is if none left)
  const { data: remaining } = await supabase
    .from('vendor_revisions').select('amount')
    .eq('vendor_id', vid).order('round_number', { ascending: false }).limit(1);

  if (remaining && remaining.length > 0) {
    await supabase.from('vendors').update({ revised_amount: remaining[0].amount }).eq('id', vid);
  }

  return NextResponse.json({ ok: true });
}
