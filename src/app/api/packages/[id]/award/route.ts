import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assemblePackage, addAuditEntry, addOrgAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AwardSchema, parseBody } from '@/lib/validation';
import { formatCurrency, EXECUTION_MILESTONES } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, AwardSchema);
  if (!parsed.ok) return parsed.response;
  const { awardValue, awardedVendor } = parsed.data;

  const supabase = await createServerSupabase();

  // Fetch the package (need project_id)
  const { data: pkg } = await supabase
    .from('packages')
    .select('id, project_id, current_stage, award_value')
    .eq('id', pkgId)
    .single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  // ── HARD CONSTRAINT: total awarded across project ≤ project budget ──────
  const [{ data: project }, { data: otherAwarded }] = await Promise.all([
    supabase.from('projects').select('budget').eq('id', pkg.project_id).single(),
    supabase
      .from('packages')
      .select('award_value')
      .eq('project_id', pkg.project_id)
      .eq('current_stage', 'Award')
      .neq('id', pkgId),           // exclude this package (handles re-awards too)
  ]);

  if (project) {
    const budget = Number(project.budget);
    const otherTotal = (otherAwarded || []).reduce((s, p) => s + Number(p.award_value || 0), 0);
    const available = budget - otherTotal;

    if (awardValue > available) {
      return NextResponse.json(
        {
          error: `Award value ${formatCurrency(awardValue)} exceeds available budget. ` +
                 `Available: ${formatCurrency(available)} ` +
                 `(Budget ${formatCurrency(budget)} − already awarded ${formatCurrency(otherTotal)})`,
        },
        { status: 400 }
      );
    }
  }
  // ────────────────────────────────────────────────────────────────────────

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

  // Grab package name for audit label
  const { data: pkgInfo } = await supabase.from('packages').select('name').eq('id', pkgId).maybeSingle();

  const adminClient = createAdminSupabase();
  await Promise.all([
    addAuditEntry(supabase, pkgId, auth.fullName, 'Stage', pkg.current_stage, 'Award'),
    addAuditEntry(supabase, pkgId, auth.fullName, 'Awarded Vendor', '', awardedVendor),
    addAuditEntry(supabase, pkgId, auth.fullName, 'Award Value', '', String(awardValue)),
    addOrgAuditEntry(adminClient, auth.orgId, auth.id, auth.fullName,
      'Package Awarded', 'package', pkgInfo?.name || pkgId,
      { vendor: awardedVendor, value: awardValue }),
    supabase.from('package_milestones').upsert(
      EXECUTION_MILESTONES.map((name, i) => ({
        package_id: pkgId,
        milestone_name: name,
        display_order: i + 1,
        progress: 0,
      })),
      { onConflict: 'package_id,milestone_name', ignoreDuplicates: true }
    ),
  ]);

  return NextResponse.json(await assemblePackage(supabase, row));
}
