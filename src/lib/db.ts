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

export async function assemblePackage(supabase: SupabaseClient, row: any) {
  const [vendorsRes, remarksRes, docsRes, auditRes, invoicesRes] = await Promise.all([
    supabase.from('vendors').select('id, name, quoted_amount, revised_amount').eq('package_id', row.id),
    supabase.from('remarks').select('id, username, text, timestamp').eq('package_id', row.id).order('timestamp'),
    supabase.from('documents').select('id, name, size, type, username, uploaded_at').eq('package_id', row.id).order('uploaded_at'),
    supabase.from('audit_trail').select('id, username, field, old_value, new_value, timestamp').eq('package_id', row.id).order('timestamp'),
    supabase.from('invoices').select('id, amount, invoice_number, invoice_date, notes, username, created_at').eq('package_id', row.id).order('invoice_date'),
  ]);

  return {
    id: row.id,
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
    vendors: (vendorsRes.data || []).map((v: any) => ({
      id: v.id, name: v.name, quotedAmount: Number(v.quoted_amount), revisedAmount: Number(v.revised_amount),
    })),
    remarks: (remarksRes.data || []).map((r: any) => ({
      id: r.id, user: r.username, text: r.text, timestamp: r.timestamp,
    })),
    documents: (docsRes.data || []).map((d: any) => ({
      id: d.id, name: d.name, size: d.size || '', type: d.type || '', uploadedBy: d.username, uploadedAt: d.uploaded_at,
    })),
    auditTrail: (auditRes.data || []).map((a: any) => ({
      id: a.id, user: a.username, field: a.field, oldValue: a.old_value || '', newValue: a.new_value || '', timestamp: a.timestamp,
    })),
    invoices: (invoicesRes.data || []).map((i: any) => ({
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

export async function assembleProject(supabase: SupabaseClient, row: any) {
  const { data: pkgRows } = await supabase
    .from('packages')
    .select('*')
    .eq('project_id', row.id)
    .order('created_at');
  const packages = await Promise.all((pkgRows || []).map(p => assemblePackage(supabase, p)));
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
