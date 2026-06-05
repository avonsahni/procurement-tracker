import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { withRoute } from '@/lib/withRoute';

// Accounting Ledger data source.
//
//   GET /api/ledger?type=billing|inflow|outflow
//     → per-project rollup: [{ id, name, client, entryCount, total }]
//
//   GET /api/ledger?type=billing|inflow|outflow&projectId=<id>
//     → flattened line items for that project, sorted by date, each carrying
//       the package name and the user who entered it.
//
// All queries run through the RLS-scoped server client, so results are limited
// to the caller's organisation automatically.

type LedgerType = 'billing' | 'inflow' | 'outflow';

const TABLE: Record<LedgerType, string> = {
  billing: 'invoices',
  inflow:  'cash_inflow',
  outflow: 'cash_outflow',
};

// Column selection + the date field used for sorting, per type.
const CONFIG: Record<LedgerType, { select: string; dateField: string }> = {
  billing: { select: 'id, package_id, amount, invoice_number, invoice_date, notes, username, created_at', dateField: 'invoice_date' },
  inflow:  { select: 'id, package_id, amount, on_account, from_party, date_received, remarks, created_by, created_at', dateField: 'date_received' },
  outflow: { select: 'id, package_id, amount, to_whom, on_account_of, date_paid, remarks, created_by, created_at', dateField: 'date_paid' },
};

export const GET = withRoute(async (req: NextRequest) => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const url       = new URL(req.url);
  const type      = url.searchParams.get('type') as LedgerType | null;
  const projectId = url.searchParams.get('projectId');

  if (!type || !(type in TABLE)) {
    return NextResponse.json({ error: 'Invalid or missing type' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const cfg = CONFIG[type];

  // ── Project-list mode ───────────────────────────────────────────────────
  if (!projectId) {
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, client')
      .order('name');
    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
    if (!projects || projects.length === 0) return NextResponse.json({ projects: [] });

    const projIds = projects.map((p: any) => p.id);
    const { data: pkgs } = await supabase
      .from('packages')
      .select('id, project_id')
      .in('project_id', projIds);

    const projByPkg: Record<string, string> = {};
    for (const pk of pkgs || []) projByPkg[pk.id] = pk.project_id;
    const pkgIds = (pkgs || []).map((pk: any) => pk.id);

    const totalsByProject: Record<string, { count: number; total: number }> = {};
    if (pkgIds.length > 0) {
      const { data: entries } = await supabase
        .from(TABLE[type])
        .select('package_id, amount')
        .in('package_id', pkgIds);
      for (const e of entries || []) {
        const projId = projByPkg[(e as any).package_id];
        if (!projId) continue;
        const agg = totalsByProject[projId] || (totalsByProject[projId] = { count: 0, total: 0 });
        agg.count += 1;
        agg.total += Number((e as any).amount) || 0;
      }
    }

    const result = projects.map((p: any) => ({
      id:         p.id,
      name:       p.name,
      client:     p.client || '',
      entryCount: totalsByProject[p.id]?.count ?? 0,
      total:      totalsByProject[p.id]?.total ?? 0,
    }));

    return NextResponse.json({ projects: result });
  }

  // ── Statement mode (single project) ───────────────────────────────────────
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, name, client')
    .eq('id', projectId)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: pkgs } = await supabase
    .from('packages')
    .select('id, name, currency')
    .eq('project_id', projectId);

  const pkgById: Record<string, { name: string; currency: string }> = {};
  for (const pk of pkgs || []) pkgById[pk.id] = { name: pk.name, currency: pk.currency };
  const pkgIds = (pkgs || []).map((pk: any) => pk.id);

  let entries: any[] = [];
  if (pkgIds.length > 0) {
    const { data: rows } = await supabase
      .from(TABLE[type])
      .select(cfg.select)
      .in('package_id', pkgIds)
      .order(cfg.dateField, { ascending: true });
    entries = rows || [];
  }

  // Flatten to a normalised shape the client renders directly.
  const flattened = entries.map((r: any) => {
    const pkg = pkgById[r.package_id] || { name: '—', currency: 'INR' };
    const base = {
      id:       r.id,
      package:  pkg.name,
      currency: pkg.currency,
      amount:   Number(r.amount) || 0,
    };
    if (type === 'billing') {
      return { ...base, date: r.invoice_date, invoiceNumber: r.invoice_number || '', notes: r.notes || '', user: r.username || '—' };
    }
    if (type === 'inflow') {
      return { ...base, date: r.date_received, onAccount: r.on_account || '', fromParty: r.from_party || '', remarks: r.remarks || '', user: r.created_by || '—' };
    }
    return { ...base, date: r.date_paid, toWhom: r.to_whom || '', onAccountOf: r.on_account_of || '', remarks: r.remarks || '', user: r.created_by || '—' };
  });

  return NextResponse.json({
    project: { id: project.id, name: project.name, client: project.client || '' },
    entries: flattened,
  });
}, { route: '/api/ledger' });
