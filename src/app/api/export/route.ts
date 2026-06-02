import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addOrgAuditEntry } from '@/lib/db';

// Returns all org data as JSON for client-side Excel generation.
// Admin-only: only org owners and admins may export.
// This endpoint intentionally bypasses the org-blocked check so that
// admins of expired/paused orgs can still export their data.
export async function GET() {
  // Use 'user' guard so expired orgs are not blocked, then manually verify admin role.
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  if (!['owner', 'admin'].includes(auth.orgRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const orgId = auth.orgId;

  // 1. All projects in this org
  const { data: projects, error: projErr } = await admin
    .from('projects')
    .select('id, name, client, budget, status, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at');

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
  if (!projects || projects.length === 0) {
    return NextResponse.json({ projects: [], packages: [], vendors: [], invoices: [], milestones: [], cashInflows: [], cashOutflows: [] });
  }

  const projectIds = projects.map((p: any) => p.id);

  // 2. All packages in those projects
  const { data: packages } = await admin
    .from('packages')
    .select('id, project_id, name, category, origin, currency, current_stage, award_value, awarded_vendor_id, created_at')
    .in('project_id', projectIds)
    .order('created_at');

  const packageIds = (packages || []).map((p: any) => p.id);

  // 3. Parallel fetch of vendors, invoices, milestones, awarded vendor names, cash flows
  const [vendorsRes, invoicesRes, milestonesRes, awardedVendorsRes, invoiceTotalsRes, inflowRes, outflowRes] = await Promise.all([
    packageIds.length
      ? admin.from('vendors').select('id, package_id, name, quoted_amount, revised_amount').in('package_id', packageIds)
      : { data: [] },
    packageIds.length
      ? admin.from('invoices').select('id, package_id, amount, invoice_number, invoice_date, notes, username, created_at').in('package_id', packageIds).order('invoice_date')
      : { data: [] },
    packageIds.length
      ? admin.from('package_milestones').select('package_id, milestone_name, progress, display_order, completed_at, completed_by').in('package_id', packageIds).order('display_order')
      : { data: [] },
    // Resolve awarded vendor names
    packageIds.length
      ? admin.from('vendors').select('id, name').in('package_id', packageIds)
      : { data: [] },
    // Sum of invoices per package
    packageIds.length
      ? admin.from('invoices').select('package_id, amount').in('package_id', packageIds)
      : { data: [] },
    packageIds.length
      ? admin.from('cash_inflow').select('id, package_id, on_account, from_party, date_received, amount, remarks, created_by').in('package_id', packageIds).order('date_received')
      : { data: [] },
    packageIds.length
      ? admin.from('cash_outflow').select('id, package_id, to_whom, on_account_of, date_paid, amount, remarks, created_by').in('package_id', packageIds).order('date_paid')
      : { data: [] },
  ]);

  // Build vendor name lookup
  const vendorNameById: Record<string, string> = {};
  for (const v of (awardedVendorsRes.data || [])) {
    vendorNameById[v.id] = v.name;
  }

  // Build billed amount per package
  const billedByPkg: Record<string, number> = {};
  for (const inv of (invoiceTotalsRes.data || [])) {
    billedByPkg[inv.package_id] = (billedByPkg[inv.package_id] || 0) + Number(inv.amount);
  }

  // Build project name lookup
  const projectNameById: Record<string, string> = {};
  const projectClientById: Record<string, string> = {};
  for (const p of projects) {
    projectNameById[p.id] = p.name;
    projectClientById[p.id] = p.client;
  }

  // Enrich packages with project name, awarded vendor name, billed amount
  const enrichedPackages = (packages || []).map((pkg: any) => ({
    ...pkg,
    projectName: projectNameById[pkg.project_id] || '',
    awardedVendorName: pkg.awarded_vendor_id ? (vendorNameById[pkg.awarded_vendor_id] || '') : '',
    billedAmount: billedByPkg[pkg.id] || 0,
  }));

  // Build package name lookup for vendors/invoices/milestones
  const pkgNameById: Record<string, string> = {};
  const pkgProjectById: Record<string, string> = {};
  for (const pkg of (packages || [])) {
    pkgNameById[pkg.id] = pkg.name;
    pkgProjectById[pkg.id] = projectNameById[pkg.project_id] || '';
  }

  const enrichedVendors = (vendorsRes.data || []).map((v: any) => ({
    ...v,
    packageName: pkgNameById[v.package_id] || '',
    projectName: pkgProjectById[v.package_id] || '',
  }));

  const enrichedInvoices = (invoicesRes.data || []).map((inv: any) => ({
    ...inv,
    packageName: pkgNameById[inv.package_id] || '',
    projectName: pkgProjectById[inv.package_id] || '',
  }));

  const enrichedMilestones = (milestonesRes.data || []).map((m: any) => ({
    ...m,
    packageName: pkgNameById[m.package_id] || '',
    projectName: pkgProjectById[m.package_id] || '',
  }));

  const enrichedInflows = (inflowRes.data || []).map((r: any) => ({
    ...r,
    packageName: pkgNameById[r.package_id] || '',
    projectName: pkgProjectById[r.package_id] || '',
  }));

  const enrichedOutflows = (outflowRes.data || []).map((r: any) => ({
    ...r,
    packageName: pkgNameById[r.package_id] || '',
    projectName: pkgProjectById[r.package_id] || '',
  }));

  await addOrgAuditEntry(admin, orgId, auth.id, auth.fullName,
    'Data Exported', 'admin', undefined,
    { projects: projects.length, packages: (packages || []).length });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    orgId,
    projects,
    packages: enrichedPackages,
    vendors: enrichedVendors,
    invoices: enrichedInvoices,
    milestones: enrichedMilestones,
    cashInflows: enrichedInflows,
    cashOutflows: enrichedOutflows,
  });
}
