import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { VendorCreateSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, VendorCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, quoted, revised } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('id').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const { data: row, error } = await supabase
    .from('vendors')
    .insert({ package_id: pkgId, name, quoted_amount: quoted, revised_amount: revised })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await addAuditEntry(supabase, pkgId, auth.fullName, 'Vendor Added', '', name);

  return NextResponse.json({
    id: row.id, name: row.name, quotedAmount: Number(row.quoted_amount), revisedAmount: Number(row.revised_amount),
  }, { status: 201 });
}
