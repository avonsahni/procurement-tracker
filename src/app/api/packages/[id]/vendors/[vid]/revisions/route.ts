import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { z } from 'zod';
import { parseBody } from '@/lib/validation';
import { assertPackageProjectActive } from '@/lib/projectGuard';
import { addAuditEntry } from '@/lib/db';

const AddRevisionSchema = z.object({
  amount: z.number({ message: 'amount must be a number' }).min(0, 'amount must be non-negative'),
  notes: z.string().trim().max(500).optional().default(''),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: pkgId, vid } = await params;
  const parsed = await parseBody(req, AddRevisionSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createServerSupabase();

  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  // Confirm vendor belongs to this package
  const { data: vendor } = await supabase
    .from('vendors').select('id, name').eq('id', vid).eq('package_id', pkgId).maybeSingle();
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

  // Determine the next round number
  const { data: existing } = await supabase
    .from('vendor_revisions').select('round_number')
    .eq('vendor_id', vid).order('round_number', { ascending: false }).limit(1);
  const nextRound = existing && existing.length > 0 ? existing[0].round_number + 1 : 1;

  const { data: row, error } = await supabase
    .from('vendor_revisions')
    .insert({
      vendor_id:    vid,
      package_id:   pkgId,
      round_number: nextRound,
      amount:       parsed.data.amount,
      notes:        parsed.data.notes,
      created_by:   auth.fullName,
    })
    .select().single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  // Auto-update vendor's revised_amount to this latest round's amount
  await supabase.from('vendors').update({ revised_amount: parsed.data.amount }).eq('id', vid);

  // Audit trail (package-level, shown on the package page)
  await addAuditEntry(
    supabase, pkgId, auth.fullName,
    `Revision R${nextRound} — ${vendor.name}`, '', String(parsed.data.amount),
  );

  return NextResponse.json({
    id: row.id,
    roundNumber: row.round_number,
    amount: Number(row.amount),
    notes: row.notes || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  }, { status: 201 });
}
