import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { InvoiceCreateSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, InvoiceCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { amount, invoiceNumber, invoiceDate, notes } = parsed.data;

  const supabase = await createServerSupabase();

  // Only allow billing on awarded packages
  const { data: pkg } = await supabase
    .from('packages')
    .select('id, current_stage')
    .eq('id', pkgId)
    .single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  if (pkg.current_stage !== 'Award') {
    return NextResponse.json(
      { error: 'Billing is only available after a package has been awarded' },
      { status: 400 }
    );
  }

  const { data: row, error } = await supabase
    .from('invoices')
    .insert({
      package_id: pkgId,
      amount,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate || new Date().toISOString(),
      notes,
      username: auth.fullName,
    })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await addAuditEntry(
    supabase,
    pkgId,
    auth.fullName,
    'Invoice Recorded',
    '',
    invoiceNumber ? `${invoiceNumber} (${amount})` : String(amount)
  );

  return NextResponse.json({
    id: row.id,
    amount: Number(row.amount),
    invoiceNumber: row.invoice_number || '',
    invoiceDate: row.invoice_date,
    notes: row.notes || '',
    user: row.username,
    createdAt: row.created_at,
  }, { status: 201 });
}
