import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { InvoiceCreateSchema, parseBody } from '@/lib/validation';
import { formatCurrency } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, InvoiceCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { amount, invoiceNumber, invoiceDate, notes } = parsed.data;

  const supabase = await createServerSupabase();

  // Fetch package (need award_value + project_id + stage)
  const { data: pkg } = await supabase
    .from('packages')
    .select('id, current_stage, award_value, project_id')
    .eq('id', pkgId)
    .single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  // Stage gate — billing only after award
  if (pkg.current_stage !== 'Award') {
    return NextResponse.json(
      { error: 'Billing is only available after a package has been awarded' },
      { status: 400 }
    );
  }

  // ── HARD CONSTRAINT 1: invoice total ≤ package award value ──────────────
  const { data: pkgInvoices } = await supabase
    .from('invoices')
    .select('amount')
    .eq('package_id', pkgId);

  const pkgBilled = (pkgInvoices || []).reduce((s, i) => s + Number(i.amount), 0);
  const pkgAward  = Number(pkg.award_value || 0);

  if (pkgAward > 0 && pkgBilled + amount > pkgAward) {
    const remaining = pkgAward - pkgBilled;
    return NextResponse.json(
      {
        error: remaining <= 0
          ? `This package is already fully billed (award value: ${formatCurrency(pkgAward)})`
          : `Invoice amount ${formatCurrency(amount)} exceeds remaining billable amount for this package. ` +
            `Remaining: ${formatCurrency(remaining)} (Award: ${formatCurrency(pkgAward)} − Billed: ${formatCurrency(pkgBilled)})`,
      },
      { status: 400 }
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── HARD CONSTRAINT 2: total project billed ≤ project budget ────────────
  const { data: project } = await supabase
    .from('projects').select('budget').eq('id', pkg.project_id).single();

  if (project) {
    // Fetch all sibling package IDs then sum their invoices — avoids unreliable embedded join
    const { data: siblingPkgs } = await supabase
      .from('packages').select('id').eq('project_id', pkg.project_id);
    const siblingIds = (siblingPkgs || []).map((p: any) => p.id);

    const { data: projectInvoices } = siblingIds.length
      ? await supabase.from('invoices').select('amount').in('package_id', siblingIds)
      : { data: [] };

    const projectBudget = Number(project.budget);
    const projectBilled = (projectInvoices || []).reduce((s, i) => s + Number(i.amount), 0);

    if (projectBilled + amount > projectBudget) {
      const remaining = projectBudget - projectBilled;
      return NextResponse.json(
        {
          error: remaining <= 0
            ? `Project budget is fully billed (budget: ${formatCurrency(projectBudget)})`
            : `Invoice would exceed the project budget. ` +
              `Remaining project budget: ${formatCurrency(remaining)}`,
        },
        { status: 400 }
      );
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  const { data: row, error } = await supabase
    .from('invoices')
    .insert({
      package_id: pkgId,
      amount,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate || new Date().toISOString(),
      notes,
      username: auth.fullName,
    })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await addAuditEntry(
    supabase, pkgId, auth.fullName,
    'Invoice Recorded', '',
    invoiceNumber ? `${invoiceNumber} (${amount})` : String(amount)
  );

  return NextResponse.json({
    id: row.id,
    amount: Number(row.amount),
    invoiceNumber: row.invoice_number || '',
    invoiceDate: row.invoice_date,
    notes: row.notes || '',
    user: row.username,
    createdAt: row.created_at,
  }, { status: 201 });
}
