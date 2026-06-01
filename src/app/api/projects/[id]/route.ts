import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assembleProject, assembleProjectSummary, addOrgAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ProjectUpdateSchema, parseBody } from '@/lib/validation';
import { assertProjectActive } from '@/lib/projectGuard';

// Maps validated camelCase fields → actual snake_case DB columns.
// name/client/budget/status already match their column names.
const COLUMN_MAP: Record<string, string> = {
  name: 'name',
  client: 'client',
  budget: 'budget',
  status: 'status',
  address: 'address',
  projectType: 'project_type',
  builtUpArea: 'built_up_area',
  estimatedStartDate: 'estimated_start_date',
  estimatedDurationMonths: 'estimated_duration_months',
  tenderedCost: 'tendered_cost',
  projectManager: 'project_manager',
  clientContactName: 'client_contact_name',
  clientContactEmail: 'client_contact_email',
  clientContactPhone: 'client_contact_phone',
  projectRemarks: 'project_remarks',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await assembleProjectSummary(supabase, row));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, ProjectUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createServerSupabase();

  // Admins bypass — they need to be able to change status itself
  const g = await assertProjectActive(supabase, id, auth);
  if (g) return g;

  const setObj: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (COLUMN_MAP[k]) setObj[COLUMN_MAP[k]] = v;
  }

  const { data: row, error } = await supabase
    .from('projects')
    .update(setObj)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await assembleProject(supabase, row));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const supabase = await createServerSupabase();

  // Grab project name before deleting for audit
  const { data: project } = await supabase.from('projects').select('name').eq('id', id).maybeSingle();

  await supabase.from('projects').delete().eq('id', id);

  const adminClient = createAdminSupabase();
  await addOrgAuditEntry(adminClient, auth.orgId, auth.id, auth.fullName,
    'Project Deleted', 'project', project?.name || id);

  return NextResponse.json({ ok: true });
}
