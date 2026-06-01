import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { CashInflowCreateSchema, parseBody } from '@/lib/validation';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, CashInflowCreateSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { data: row, error } = await supabase
    .from('cash_inflow')
    .insert({
      package_id:    pkgId,
      on_account:    parsed.data.onAccount,
      from_party:    parsed.data.fromParty,
      date_received: parsed.data.dateReceived,
      amount:        parsed.data.amount,
      remarks:       parsed.data.remarks || null,
      created_by:    auth.fullName,
    })
    .select().single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  return NextResponse.json({
    id: row.id, onAccount: row.on_account, fromParty: row.from_party,
    dateReceived: row.date_received, amount: Number(row.amount),
    remarks: row.remarks || '', createdBy: row.created_by, createdAt: row.created_at,
  }, { status: 201 });
}
