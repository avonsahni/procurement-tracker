import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { logPackageAudit } from '@/lib/db';
import { guard } from '@/lib/auth';
import { CashOutflowCreateSchema, parseBody } from '@/lib/validation';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, CashOutflowCreateSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { data: row, error } = await supabase
    .from('cash_outflow')
    .insert({
      package_id:    pkgId,
      to_whom:       parsed.data.toWhom,
      on_account_of: parsed.data.onAccountOf,
      date_paid:     parsed.data.datePaid,
      amount:        parsed.data.amount,
      remarks:       parsed.data.remarks || null,
      created_by:    auth.fullName,
    })
    .select().single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await logPackageAudit(createAdminSupabase(), auth, pkgId, 'Payment Recorded', 'cashflow', {
    amount: Number(row.amount), to: row.to_whom, on: row.on_account_of,
  });

  return NextResponse.json({
    id: row.id, toWhom: row.to_whom, onAccountOf: row.on_account_of,
    datePaid: row.date_paid, amount: Number(row.amount),
    remarks: row.remarks || '', createdBy: row.created_by, createdAt: row.created_at,
  }, { status: 201 });
}
