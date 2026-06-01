import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; iid: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, iid } = await params;
  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;
  const { data: inv } = await supabase.from('invoices').select('amount, invoice_number').eq('id', iid).single();
  if (inv) {
    const label = inv.invoice_number ? `${inv.invoice_number} (${inv.amount})` : String(inv.amount);
    await addAuditEntry(supabase, pkgId, auth.fullName, 'Invoice Removed', label, '');
  }
  await supabase.from('invoices').delete().eq('id', iid);
  return NextResponse.json({ ok: true });
}
