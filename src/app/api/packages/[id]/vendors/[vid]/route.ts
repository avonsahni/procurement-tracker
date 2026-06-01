import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { VendorUpdateSchema, parseBody } from '@/lib/validation';
import { assertPackageProjectActive } from '@/lib/projectGuard';

const COLUMN_MAP: Record<string, string> = {
  name: 'name',
  quotedAmount: 'quoted_amount',
  revisedAmount: 'revised_amount',
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, vid } = await params;
  const parsed = await parseBody(req, VendorUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data;

  const setObj: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (COLUMN_MAP[k]) setObj[COLUMN_MAP[k]] = v;
  }

  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;
  const { data: row, error } = await supabase
    .from('vendors')
    .update(setObj)
    .eq('id', vid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: row.id, name: row.name, quotedAmount: Number(row.quoted_amount), revisedAmount: Number(row.revised_amount),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, vid } = await params;
  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;
  const { data: v } = await supabase.from('vendors').select('name').eq('id', vid).single();
  if (v) await addAuditEntry(supabase, pkgId, auth.fullName, 'Vendor Removed', v.name, '');
  await supabase.from('vendors').delete().eq('id', vid);
  return NextResponse.json({ ok: true });
}
