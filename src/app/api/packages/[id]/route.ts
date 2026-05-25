import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assemblePackage, addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { PackageUpdateSchema, parseBody } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from('packages').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await assemblePackage(supabase, row));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, PackageUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', id).single();
  if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();
  const setFields: Record<string, any> = { updated_at: now };

  if (updates.currentStage !== undefined && updates.currentStage !== pkg.current_stage) {
    setFields.current_stage = updates.currentStage;
    if (updates.currentStage === 'RFQ Float' && !pkg.rfq_float_date) {
      setFields.rfq_float_date = now;
    }
    await addAuditEntry(supabase, id, auth.fullName, 'Stage', pkg.current_stage, updates.currentStage);
  }
  if (updates.awardValue !== undefined) setFields.award_value = updates.awardValue;
  if (updates.awardedVendorId !== undefined) setFields.awarded_vendor_id = updates.awardedVendorId;

  const { data: row, error } = await supabase
    .from('packages')
    .update(setFields)
    .eq('id', id)
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 });

  return NextResponse.json(await assemblePackage(supabase, row));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const supabase = await createServerSupabase();
  await supabase.from('packages').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
