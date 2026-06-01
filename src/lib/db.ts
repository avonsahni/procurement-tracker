import type { SupabaseClient } from '@supabase/supabase-js';
import { EXECUTION_MILESTONES } from '@/lib/types';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Helpers that turn raw Postgres rows into the camelCase shape the client expects.

/**
 * Writes one entry to org_audit_log (org-level admin events).
 * Uses the admin/service-role client so it always succeeds regardless of RLS.
 * Errors are swallowed — audit failures must never block the primary operation.
 */
export async function addOrgAuditEntry(
  admin: SupabaseClient,
  orgId: string,
  userId: string,
  userName: string,
  action: string,
  category: string,
  entityName?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await admin.from('org_audit_log').insert({
      org_id: orgId,
      user_id: userId || null,
      user_name: userName,
      action,
      category,
      entity_name: entityName ?? null,
      details: details ?? null,
    });
  } catch (e) {
    console.error('[addOrgAuditEntry] failed:', e);
  }
}

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
  milestonesByPkg: Record<string, any[]> = {},
  tasksByPkg: Record<string, any[]> = {},
) {
  const id = row.id;
  const tasksByMilestone = groupBy(tasksByPkg[id] || [], 'milestone_name');
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
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendors: (vendorsByPkg[id] || []).map((v: any) => ({
      id: v.id, name: v.name, quotedAmount: Number(v.quoted_amount), revisedAmount: Number(v.revised_amount),
    })),
    remarks: (remarksByPkg[id] || []).map((r: any) => ({
      id: r.id, user: r.username, text: r.text, timestamp: r.timestamp, userId: r.user_id,
      imageUrls: Array.isArray(r.image_urls) && r.image_urls.length ? r.image_urls : undefined,
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
    milestones: (milestonesByPkg[id] || []).map((m: any) => ({
      id: m.id,
      milestoneName: m.milestone_name,
      displayOrder: m.display_order,
      progress: Number(m.progress || 0),
      completedAt: m.completed_at || undefined,
      completedBy: m.completed_by || undefined,
      tasks: (tasksByMilestone[m.milestone_name] || []).map((t: any) => ({
        id: t.id,
        milestoneName: t.milestone_name,
        name: t.name,
        description: t.description || undefined,
        progress: Number(t.progress || 0),
        startDate: t.start_date || undefined,
        endDate: t.end_date || undefined,
        sortOrder: t.sort_order,
        createdBy: t.created_by || undefined,
        createdAt: t.created_at,
      })),
    })),
  };
}

/** Extracts the extended project detail fields from a raw DB row. */
function projectDetailFields(row: any) {
  return {
    address:                 row.address                   || undefined,
    projectType:             row.project_type              || undefined,
    builtUpArea:             row.built_up_area             || undefined,
    estimatedStartDate:      row.estimated_start_date      || undefined,
    estimatedDurationMonths: row.estimated_duration_months ?? undefined,
    tenderedCost:            row.tendered_cost             != null ? Number(row.tendered_cost) : undefined,
    projectManager:          row.project_manager           || undefined,
    clientContactName:       row.client_contact_name       || undefined,
    clientContactEmail:      row.client_contact_email      || undefined,
    clientContactPhone:      row.client_contact_phone      || undefined,
    projectRemarks:          row.project_remarks           || undefined,
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
  const id    = row.id;
  const admin = createAdminSupabase();
  const [vendorsRes, remarksRes, docsRes, auditRes, invoicesRes, milestonesRes, tasksRes] = await Promise.all([
    supabase.from('vendors').select('id, name, quoted_amount, revised_amount').eq('package_id', id),
    supabase.from('remarks').select('id, username, text, timestamp, user_id, image_urls').eq('package_id', id).order('timestamp'),
    supabase.from('documents').select('id, name, size, type, username, uploaded_at, storage_path').eq('package_id', id).order('uploaded_at'),
    supabase.from('audit_trail').select('id, username, field, old_value, new_value, timestamp').eq('package_id', id).order('timestamp'),
    supabase.from('invoices').select('id, amount, invoice_number, invoice_date, notes, username, created_at').eq('package_id', id).order('invoice_date'),
    supabase.from('package_milestones').select('id, milestone_name, display_order, progress, completed_at, completed_by').eq('package_id', id).order('display_order'),
    // admin client bypasses RLS on milestone_tasks (policy uses proj.owner_id which doesn't match org members)
    admin.from('milestone_tasks').select('id, milestone_name, name, description, progress, start_date, end_date, sort_order, created_by, created_at').eq('package_id', id).order('sort_order').order('created_at'),
  ]);

  return mapPackageRow(
    row,
    { [id]: vendorsRes.data || [] },
    { [id]: remarksRes.data || [] },
    { [id]: docsRes.data || [] },
    { [id]: auditRes.data || [] },
    { [id]: invoicesRes.data || [] },
    { [id]: milestonesRes.data || [] },
    { [id]: tasksRes.data || [] },
  );
}

/**
 * Recalculates milestone progress from task averages, then rolls up start/end
 * dates from tasks → package → project. Called after every task mutation.
 */
export async function rollUpMilestoneTasks(supabase: SupabaseClient, pkgId: string) {
  const { data: tasks } = await supabase
    .from('milestone_tasks')
    .select('milestone_name, progress, start_date, end_date')
    .eq('package_id', pkgId);

  if (!tasks) return;

  // Group tasks by milestone
  const byMilestone: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    if (!byMilestone[t.milestone_name]) byMilestone[t.milestone_name] = [];
    byMilestone[t.milestone_name].push(t);
  }

  // Update each milestone's progress to the average of its tasks
  for (const [name, mTasks] of Object.entries(byMilestone)) {
    const avg = Math.round(mTasks.reduce((s, t) => s + (t.progress || 0), 0) / mTasks.length);
    await supabase.from('package_milestones').upsert({
      package_id:    pkgId,
      milestone_name: name,
      display_order: (EXECUTION_MILESTONES as unknown as string[]).indexOf(name) + 1 || 99,
      progress:      avg,
      completed_at:  avg === 100 ? new Date().toISOString() : null,
      completed_by:  null,
    }, { onConflict: 'package_id,milestone_name' });
  }

  // Package-level dates: earliest task start, latest task end
  const starts = tasks.filter(t => t.start_date).map(t => t.start_date as string).sort();
  const ends   = tasks.filter(t => t.end_date).map(t => t.end_date as string).sort();
  const pkgStart = starts.length ? starts[0] : null;
  const pkgEnd   = ends.length ? ends[ends.length - 1] : null;

  await supabase.from('packages')
    .update({ start_date: pkgStart, end_date: pkgEnd })
    .eq('id', pkgId);

  // Project-level dates: min/max across all packages in the same project
  const { data: pkgRow } = await supabase.from('packages').select('project_id').eq('id', pkgId).single();
  if (pkgRow?.project_id) {
    const { data: siblings } = await supabase
      .from('packages')
      .select('start_date, end_date')
      .eq('project_id', pkgRow.project_id);

    const projStarts = (siblings || []).filter(p => p.start_date).map(p => p.start_date as string).sort();
    const projEnds   = (siblings || []).filter(p => p.end_date).map(p => p.end_date as string).sort();

    await supabase.from('projects').update({
      start_date: projStarts.length ? projStarts[0] : null,
      end_date:   projEnds.length ? projEnds[projEnds.length - 1] : null,
    }).eq('id', pkgRow.project_id);
  }
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
    .select('id, name, category, origin, currency, current_stage, award_value, awarded_vendor_id, rfq_float_date, award_date, start_date, end_date, created_at, updated_at')
    .eq('project_id', row.id)
    .order('created_at');

  const pkgs = pkgRows || [];

  // Batch-fetch invoice totals, vendor counts, and milestone completion for all packages at once.
  let billedByPkg: Record<string, number> = {};
  let vendorCountByPkg: Record<string, number> = {};
  let milestonesCompletedByPkg: Record<string, number> = {};
  let milestonesTotalByPkg: Record<string, number> = {};
  let milestonesByPkg: Record<string, any[]> = {};
  if (pkgs.length > 0) {
    const ids = pkgs.map((p: any) => p.id);
    const [invRes, vendorRes, milestoneRes] = await Promise.all([
      supabase.from('invoices').select('package_id, amount').in('package_id', ids),
      supabase.from('vendors').select('package_id').in('package_id', ids),
      supabase.from('package_milestones')
        .select('id, package_id, milestone_name, display_order, progress, completed_at, completed_by')
        .in('package_id', ids)
        .order('display_order'),
    ]);
    for (const inv of invRes.data || []) {
      billedByPkg[inv.package_id] = (billedByPkg[inv.package_id] || 0) + Number(inv.amount);
    }
    for (const v of vendorRes.data || []) {
      vendorCountByPkg[v.package_id] = (vendorCountByPkg[v.package_id] || 0) + 1;
    }
    if (milestoneRes.error) {
      console.error('[assembleProjectSummary] milestone query failed:', milestoneRes.error.message);
    }
    for (const m of milestoneRes.data || []) {
      milestonesTotalByPkg[m.package_id] = (milestonesTotalByPkg[m.package_id] || 0) + 1;
      milestonesCompletedByPkg[m.package_id] = (milestonesCompletedByPkg[m.package_id] || 0) + Number(m.progress || 0);
    }
    milestonesByPkg = groupBy(milestoneRes.data || [], 'package_id');
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
    startDate: p.start_date || undefined,
    endDate:   p.end_date   || undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    billedAmount: billedByPkg[p.id] || 0,
    vendorCount: vendorCountByPkg[p.id] || 0,
    milestonesProgressSum: milestonesCompletedByPkg[p.id] || 0,
    totalMilestones: milestonesTotalByPkg[p.id] || 0,
    vendors: [],
    remarks: [],
    documents: [],
    auditTrail: [],
    invoices: [],
    milestones: (milestonesByPkg[p.id] || []).map((m: any) => ({
      id: m.id,
      milestoneName: m.milestone_name,
      displayOrder: m.display_order,
      progress: Number(m.progress || 0),
      completedAt: m.completed_at || undefined,
      completedBy: m.completed_by || undefined,
    })),
  }));

  const projStarts = packages.filter(p => p.startDate).map(p => p.startDate!).sort();
  const projEnds   = packages.filter(p => p.endDate).map(p => p.endDate!).sort();

  return {
    id: row.id,
    name: row.name,
    client: row.client || '',
    budget: Number(row.budget) || 0,
    status: row.status,
    isSample: row.is_sample ?? false,
    ...projectDetailFields(row),
    startDate: projStarts.length ? projStarts[0] : undefined,
    endDate:   projEnds.length ? projEnds[projEnds.length - 1] : undefined,
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
  let milestonesByPkg: Record<string, any[]> = {};
  let tasksByPkg: Record<string, any[]> = {};

  if (pkgs.length > 0) {
    const ids = pkgs.map((p: any) => p.id);

    const admin = createAdminSupabase();
    const [vendorsRes, remarksRes, docsRes, auditRes, invoicesRes, milestonesRes, tasksRes] = await Promise.all([
      supabase.from('vendors').select('id, package_id, name, quoted_amount, revised_amount').in('package_id', ids),
      supabase.from('remarks').select('id, package_id, username, text, timestamp, user_id, image_urls').in('package_id', ids).order('timestamp'),
      supabase.from('documents').select('id, package_id, name, size, type, username, uploaded_at, storage_path').in('package_id', ids).order('uploaded_at'),
      supabase.from('audit_trail').select('id, package_id, username, field, old_value, new_value, timestamp').in('package_id', ids).order('timestamp'),
      supabase.from('invoices').select('id, package_id, amount, invoice_number, invoice_date, notes, username, created_at').in('package_id', ids).order('invoice_date'),
      supabase.from('package_milestones').select('id, package_id, milestone_name, display_order, progress, completed_at, completed_by').in('package_id', ids).order('display_order'),
      admin.from('milestone_tasks').select('id, package_id, milestone_name, name, description, progress, start_date, end_date, sort_order, created_by, created_at').in('package_id', ids).order('sort_order').order('created_at'),
    ]);

    vendorsByPkg    = groupBy(vendorsRes.data    || [], 'package_id');
    remarksByPkg    = groupBy(remarksRes.data    || [], 'package_id');
    docsByPkg       = groupBy(docsRes.data       || [], 'package_id');
    auditByPkg      = groupBy(auditRes.data      || [], 'package_id');
    invoicesByPkg   = groupBy(invoicesRes.data   || [], 'package_id');
    milestonesByPkg = groupBy(milestonesRes.data || [], 'package_id');
    tasksByPkg      = groupBy(tasksRes.data      || [], 'package_id');
  }

  const packages = pkgs.map((p: any) =>
    mapPackageRow(p, vendorsByPkg, remarksByPkg, docsByPkg, auditByPkg, invoicesByPkg, milestonesByPkg, tasksByPkg)
  );

  return {
    id: row.id,
    name: row.name,
    client: row.client || '',
    budget: Number(row.budget) || 0,
    status: row.status,
    isSample: row.is_sample ?? false,
    ...projectDetailFields(row),
    packages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Batch-fetches summary data for multiple projects in exactly 4 queries total,
 * regardless of project count.  Replaces the N×4 pattern from calling
 * assembleProjectSummary once per project row.
 */
export async function assembleBatchProjectSummaries(supabase: SupabaseClient, rows: any[]) {
  if (rows.length === 0) return [];

  const projectIds = rows.map(r => r.id);

  // 1. All packages for all projects
  const { data: pkgRows } = await supabase
    .from('packages')
    .select('id, project_id, name, category, origin, currency, current_stage, award_value, awarded_vendor_id, rfq_float_date, award_date, start_date, end_date, created_at, updated_at')
    .in('project_id', projectIds)
    .order('created_at');

  const pkgs = pkgRows || [];
  const pkgIds = pkgs.map((p: any) => p.id);

  let billedByPkg: Record<string, number> = {};
  let vendorCountByPkg: Record<string, number> = {};
  let milestonesByPkg: Record<string, any[]> = {};
  let milestonesProgressSumByPkg: Record<string, number> = {};
  let milestonesTotalByPkg: Record<string, number> = {};

  if (pkgIds.length > 0) {
    // 2–4. Invoices, vendors, milestones — all in parallel
    const [invRes, vendorRes, milestoneRes] = await Promise.all([
      supabase.from('invoices').select('package_id, amount').in('package_id', pkgIds),
      supabase.from('vendors').select('package_id').in('package_id', pkgIds),
      supabase.from('package_milestones')
        .select('id, package_id, milestone_name, display_order, progress, completed_at, completed_by')
        .in('package_id', pkgIds)
        .order('display_order'),
    ]);

    for (const inv of invRes.data || []) {
      billedByPkg[inv.package_id] = (billedByPkg[inv.package_id] || 0) + Number(inv.amount);
    }
    for (const v of vendorRes.data || []) {
      vendorCountByPkg[v.package_id] = (vendorCountByPkg[v.package_id] || 0) + 1;
    }
    for (const m of milestoneRes.data || []) {
      milestonesTotalByPkg[m.package_id] = (milestonesTotalByPkg[m.package_id] || 0) + 1;
      milestonesProgressSumByPkg[m.package_id] = (milestonesProgressSumByPkg[m.package_id] || 0) + Number(m.progress || 0);
    }
    milestonesByPkg = groupBy(milestoneRes.data || [], 'package_id');
  }

  const pkgsByProject = groupBy(pkgs, 'project_id');

  return rows.map(row => {
    const projPkgs = pkgsByProject[row.id] || [];

    const packages = projPkgs.map((p: any) => ({
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
      startDate: p.start_date || undefined,
      endDate: p.end_date || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      billedAmount: billedByPkg[p.id] || 0,
      vendorCount: vendorCountByPkg[p.id] || 0,
      milestonesProgressSum: milestonesProgressSumByPkg[p.id] || 0,
      totalMilestones: milestonesTotalByPkg[p.id] || 0,
      vendors: [], remarks: [], documents: [], auditTrail: [], invoices: [],
      milestones: (milestonesByPkg[p.id] || []).map((m: any) => ({
        id: m.id,
        milestoneName: m.milestone_name,
        displayOrder: m.display_order,
        progress: Number(m.progress || 0),
        completedAt: m.completed_at || undefined,
        completedBy: m.completed_by || undefined,
      })),
    }));

    const projStarts = packages.filter(p => p.startDate).map(p => p.startDate!).sort();
    const projEnds   = packages.filter(p => p.endDate).map(p => p.endDate!).sort();

    return {
      id: row.id,
      name: row.name,
      client: row.client || '',
      budget: Number(row.budget) || 0,
      status: row.status,
      isSample: row.is_sample ?? false,
      ...projectDetailFields(row),
      startDate: projStarts.length ? projStarts[0] : undefined,
      endDate:   projEnds.length ? projEnds[projEnds.length - 1] : undefined,
      packages,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}
