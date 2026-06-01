import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { assemblePackage, addAuditEntry, addOrgAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { PackageUpdateSchema, parseBody } from '@/lib/validation';
import { EXECUTION_MILESTONES } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from('packages').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Auto-seed milestone rows for packages that were awarded before milestone tracking
  // was introduced, so they always get a usable milestone section.
  if (row.current_stage === 'Award') {
    const { count } = await supabase
      .from('package_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('package_id', id);
    if (!count) {
      await supabase.from('package_milestones').upsert(
        EXECUTION_MILESTONES.map((name, i) => ({
          package_id: id, milestone_name: name, display_order: i + 1, progress: 0,
        })),
        { onConflict: 'package_id,milestone_name', ignoreDuplicates: true },
      );
    }
  }

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

  const { data: pkg } = await supabase.from('packages').select('name, project_id').eq('id', id).maybeSingle();

  await supabase.from('packages').delete().eq('id', id);

  if (pkg) {
    await addAuditEntry(supabase, id, auth.fullName, 'Package Deleted', pkg.name, '');
    const admin = createAdminSupabase();
    await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
      'Package Deleted', 'package', pkg.name);
  }

  return NextResponse.json({ ok: true });
}
