import type { SupabaseClient } from '@supabase/supabase-js';

// Helpers that turn raw Postgres rows into the camelCase shape the client expects.

export async function addAuditEntry(
  supabase: SupabaseClient,
  pkgId: string,
  username: string,
  field: string,
  oldValue: string,
  newValue: string
) {
  await supabase.from('audit_trail').insert({
    package_id: pkgId,
    username,
    field,
    old_value: oldValue,
    new_value: newValue,
  });
}

/** Maps a raw package row + pre-fetched relation buckets into the camelCase shape. */
function mapPackageRow(
  row: any,
  vendorsByPkg: Record<string, any[]>,
  remarksByPkg: Record<string, any[]>,
  docsByPkg: Record<string, any[]>,
  auditByPkg: Record<string, any[]>,
  invoicesByPkg: Record<string, any[]>,
) {
  const id = row.id;
  return {
    id,
    name: row.name,
    description: row.description || '',
    category: row.category || '',
    origin: row.origin,
    currency: row.currency,
    currentStage: row.current_stage,
    rfqFloatDate: row.rfq_float_date || undefined,
    awardDate: row.award_date || undefined,
    awardValue: row.award_value ?? undefined,
    awardedVendorId: row.awarded_vendor_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendors: (vendorsByPkg[id] || []).map((v: any) => ({
      id: v.id, name: v.name, quotedAmount: Number(v.quoted_amount), revisedAmount: Number(v.revised_amount),
    })),
    remarks: (remarksByPkg[id] || []).map((r: any) => ({
      id: r.id, user: r.username, text: r.text, timestamp: r.timestamp,
    })),
    documents: (docsByPkg[id] || []).map((d: any) => ({
      id: d.id, name: d.name, size: d.size || '', type: d.type || '', uploadedBy: d.username, uploadedAt: d.uploaded_at, storagePath: d.storage_path || '',
    })),
    auditTrail: (auditByPkg[id] || []).map((a: any) => ({
      id: a.id, user: a.username, field: a.field, oldValue: a.old_value || '', newValue: a.new_value || '', timestamp: a.timestamp,
    })),
    invoices: (invoicesByPkg[id] || []).map((i: any) => ({
      id: i.id,
      amount: Number(i.amount),
      invoiceNumber: i.invoice_number || '',
      invoiceDate: i.invoice_date,
      notes: i.notes || '',
      user: i.username,
      createdAt: i.created_at,
    })),
  };
}

/** Groups an array of rows by a string key field into a Record<key, row[]>. */
function groupBy(rows: any[], key: string): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const r of rows) {
    const k = r[key];
    if (!out[k]) out[k] = [];
    out[k].push(r);
  }
  return out;
}

/**
 * Fetches a single package and all its related data (5 parallel queries).
 * Used when returning a single package from mutation endpoints.
 */
export async function assemblePackage(supabase: SupabaseClient, row: any) {
  const id = row.id;
  const [vendorsRes, remarksRes, docsRes, auditRes, invoicesRes] = await Promise.all([
    supabase.from('vendors').select('id, name, quoted_amount, revised_amount').eq('package_id', id),
    supabase.from('remarks').select('id, username, text, timestamp').eq('package_id', id).order('timestamp'),
    supabase.from('documents').select('id, name, size, type, username, uploaded_at, storage_path').eq('package_id', id).order('uploaded_at'),
    supabase.from('audit_trail').select('id, username, field, old_value, new_value, timestamp').eq('package_id', id).order('timestamp'),
    supabase.from('invoices').select('id, amount, invoice_number, invoice_date, notes, username, created_at').eq('package_id', id).order('invoice_date'),
  ]);

  return mapPackageRow(
    row,
    { [id]: vendorsRes.data || [] },
    { [id]: remarksRes.data || [] },
    { [id]: docsRes.data || [] },
    { [id]: auditRes.data || [] },
    { [id]: invoicesRes.data || [] },
  );
}

/**
 * Lightweight project summary — fetches package basics + invoice totals per
 * package (no vendors / remarks / documents / audit trail / full invoice rows).
 * Used by GET /api/projects so the dashboard and analytics load fast: just 3
 * queries per project instead of N×5+1.
 */
export async function assembleProjectSummary(supabase: SupabaseClient, row: any) {
  const { data: pkgRows } = await supabase
    .from('packages')
    .select('id, name, category, origin, currency, current_stage, award_value, awarded_vendor_id, rfq_float_date, award_date, created_at, updated_at')
    .eq('project_id', row.id)
    .order('created_at');

  const pkgs = pkgRows || [];

  // Fetch invoice amounts for all packages in one query so analytics can show
  // billed totals without loading full invoice rows.
  let billedByPkg: Record<string, number> = {};
  if (pkgs.length > 0) {
    const ids = pkgs.map((p: any) => p.id);
    const { data: invRows } = await supabase
      .from('invoices')
      .select('package_id, amount')
      .in('package_id', ids);
    for (const inv of invRows || []) {
      billedByPkg[inv.package_id] = (billedByPkg[inv.package_id] || 0) + Number(inv.amount);
    }
  }

  const packages = pkgs.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: '',
    category: p.category || '',
    origin: p.origin,
    currency: p.currency,
    currentStage: p.current_stage,
    rfqFloatDate: p.rfq_float_date || undefined,
    awardDate: p.award_date || undefined,
    awardValue: p.award_value ?? undefined,
    awardedVendorId: p.awarded_vendor_id || undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    billedAmount: billedByPkg[p.id] || 0,
    vendors: [],
    remarks: [],
    documents: [],
    auditTrail: [],
    invoices: [],
  }));

  return {
    id: row.id,
    name: row.name,
    client: row.client || '',
    budget: Number(row.budget) || 0,
    status: row.status,
    packages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches a project with ALL its packages and related data using only 6 queries
 * total — regardless of how many packages exist.  Previously this fired N×5+1
 * queries (one assemblePackage call per package), which was catastrophically
 * slow for projects with many packages.
 */
export async function assembleProject(supabase: SupabaseClient, row: any) {
  const { data: pkgRows } = await supabase
    .from('packages')
    .select('*')
    .eq('project_id', row.id)
    .order('created_at');

  const pkgs = pkgRows || [];

  let vendorsByPkg: Record<string, any[]> = {};
  let remarksByPkg: Record<string, any[]> = {};
  let docsByPkg: Record<string, any[]> = {};
  let auditByPkg: Record<string, any[]> = {};
  let invoicesByPkg: Record<string, any[]> = {};

  if (pkgs.length > 0) {
    const ids = pkgs.map((p: any) => p.id);

    const [vendorsRes, remarksRes, docsRes, auditRes, invoicesRes] = await Promise.all([
      supabase.from('vendors').select('id, package_id, name, quoted_amount, revised_amount').in('package_id', ids),
      supabase.from('remarks').select('id, package_id, username, text, timestamp').in('package_id', ids).order('timestamp'),
      supabase.from('documents').select('id, package_id, name, size, type, username, uploaded_at, storage_path').in('package_id', ids).order('uploaded_at'),
      supabase.from('audit_trail').select('id, package_id, username, field, old_value, new_value, timestamp').in('package_id', ids).order('timestamp'),
      supabase.from('invoices').select('id, package_id, amount, invoice_number, invoice_date, notes, username, created_at').in('package_id', ids).order('invoice_date'),
    ]);

    vendorsByPkg  = groupBy(vendorsRes.data  || [], 'package_id');
    remarksByPkg  = groupBy(remarksRes.data  || [], 'package_id');
    docsByPkg     = groupBy(docsRes.data     || [], 'package_id');
    auditByPkg    = groupBy(auditRes.data    || [], 'package_id');
    invoicesByPkg = groupBy(invoicesRes.data || [], 'package_id');
  }

  const packages = pkgs.map((p: any) =>
    mapPackageRow(p, vendorsByPkg, remarksByPkg, docsByPkg, auditByPkg, invoicesByPkg)
  );

  return {
    id: row.id,
    name: row.name,
    client: row.client || '',
    budget: Number(row.budget) || 0,
    status: row.status,
    packages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
