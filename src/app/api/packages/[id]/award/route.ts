import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assemblePackage, addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { AwardSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, AwardSchema);
  if (!parsed.ok) return parsed.response;
  const { awardValue, awardedVendor } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from('packages')
    .update({
      current_stage: 'Award',
      award_value: awardValue,
      awarded_vendor_id: awardedVendor,
      award_date: now,
      updated_at: now,
    })
    .eq('id', pkgId)
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Award failed' }, { status: 500 });

  await Promise.all([
    addAuditEntry(supabase, pkgId, auth.fullName, 'Stage', pkg.current_stage, 'Award'),
    addAuditEntry(supabase, pkgId, auth.fullName, 'Awarded Vendor', '', awardedVendor),
    addAuditEntry(supabase, pkgId, auth.fullName, 'Award Value', '', String(awardValue)),
  ]);

  return NextResponse.json(await assemblePackage(supabase, row));
}
